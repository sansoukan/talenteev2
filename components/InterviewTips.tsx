"use client"

import { useEffect, useState, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Lightbulb, ChevronLeft, ChevronRight } from "lucide-react"

type Tip = { text: string; category: string; example?: string }

const TIPS: Tip[] = [
  { text: "Pause before you speak. Silence signals composure.", category: "Presence" },
  { text: "Answer the question, not the question you wish was asked.", category: "Clarity" },
  { text: "A recruiter remembers tone more than detail.", category: "Impact" },
  { text: "If you don't know, describe how you'd find out.", category: "Problem-Solving" },
  { text: "Start strong: your first 10 seconds set the tone.", category: "First Impression" },
  { text: "Every answer should close with a result, not an intention.", category: "Structure" },
  { text: "Speak in short sentences — precision is authority.", category: "Communication" },
  { text: "Match energy, not personality. Calibration builds trust.", category: "Empathy" },
  { text: "If interrupted, stay calm — composure beats correction.", category: "Presence" },
  { text: "Confidence isn't volume, it's control of pace.", category: "Delivery" },
]

export default function InterviewTips() {
  const [index, setIndex] = useState(0)
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  function resetTimer() {
    if (timerRef.current) clearInterval(timerRef.current)
    timerRef.current = setInterval(() => {
      setIndex((prev) => (prev + 1) % TIPS.length)
    }, 8000)
  }

  useEffect(() => {
    resetTimer()
    return () => timerRef.current && clearInterval(timerRef.current)
  }, [])

  const currentTip = TIPS[index]

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="bg-white/[0.02] border border-white/5 rounded-[28px] p-6 backdrop-blur-xl"
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-semibold text-white flex items-center gap-2 tracking-tight">
          <Lightbulb className="h-5 w-5 text-yellow-400" /> Interview Tip
        </h3>
        <div className="text-xs text-gray-600">
          {index + 1} / {TIPS.length}
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={index}
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -15 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        >
          <p className="text-base text-gray-200 italic mb-2">"{currentTip.text}"</p>
          <p className="text-xs text-gray-500">
            <span className="font-medium text-yellow-400">{currentTip.category}</span>
          </p>
        </motion.div>
      </AnimatePresence>

      <div className="flex justify-end items-center gap-2 mt-6">
        <button
          onClick={() => setIndex((i) => (i - 1 + TIPS.length) % TIPS.length)}
          className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition"
        >
          <ChevronLeft className="w-4 h-4 text-gray-400" />
        </button>
        <button
          onClick={() => setIndex((i) => (i + 1) % TIPS.length)}
          className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition"
        >
          <ChevronRight className="w-4 h-4 text-gray-400" />
        </button>
      </div>
    </motion.div>
  )
}
