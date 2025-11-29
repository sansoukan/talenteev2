"use client"

import { useState, useEffect, useRef, forwardRef, useImperativeHandle } from "react"
import { Mic, MicOff, AlertCircle } from "lucide-react"

interface NovaRecorderProps {
  sessionId: string
  userId?: string
  onTranscript: (t: string) => void
  onSilence: (metrics: any) => void
  onSpeaking: () => void
  onSilenceStart?: () => void
}

const SILENCE_THRESHOLD = 0.02
const SILENCE_DELAY = 5000

const NovaRecorder = forwardRef((props: NovaRecorderProps, ref) => {
  const [isRecording, setIsRecording] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [volume, setVolume] = useState(0)
  const [isInSilencePhase, setIsInSilencePhase] = useState(false)

  const streamRef = useRef<MediaStream | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const audioCtxRef = useRef<AudioContext | null>(null)
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null)
  const isRecordingRef = useRef(false)
  const hasSpokenRef = useRef(false)
  const animationFrameRef = useRef<number | null>(null)

  useEffect(() => {
    isRecordingRef.current = isRecording
  }, [isRecording])

  useImperativeHandle(ref, () => ({
    startRecording,
    stopRecording,
    isRecording: () => isRecording,
  }))

  async function startRecording() {
    if (isRecordingRef.current) {
      console.log("[v0] NovaRecorder: Already recording, skipping start")
      return
    }

    try {
      setError(null)
      hasSpokenRef.current = false
      setIsInSilencePhase(false)

      console.log("[v0] NovaRecorder: Starting recording...")

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream

      const audioCtx = new AudioContext()
      audioCtxRef.current = audioCtx

      // Resume AudioContext if suspended
      if (audioCtx.state === "suspended") {
        console.log("[v0] NovaRecorder: Resuming suspended AudioContext")
        await audioCtx.resume()
      }

      const source = audioCtx.createMediaStreamSource(stream)

      const analyser = audioCtx.createAnalyser()
      analyser.fftSize = 1024
      analyserRef.current = analyser
      source.connect(analyser)

      setIsRecording(true)
      isRecordingRef.current = true

      console.log("[v0] NovaRecorder: Recording started, mic open, AudioContext state:", audioCtx.state)

      animationFrameRef.current = requestAnimationFrame(monitor)
    } catch (err) {
      console.error("[v0] NovaRecorder: Microphone error", err)
      setError("Microphone access denied")
    }
  }

  function stopRecording() {
    console.log("[v0] NovaRecorder: Stopping recording...")

    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current)
      silenceTimerRef.current = null
    }

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current)
      animationFrameRef.current = null
    }

    if (audioCtxRef.current) {
      audioCtxRef.current.close().catch(() => {})
      audioCtxRef.current = null
    }

    try {
      streamRef.current?.getTracks().forEach((t) => t.stop())
      streamRef.current = null
    } catch {}

    analyserRef.current = null
    setIsRecording(false)
    isRecordingRef.current = false
    setVolume(0)
    setIsInSilencePhase(false)
    hasSpokenRef.current = false

    console.log("[v0] NovaRecorder: Recording stopped, mic closed")
  }

  function monitor() {
    if (!analyserRef.current || !isRecordingRef.current) return

    const buffer = new Uint8Array(analyserRef.current.frequencyBinCount)
    analyserRef.current.getByteFrequencyData(buffer)

    const avg = buffer.reduce((a, b) => a + b, 0) / buffer.length
    const norm = avg / 255

    setVolume(norm)

    if (norm > SILENCE_THRESHOLD) {
      if (!hasSpokenRef.current) {
        console.log("[v0] NovaRecorder: User started speaking")
      }
      hasSpokenRef.current = true

      if (silenceTimerRef.current) {
        console.log("[v0] NovaRecorder: User spoke again, cancelling silence timer")
        clearTimeout(silenceTimerRef.current)
        silenceTimerRef.current = null
        setIsInSilencePhase(false)
      }

      props.onSpeaking()
    } else {
      if (hasSpokenRef.current && !silenceTimerRef.current) {
        scheduleSilence()
      }
    }

    animationFrameRef.current = requestAnimationFrame(monitor)
  }

  function scheduleSilence() {
    if (silenceTimerRef.current) return

    console.log("[v0] NovaRecorder: Starting 5s silence countdown...")
    setIsInSilencePhase(true)

    props.onSilenceStart?.()

    silenceTimerRef.current = setTimeout(() => {
      console.log("[v0] NovaRecorder: 5s silence confirmed, triggering onSilence")
      silenceTimerRef.current = null
      setIsInSilencePhase(false)

      props.onSilence({
        duration_ms: SILENCE_DELAY,
        timestamp: Date.now(),
      })
    }, SILENCE_DELAY)
  }

  useEffect(() => {
    return () => {
      stopRecording()
    }
  }, [])

  return (
    <div className="flex items-center gap-3 px-4 py-3 bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10">
      <div
        className={`relative flex items-center justify-center w-10 h-10 rounded-full transition-all duration-300 ${
          isRecording
            ? isInSilencePhase
              ? "bg-yellow-500/20 text-yellow-400"
              : "bg-green-500/20 text-green-400"
            : "bg-white/10 text-white/40"
        }`}
      >
        {isRecording ? (
          <>
            <div
              className={`absolute inset-0 rounded-full animate-ping ${
                isInSilencePhase ? "bg-yellow-500/30" : "bg-green-500/30"
              }`}
            />
            <Mic size={18} />
          </>
        ) : (
          <MicOff size={18} />
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium">
          {error ? (
            <span className="text-red-400 flex items-center gap-1.5">
              <AlertCircle size={14} /> {error}
            </span>
          ) : isRecording ? (
            isInSilencePhase ? (
              <span className="text-yellow-400">Waiting for response...</span>
            ) : (
              <span className="text-green-400">Listening...</span>
            )
          ) : (
            <span className="text-white/50">Standby</span>
          )}
        </div>

        <div className="h-1 bg-white/10 rounded-full mt-2 overflow-hidden">
          <div
            className={`h-full transition-all duration-75 rounded-full ${
              isInSilencePhase
                ? "bg-gradient-to-r from-yellow-500 to-amber-400"
                : "bg-gradient-to-r from-green-500 to-emerald-400"
            }`}
            style={{ width: `${Math.min(volume * 400, 100)}%` }}
          />
        </div>
      </div>
    </div>
  )
})

NovaRecorder.displayName = "NovaRecorder"
export default NovaRecorder
