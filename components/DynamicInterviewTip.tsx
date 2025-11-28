"use client";

import { useEffect, useState } from "react";
import { Lightbulb } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function DynamicInterviewTip({ level = "all", lang = "en" }) {
  const [tip, setTip] = useState<any>(null);

  async function fetchTip() {
    try {
      const res = await fetch(`/api/tips?lang=${lang}&level=${level}`);
      const json = await res.json();
      setTip(json);
    } catch {
      setTip({ text: "Error loading tip.", category: "system" });
    }
  }

  useEffect(() => {
    fetchTip();
  }, [level, lang]);

  if (!tip) return <p className="text-gray-400 italic">Loading tip...</p>;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="bg-gray-900/60 border border-white/10 rounded-2xl p-6 shadow-xl backdrop-blur-lg"
    >
      <h3 className="text-xl font-semibold text-yellow-400 flex items-center gap-2 mb-3">
        <Lightbulb className="h-5 w-5" /> {tip.category || "Interview Tip"}
      </h3>

      <AnimatePresence mode="wait">
        <motion.p
          key={tip.id}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.3 }}
          className="text-base text-gray-200 italic mb-2"
        >
          “{tip.text}”
        </motion.p>
      </AnimatePresence>

      {tip.example && (
        <p className="text-xs text-gray-400">
          💬 Example: <span className="text-gray-300">{tip.example}</span>
        </p>
      )}

      <div className="text-xs text-gray-500 mt-4">
        Source: {tip.source || "Nova Coach"}
      </div>

      <button
        onClick={fetchTip}
        className="mt-4 px-3 py-1 rounded-md bg-gray-800/70 hover:bg-gray-700 transition text-xs text-yellow-300"
      >
        🔄 Next Tip
      </button>
    </motion.div>
  );
}