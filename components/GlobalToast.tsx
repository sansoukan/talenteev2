"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

/**
 * GlobalToast
 * ------------
 * ✅ Affiche un message de succès ou d’erreur (upload CV, update profil, etc.)
 * ✅ Détecte ?toast=success|error|upload_success|upload_error
 * ✅ Se ferme automatiquement après 4s et supprime le paramètre de l’URL
 */

export default function GlobalToast() {
  const [type, setType] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const toastParam = params.get("toast");

    if (toastParam) {
      setType(toastParam);
      params.delete("toast");
      const newUrl = `${window.location.pathname}?${params.toString()}`;
      window.history.replaceState({}, "", newUrl);

      const timer = setTimeout(() => setType(null), 4000);
      return () => clearTimeout(timer);
    }
  }, []);

  if (!type) return null;

  const messages: Record<string, { text: string; color: string }> = {
    success: { text: "✅ Profile updated successfully", color: "bg-green-500/90" },
    error: { text: "❌ Error updating profile", color: "bg-red-500/90" },
    upload_success: { text: "📄 CV uploaded successfully!", color: "bg-green-500/90" },
    upload_error: { text: "⚠️ CV upload failed. Please try again.", color: "bg-red-500/90" },
  };

  const { text, color } = messages[type] || {
    text: "Notification",
    color: "bg-gray-600/80",
  };

  return (
    <AnimatePresence>
      <motion.div
        key={type}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
        transition={{ duration: 0.3 }}
        className={`fixed bottom-6 right-6 px-6 py-3 rounded-lg shadow-lg text-white font-semibold border border-white/10 ${color}`}
      >
        {text}
      </motion.div>
    </AnimatePresence>
  );
}