"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

/**
 * SettingsToast
 * --------------------------
 * ✅ Affiche un message de succès ou d’erreur
 * ✅ Se déclenche via l’URL : ?toast=success ou ?toast=error
 * ✅ Disparaît après 4 secondes
 * ✅ Supprime automatiquement le paramètre ?toast= de l’URL
 */

export default function SettingsToast() {
  const [toast, setToast] = useState<"success" | "error" | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const type = params.get("toast");

    if (type === "success" || type === "error") {
      setToast(type);

      // Supprime le paramètre toast après affichage
      params.delete("toast");
      const newUrl = `${window.location.pathname}?${params.toString()}`;
      window.history.replaceState({}, "", newUrl);

      const timer = setTimeout(() => setToast(null), 4000);
      return () => clearTimeout(timer);
    }
  }, []);

  if (!toast) return null;

  const message =
    toast === "success"
      ? "✅ Profile updated successfully"
      : "❌ Error saving profile. Please try again.";

  const bgColor =
    toast === "success"
      ? "bg-green-500/90 border-green-400/40"
      : "bg-red-500/90 border-red-400/40";

  return (
    <AnimatePresence>
      <motion.div
        key={toast}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
        transition={{ duration: 0.3 }}
        className={`fixed bottom-6 right-6 px-6 py-3 rounded-lg shadow-lg border text-white font-semibold ${bgColor}`}
      >
        {message}
      </motion.div>
    </AnimatePresence>
  );
}