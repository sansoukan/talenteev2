"use client"

import { useState, useEffect, useRef, forwardRef, useImperativeHandle } from "react"
import { Mic, MicOff, AlertCircle } from "lucide-react"

interface NovaRecorderProps {
  sessionId: string
  userId?: string
  onTranscript: (t: string) => void
  onSilence: (metrics: any) => void
  onSpeaking: () => void
}

const SILENCE_THRESHOLD = 0.02
const SILENCE_DELAY = 1200 // 1.2s

const NovaRecorder = forwardRef((props: NovaRecorderProps, ref) => {
  const [isRecording, setIsRecording] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [volume, setVolume] = useState(0)

  const streamRef = useRef<MediaStream | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null)
  const isRecordingRef = useRef(false)

  useEffect(() => {
    isRecordingRef.current = isRecording
  }, [isRecording])

  /* ======================================================
      Expose public API to parent
  ====================================================== */
  useImperativeHandle(ref, () => ({
    startRecording,
    stopRecording,
    isRecording: () => isRecording,
  }))

  /* ======================================================
      START RECORDING
  ====================================================== */
  async function startRecording() {
    try {
      setError(null)

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream

      const audioCtx = new AudioContext()
      const source = audioCtx.createMediaStreamSource(stream)

      const analyser = audioCtx.createAnalyser()
      analyser.fftSize = 1024
      analyserRef.current = analyser
      source.connect(analyser)

      setIsRecording(true)
      isRecordingRef.current = true
      requestAnimationFrame(monitor)
    } catch (err) {
      console.error(err)
      setError("Microphone access denied")
    }
  }

  /* ======================================================
      STOP RECORDING
  ====================================================== */
  function stopRecording() {
    try {
      streamRef.current?.getTracks().forEach((t) => t.stop())
      streamRef.current = null
    } catch {}

    setIsRecording(false)
    isRecordingRef.current = false
    setVolume(0)
  }

  /* ======================================================
      AUDIO MONITORING + SILENCE DETECTION
  ====================================================== */
  function monitor() {
    if (!analyserRef.current || !isRecordingRef.current) return

    const buffer = new Uint8Array(analyserRef.current.frequencyBinCount)
    analyserRef.current.getByteFrequencyData(buffer)

    const avg = buffer.reduce((a, b) => a + b, 0) / buffer.length
    const norm = avg / 255

    setVolume(norm)

    if (norm > SILENCE_THRESHOLD) {
      props.onSpeaking()
      resetSilenceTimer()
    } else {
      scheduleSilence()
    }

    requestAnimationFrame(monitor)
  }

  function resetSilenceTimer() {
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current)
    silenceTimerRef.current = setTimeout(() => {
      props.onSilence({
        duration_ms: SILENCE_DELAY,
        timestamp: Date.now(),
      })
    }, SILENCE_DELAY)
  }

  function scheduleSilence() {
    if (!silenceTimerRef.current) resetSilenceTimer()
  }

  /* ======================================================
      UI - Dark Apple Style
  ====================================================== */
  return (
    <div className="flex items-center gap-3 px-4 py-3 bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10">
      {/* Mic icon with pulse animation when recording */}
      <div
        className={`relative flex items-center justify-center w-10 h-10 rounded-full transition-all duration-300 ${
          isRecording ? "bg-green-500/20 text-green-400" : "bg-white/10 text-white/40"
        }`}
      >
        {isRecording ? (
          <>
            <div className="absolute inset-0 rounded-full bg-green-500/30 animate-ping" />
            <Mic size={18} />
          </>
        ) : (
          <MicOff size={18} />
        )}
      </div>

      {/* Status text and volume bar */}
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium">
          {error ? (
            <span className="text-red-400 flex items-center gap-1.5">
              <AlertCircle size={14} /> {error}
            </span>
          ) : isRecording ? (
            <span className="text-green-400">Listening...</span>
          ) : (
            <span className="text-white/50">Standby</span>
          )}
        </div>

        {/* Volume meter */}
        <div className="h-1 bg-white/10 rounded-full mt-2 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-green-500 to-emerald-400 transition-all duration-75 rounded-full"
            style={{ width: `${Math.min(volume * 400, 100)}%` }}
          />
        </div>
      </div>
    </div>
  )
})

NovaRecorder.displayName = "NovaRecorder"
export default NovaRecorder
