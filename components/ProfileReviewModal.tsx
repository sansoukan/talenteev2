"use client";

import { motion, AnimatePresence } from "framer-motion";
import { XCircle, UserCircle2, Calendar, Edit2, FileText, Volume2 } from "lucide-react";
import { useState, useRef } from "react";
import { supabase } from "@/lib/supabaseClient";

/**
 * 🎯 ProfileReviewModal – Final Edition (with audio)
 * ------------------------------------------------------
 * - Vérifie le profil avant simulation
 * - Upload CV / Ajout offre d’emploi
 * - Responsive (mobile friendly)
 * - Barre d’action fixe + son d’analyse Nova
 * ------------------------------------------------------
 */

export default function ProfileReviewModal({
  visible,
  profile,
  userId,
  onClose,
  onEdit,
  onContinue,
}: {
  visible: boolean;
  profile: any;
  userId: string;
  onClose: () => void;
  onEdit: () => void;
  onContinue: (cvUrl?: string, offerText?: string) => void;
}) {
  const [cvUrl, setCvUrl] = useState<string>(profile?.last_cv_url || "");
  const [offerText, setOfferText] = useState<string>("");
  const [uploading, setUploading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  if (!visible) return null;

  const { career_stage, domain, goal, updated_at, last_cv_upload_at } = profile || {};

  // --- Helpers ---
  const formatDate = (dateString?: string) => {
    if (!dateString) return "—";
    const d = new Date(dateString);
    return d.toLocaleDateString("en-GB", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const formatMap = (map: Record<string, string>, value: string) => map[value] || value;

  const careerMap: Record<string, string> = {
    student: "🎓 Student / Internship",
    graduate: "🧑‍🎓 Graduate (First Job)",
    professional: "💼 Professional (2–5 years)",
    mid: "💼 Professional (2–5 years)",
    manager: "👥 Manager (5–10 years)",
    exec: "🏛 Executive (10+ years)",
  };

  const domainMap: Record<string, string> = {
    marketing: "📈 Marketing / Growth",
    product: "🧩 Product Management / UX",
    tech: "💻 Engineering / Tech",
    sales: "💰 Sales / Business",
    finance: "💼 Finance",
    hr: "🤝 Human Resources",
    ops: "🏭 Operations / Supply",
    legal: "⚖️ Legal / Compliance",
    general: "🌍 General / Multidisciplinary",
  };

  const goalMap: Record<string, string> = {
    job_interview: "🎯 Job Interview",
    case_study: "🧠 Case Study",
    promotion: "🚀 Promotion",
    annual_review: "🧱 Annual Review",
    goal_setting: "🎯 Goal Setting",
    practice: "💪 Practice Mode",
    internship: "🎓 Internship",
  };

  // --- Upload CV ---
  async function handleCVUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploading(true);
      const ext = file.name.split(".").pop();
      const fileName = `${userId}_${Date.now()}.${ext}`;
      const bucket = "nova-cv";

      const { error: uploadErr } = await supabase.storage
        .from(bucket)
        .upload(fileName, file, { cacheControl: "3600", upsert: true });

      if (uploadErr) throw uploadErr;

      const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(fileName);
      const publicUrl = urlData.publicUrl;
      setCvUrl(publicUrl);

      await supabase
        .from("profiles")
        .update({
          last_cv_url: publicUrl,
          last_cv_upload_at: new Date().toISOString(),
        })
        .eq("id", userId);
    } catch (err) {
      alert("❌ Error uploading CV. Please try again.");
    } finally {
      setUploading(false);
    }
  }

  // --- Continue + effet sonore ---
  async function handleContinue() {
    try {
      setAnalyzing(true);
      const audio = new Audio("/sounds/nova_analyzing.mp3");
      audioRef.current = audio;
      audio.play();

      // petit délai immersif avant lancement
      setTimeout(() => {
        setAnalyzing(false);
        onContinue(cvUrl, offerText);
      }, 2500);
    } catch {
      setAnalyzing(false);
      onContinue(cvUrl, offerText);
    }
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50"
      >
        {/* Container responsive */}
        <motion.div
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 50, opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="relative w-full max-w-lg bg-gray-900/90 border border-gray-700 rounded-2xl shadow-2xl text-white overflow-hidden flex flex-col max-h-[95vh]"
        >
          {/* Header */}
          <div className="flex justify-between items-center p-5 border-b border-gray-700">
            <h2 className="text-xl sm:text-2xl font-bold text-blue-400">Review before starting</h2>
            <button onClick={onClose}>
              <XCircle className="w-6 h-6 text-gray-400 hover:text-white transition" />
            </button>
          </div>

          {/* Scrollable content */}
          <div className="overflow-y-auto flex-1 p-6 space-y-5">
            {/* Profile */}
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <UserCircle2 className="text-blue-400 w-5 h-5" />
                <p>
                  <span className="text-gray-400">Career stage:</span>{" "}
                  <strong>{formatMap(careerMap, career_stage)}</strong>
                </p>
              </div>

              <div className="flex items-center gap-3">
                <UserCircle2 className="text-purple-400 w-5 h-5" />
                <p>
                  <span className="text-gray-400">Domain:</span>{" "}
                  <strong>{formatMap(domainMap, domain)}</strong>
                </p>
              </div>

              <div className="flex items-center gap-3">
                <UserCircle2 className="text-green-400 w-5 h-5" />
                <p>
                  <span className="text-gray-400">Goal:</span>{" "}
                  <strong>{formatMap(goalMap, goal)}</strong>
                </p>
              </div>

              <div className="flex items-center gap-3">
                <Calendar className="text-gray-400 w-5 h-5" />
                <p>
                  <span className="text-gray-400">Profile updated:</span>{" "}
                  <strong>{formatDate(updated_at)}</strong>
                </p>
              </div>
            </div>

            {/* CV */}
            <div className="mt-6">
              <h3 className="font-semibold mb-2 flex items-center gap-2">
                <FileText className="text-blue-400 w-5 h-5" /> CV
              </h3>
              {cvUrl ? (
                <a
                  href={cvUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-400 underline text-sm"
                >
                  View uploaded CV
                </a>
              ) : (
                <p className="text-gray-400 text-sm italic mb-2">No CV uploaded yet.</p>
              )}

              <input
                type="file"
                accept=".pdf,.doc,.docx"
                onChange={handleCVUpload}
                disabled={uploading}
                className="text-sm mt-2"
              />
              {uploading && <p className="text-xs text-gray-400 mt-1">Uploading...</p>}

              {last_cv_upload_at && (
                <p className="text-gray-400 text-xs mt-2">
                  Last upload: {formatDate(last_cv_upload_at)}
                </p>
              )}
            </div>

            {/* Offer */}
            <div className="mt-6">
              <h3 className="font-semibold mb-2">Job Offer (optional)</h3>
              <textarea
                value={offerText}
                onChange={(e) => setOfferText(e.target.value)}
                placeholder="Paste your job offer here..."
                className="w-full p-3 rounded-lg bg-gray-800 border border-gray-700 text-white text-sm h-32 resize-none"
              />
            </div>
          </div>

          {/* Footer */}
          <div className="sticky bottom-0 bg-gray-900/95 border-t border-gray-700 p-4 flex gap-3 items-center">
            <button
              onClick={onEdit}
              disabled={analyzing}
              className="flex-1 bg-gray-700 hover:bg-gray-600 rounded-lg py-3 font-semibold transition disabled:opacity-50"
            >
              ✏️ Edit Profile
            </button>
            <button
              onClick={handleContinue}
              disabled={analyzing}
              className="flex-1 bg-blue-600 hover:bg-blue-500 rounded-lg py-3 font-semibold transition disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {analyzing ? (
                <>
                  <Volume2 className="animate-pulse w-4 h-4" /> Analyzing…
                </>
              ) : (
                <>
                  🚀 Continue
                </>
              )}
            </button>
          </div>

          {/* Audio tag (fallback) */}
          <audio ref={audioRef} src="/sounds/nova_analyzing.mp3" preload="auto" />
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}