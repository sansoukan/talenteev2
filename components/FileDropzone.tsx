"use client";

import { useCallback, useState } from "react";

type FileDropzoneProps = {
  onFileSelected: (file: File) => void;
  accept?: string; // ex: "application/pdf,application/msword"
};

export default function FileDropzone({ onFileSelected, accept }: FileDropzoneProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);

  const validateFileType = (file: File) => {
    if (!accept) return true;
    const allowedTypes = accept.split(",").map((t) => t.trim());
    return allowedTypes.includes(file.type);
  };

  const handleFile = (file: File) => {
    if (!validateFileType(file)) {
      setError(`⚠️ Format non supporté: ${file.type}`);
      setFileName(null);
      return;
    }
    setError(null);
    setFileName(file.name);
    onFileSelected(file);
  };

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    []
  );

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragOver(true);
      }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={handleDrop}
      className={`flex flex-col items-center justify-center w-full p-6 border-2 border-dashed rounded-lg cursor-pointer transition
        ${isDragOver ? "bg-green-900/20 border-green-500" : "border-border"}
        ${error ? "border-danger" : ""}`}
    >
      <div className="text-4xl mb-2">☁️</div>
      <p className="text-text-muted">Drag & Drop files here</p>
      <p className="text-sm text-text-muted my-1">or</p>

      <label className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-light cursor-pointer transition">
        Browse Files
        <input
          type="file"
          accept={accept}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
          }}
          className="hidden"
        />
      </label>

      {/* ✅ Feedback utilisateur */}
      {fileName && !error && (
        <p className="text-sm text-green-400 mt-3">✅ Fichier sélectionné : {fileName}</p>
      )}
      {error && <p className="text-danger text-sm mt-2">{error}</p>}
    </div>
  );
}
