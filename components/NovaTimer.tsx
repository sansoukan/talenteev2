"use client"

import { useState, useEffect } from "react"

interface NovaTimerProps {
  totalMinutes: number
  onPreclose?: () => void
  onClose?: () => void
  onHardStop: () => void
}

export default function NovaTimer({ totalMinutes, onPreclose, onClose, onHardStop }: NovaTimerProps) {
  const totalSeconds = Math.floor(totalMinutes * 60)
  const [secondsLeft, setSecondsLeft] = useState(totalSeconds)
  const [triggered, setTriggered] = useState({
    preclose: false,
    close: false,
    hardstop: false,
  })

  useEffect(() => {
    const interval = setInterval(() => {
      setSecondsLeft((prev) => {
        const next = Math.max(prev - 1, 0)

        // T-3 min
        if (!triggered.preclose && next <= 180 && next > 120) {
          setTriggered((p) => ({ ...p, preclose: true }))
          onPreclose?.()
        }

        // T-2 min - vocal alert
        if (!triggered.close && next <= 120 && next > 30) {
          setTriggered((p) => ({ ...p, close: true }))
          onClose?.()
          const msg = new SpeechSynthesisUtterance("You have two minutes remaining.")
          msg.lang = "en-US"
          window.speechSynthesis.speak(msg)
        }

        // T-30s - vocal alert + hardstop
        if (!triggered.hardstop && next <= 30) {
          setTriggered((p) => ({ ...p, hardstop: true }))
          const msg = new SpeechSynthesisUtterance("Thirty seconds remaining.")
          msg.lang = "en-US"
          window.speechSynthesis.speak(msg)
        }

        // End
        if (next === 0) {
          onHardStop()
        }

        return next
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [onPreclose, onClose, onHardStop, triggered])

  // Progress calculation
  const percent = Math.max(0, Math.min(100, (secondsLeft / totalSeconds) * 100))

  // Dynamic colors - Apple style
  const getBarColor = () => {
    if (secondsLeft <= 30) return "bg-red-500"
    if (secondsLeft <= 120) return "bg-orange-500"
    if (secondsLeft <= 180) return "bg-yellow-500"
    return "bg-emerald-500"
  }

  const getTextColor = () => {
    if (secondsLeft <= 30) return "text-red-400"
    if (secondsLeft <= 120) return "text-orange-400"
    if (secondsLeft <= 180) return "text-yellow-400"
    return "text-white/90"
  }

  // Format mm:ss
  const mm = String(Math.floor(secondsLeft / 60)).padStart(2, "0")
  const ss = String(secondsLeft % 60).padStart(2, "0")

  return (
    <div className="flex items-center gap-3 px-4 py-2 bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl">
      {/* Timer display */}
      <div className="flex items-center gap-2">
        <div
          className={`text-lg font-semibold tracking-tight tabular-nums ${getTextColor()} ${secondsLeft <= 30 ? "animate-pulse" : ""}`}
        >
          {mm}:{ss}
        </div>
      </div>

      {/* Progress bar */}
      <div className="w-20 h-1.5 bg-white/10 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-1000 ease-linear ${getBarColor()} ${secondsLeft <= 30 ? "animate-pulse" : ""}`}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  )
}
