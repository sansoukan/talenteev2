"use client";

import { useState } from "react";
import { FileText, Image, Play, Download, X } from "lucide-react";

type Annex = {
  label: string;
  url: string;
};

interface AnnexesPanelProps {
  annexes?: Annex[];
}

/**
 * AnnexesPanel
 * -----------------------------------
 * - Affiche les documents d’un case study (PDF, Excel, images, etc.)
 * - Permet d’ouvrir une prévisualisation intégrée
 * - Se connecte directement à la réponse API `case-study`
 */
export default function AnnexesPanel({ annexes = [] }: AnnexesPanelProps) {
  const [preview, setPreview] = useState<Annex | null>(null);

  if (!annexes || annexes.length === 0) {
    return (
      <div className="mt-6 bg-gray-900/70 border border-gray-700 rounded-xl p-4 text-gray-400 text-sm text-center">
        📂 Aucune annexe disponible pour ce cas.
      </div>
    );
  }

  // Détermine le type de fichier (pdf / image / video / autre)
  function getFileType(url: string): "pdf" | "image" | "video" | "other" {
    if (!url) return "other";
    const ext = url.split(".").pop()?.toLowerCase() || "";
    if (ext === "pdf") return "pdf";
    if (["jpg", "jpeg", "png", "gif", "webp"].includes(ext)) return "image";
    if (["mp4", "mov", "avi", "webm"].includes(ext)) return "video";
    return "other";
  }

  function getIcon(type: string) {
    switch (type) {
      case "pdf":
        return <FileText size={18} className="text-red-400" />;
      case "image":
        return <Image size={18} className="text-green-400" />;
      case "video":
        return <Play size={18} className="text-blue-400" />;
      default:
        return <FileText size={18} className="text-gray-400" />;
    }
  }

  return (
    <div className="mt-6 bg-gray-900/70 border border-gray-700 rounded-xl p-4">
      <h3 className="text-lg font-semibold text-blue-400 mb-3">
        📎 Documents annexes
      </h3>

      {/* Liste des annexes */}
      <ul className="space-y-3">
        {annexes.map((a, i) => {
          const type = getFileType(a.url);
          return (
            <li
              key={i}
              className="flex items-center justify-between bg-gray-800/60 p-3 rounded-lg hover:bg-gray-800/90 transition"
            >
              <div className="flex items-center gap-3">
                {getIcon(type)}
                <span className="text-sm text-gray-200">{a.label}</span>
              </div>
              <div className="flex items-center gap-3">
                {/* Bouton Aperçu */}
                {["pdf", "image", "video"].includes(type) && (
                  <button
                    onClick={() => setPreview(a)}
                    className="text-blue-400 text-sm hover:underline"
                  >
                    Voir
                  </button>
                )}
                {/* Téléchargement */}
                <a
                  href={a.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-400 hover:text-gray-200"
                >
                  <Download size={16} />
                </a>
              </div>
            </li>
          );
        })}
      </ul>

      {/* Fenêtre de prévisualisation */}
      {preview && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-gray-900 rounded-xl shadow-xl max-w-4xl w-full mx-4 relative">
            <button
              onClick={() => setPreview(null)}
              className="absolute top-3 right-3 text-gray-400 hover:text-white"
            >
              <X size={22} />
            </button>

            <div className="p-5">
              <h4 className="text-lg font-semibold mb-4 text-blue-400">
                {preview.label}
              </h4>

              {getFileType(preview.url) === "pdf" && (
                <iframe
                  src={`${preview.url}#toolbar=0`}
                  className="w-full h-[80vh] rounded-lg"
                />
              )}
              {getFileType(preview.url) === "image" && (
                <img
                  src={preview.url}
                  alt={preview.label}
                  className="max-h-[80vh] mx-auto rounded-lg"
                />
              )}
              {getFileType(preview.url) === "video" && (
                <video
                  src={preview.url}
                  controls
                  className="w-full rounded-lg max-h-[80vh]"
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}