"use client"

import { useEffect, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"

type ToastType = "start" | "time_warning" | "feedback_ready" | "premium_unlock" | "error"

interface NovaToastProps {
  type?: ToastType
  duration?: number
}

export default function NovaToast({ type, duration = 7000 }: NovaToastProps) {
  const [activeType, setActiveType] = useState<ToastType | null>(type || null)
  const [visible, setVisible] = useState(false)

  const VIDEO_MAP: Record<ToastType, string> = {
    start: "/videos/toasts/start_session.mp4",
    time_warning: "/videos/toasts/time_warning.mp4",
    feedback_ready: "/videos/toasts/feedback_ready.mp4",
    premium_unlock: "/videos/toasts/premium_unlock.mp4",
    error: "/videos/toasts/error_notice.mp4",
  }

  useEffect(() => {
    const handler = (e: any) => {
      const { type } = e.detail
      if (!type) return
      setActiveType(type)
      setVisible(true)
      setTimeout(() => setVisible(false), duration)
    }

    window.addEventListener("nova-toast", handler)
    return () => window.removeEventListener("nova-toast", handler)
  }, [duration])

  useEffect(() => {
    if (type) {
      setActiveType(type)
      setVisible(true)
      setTimeout(() => setVisible(false), duration)
    }
  }, [type, duration])

  if (!activeType) return null
  const videoSrc = VIDEO_MAP[activeType]

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 40 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="fixed bottom-6 right-6 z-[9999] flex flex-col items-center"
        >
          <motion.video
            key={activeType}
            src={videoSrc}
            autoPlay
            playsInline
            muted={false}
            className="rounded-[28px] shadow-2xl border border-white/10"
            style={{
              width: 320,
              height: 180,
              objectFit: "cover",
              background: "rgba(0,0,0,0.4)",
            }}
            onEnded={() => setVisible(false)}
          />

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-3 text-sm text-gray-300 text-center bg-black/50 px-4 py-2 rounded-full backdrop-blur-xl border border-white/10"
          >
            {activeType === "start" && "Simulation started"}
            {activeType === "time_warning" && "4 minutes remaining"}
            {activeType === "feedback_ready" && "Feedback ready"}
            {activeType === "premium_unlock" && "Premium unlocked"}
            {activeType === "error" && "Something went wrong"}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
