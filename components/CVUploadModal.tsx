"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/lib/supabaseClient";
import { Loader2, UploadCloud, CheckCircle, XCircle } from "lucide-react";

type Props = {
  userId: string;
  onUploaded: () => void;
  onClose: () => void;
};

export default function CVUploadModal({ userId, onUploaded, onClose }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [uploaded, setUploaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleUpload() {
    if (!file) {
      setError("Please select a CV file first.");
      return;
    }

    try {
      setUploading(true);
      setError(null);

      const ext = file.name.split(".").pop();
      const fileName = `${userId}_${Date.now()}.${ext}`;
      const bucket = "nova-cv";

      // 1️⃣ Upload dans Supabase Storage
      const { error: uploadErr } = await supabase.storage
        .from(bucket)
        .upload(fileName, file, {
          cacheControl: "3600",
          upsert: true,
          onUploadProgress: (e: ProgressEvent) => {
            const percent = Math.round((e.loaded * 100) / e.total);
            setProgress(percent);
          },
        } as any);

      if (uploadErr) throw uploadErr;

      // 2️⃣ Générer l’URL publique
      const { data: urlData } = supabase.storage
        .from(bucket)
        .getPublicUrl(fileName);

      const publicUrl = urlData.publicUrl;

      // 3️⃣ Mettre à jour le profil
      const { error: updateErr } = await supabase
        .from("profiles")
        .update({
          last_cv_url: publicUrl,
          last_cv_upload_at: new Date().toISOString(),
        })
        .eq("id", userId);

      if (updateErr) throw updateErr;

      setUploaded(true);
      setProgress(100);

      // 4️⃣ Fermer après succès
      setTimeout(() => {
        onUploaded();
      }, 1200);
    } catch (e: any) {
      console.error("❌ Upload error:", e);
      setError("Failed to upload CV. Please try again.");
    } finally {
      setUploading(false);
    }
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setFile(e.dataTransfer.files[0]);
    }
  }

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <motion.div
          className="bg-gray-900/90 border border-white/10 rounded-2xl shadow-2xl p-8 max-w-md w-full text-white"
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
        >
          <h2 className="text-2xl font-bold mb-2">📄 Upload your CV</h2>
          <p className="text-gray-400 text-sm mb-6">
            Nova uses your CV to tailor interview questions and simulate real recruiter behavior.
          </p>

          {/* Zone de drag & drop */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            className={`flex flex-col items-center justify-center border-2 border-dashed rounded-xl p-6 mb-4 cursor-pointer transition-all ${
              isDragging
                ? "border-blue-500 bg-blue-500/10"
                : "border-gray-600 bg-gray-800/40"
            }`}
            onClick={() => document.getElementById("cvInput")?.click()}
          >
            <UploadCloud className="h-10 w-10 mb-3 text-blue-400" />
            {file ? (
              <p className="text-green-400 font-medium">✅ {file.name}</p>
            ) : (
              <p className="text-gray-400">
                Drag & drop your CV or click to select (PDF, DOCX)
              </p>
            )}
            <input
              id="cvInput"
              type="file"
              accept=".pdf,.doc,.docx"
              className="hidden"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
            />
          </div>

          {/* Progression */}
          {uploading && (
            <div className="w-full bg-gray-700 h-2 rounded-full mb-4">
              <motion.div
                className="bg-blue-500 h-2 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ ease: "easeOut", duration: 0.3 }}
              />
            </div>
          )}

          {/* Statut */}
          {uploaded && (
            <div className="flex items-center gap-2 text-green-400 font-semibold mb-4">
              <CheckCircle className="w-5 h-5" />
              Uploaded successfully!
            </div>
          )}
          {error && (
            <div className="flex items-center gap-2 text-red-400 font-semibold mb-4">
              <XCircle className="w-5 h-5" />
              {error}
            </div>
          )}

          {/* Boutons */}
          <div className="flex justify-end gap-4 mt-6">
            <button
              onClick={onClose}
              disabled={uploading}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition"
            >
              Cancel
            </button>
            <button
              onClick={handleUpload}
              disabled={!file || uploading}
              className="px-4 py-2 rounded-lg font-semibold transition bg-blue-600 hover:bg-blue-500 flex items-center gap-2"
            >
              {uploading ? (
                <>
                  <Loader2 className="animate-spin w-4 h-4" /> Uploading…
                </>
              ) : (
                "Upload"
              )}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}