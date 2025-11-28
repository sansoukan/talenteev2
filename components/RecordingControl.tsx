"use client"

import { useEffect, useRef, useState, forwardRef, useImperativeHandle } from "react"
import { transcribeAudio } from "@/lib/voice-utils"
import { captureAndAnalyze } from "@/lib/analyzeFacePosture"

/**
 * ======================================================
 *  🎙 RecordingControl — V14 Nova Engine (Stable + UI Errors)
 * ------------------------------------------------------
 *  🔹 Microphone + Webcam + STT (Whisper + Deepgram)
 *  🔹 Robust speech / silence detection
 *  🔹 On-screen error messages for mic access
 *  🔹 Silence → IdleManager.handleSilence()
 *  🔹 Resume → resets silence counter
 * ======================================================
 */

export type RecordingControlRef = {
  startRecording: () => void
  stopRecording: () => void
}

type Props = {
  onTranscript?: (text: string, blob?: Blob) => void
  sessionId: string
  userId: string
  isActive?: boolean
  maxAnswerSec?: number
  onTimeout?: () => void
  onSilence?: (metrics?: {
    duration_ms: number | null
    pauses_count: number
    pauses: number[]
  }) => void
  onSpeaking?: () => void
  silenceMs?: number
  silenceThreshold?: number
}

const RecordingControl = forwardRef<RecordingControlRef, Props>(
  (
    {
      onTranscript = () => {},
      sessionId,
      userId,
      isActive = true,
      maxAnswerSec = 90,
      onTimeout,
      onSilence,
      onSpeaking,
      silenceMs = 5000,
      silenceThreshold = 0.03,
    },
    ref,
  ) => {
    const [recording, setRecording] = useState(false)
    const [cameraReady, setCameraReady] = useState(false)
    const [micError, setMicError] = useState<string | null>(null)

    // Refs
    const videoRef = useRef<HTMLVideoElement | null>(null)
    const micStreamRef = useRef<MediaStream | null>(null)
    const mediaRecorderRef = useRef<MediaRecorder | null>(null)
    const chunksRef = useRef<BlobPart[]>([])
    const audioCtxRef = useRef<AudioContext | null>(null)
    const analyserRef = useRef<AnalyserNode | null>(null)
    const srcRef = useRef<MediaStreamAudioSourceNode | null>(null)
    const silenceElapsedRef = useRef<number>(0)
    const analyseTickRef = useRef<number | null>(null)
    const micPausedRef = useRef(false)

    const startTimeRef = useRef<number | null>(null)
    const pausesRef = useRef<number[]>([])
    const lastSilentAtRef = useRef<number | null>(null)

    /* ======================================================
       🔌 Bridge NovaEngine ↔ RecordingControl
    ====================================================== */
    useEffect(() => {
      ;(window as any).pauseSimulationMic = () => {
        micPausedRef.current = true
        stopRecording()
      }
      ;(window as any).resumeSimulationMic = () => {
        micPausedRef.current = false
        startRecording()
      }
    }, [])

    /* ======================================================
       🎧 Audio RMS Analysis → speech / silence
    ====================================================== */
    function startAnalyser(stream: MediaStream) {
      stopAnalyser()
      audioCtxRef.current = new AudioContext()
      srcRef.current = audioCtxRef.current.createMediaStreamSource(stream)
      analyserRef.current = audioCtxRef.current.createAnalyser()
      analyserRef.current.fftSize = 2048
      srcRef.current.connect(analyserRef.current)

      const buf = new Uint8Array(analyserRef.current.fftSize)

      const loop = () => {
        if (!analyserRef.current || micPausedRef.current) return
        analyserRef.current.getByteTimeDomainData(buf)
        let sumSq = 0
        for (let i = 0; i < buf.length; i++) {
          const v = (buf[i] - 128) / 128
          sumSq += v * v
        }
        const rms = Math.sqrt(sumSq / buf.length)

        if (rms > silenceThreshold * 2) {
          if (silenceElapsedRef.current >= silenceMs) {
            console.log("🗣️ Speech resumed → silence reset")
          }
          silenceElapsedRef.current = 0
          onSpeaking?.()

          if (!startTimeRef.current) {
            startTimeRef.current = performance.now()
            pausesRef.current = []
            lastSilentAtRef.current = null
          }
          if (lastSilentAtRef.current === null) {
            lastSilentAtRef.current = performance.now()
          }
        } else {
          if (lastSilentAtRef.current === null) {
            lastSilentAtRef.current = performance.now()
          }

          silenceElapsedRef.current += 100
          if (silenceElapsedRef.current >= silenceMs - 1000) {
            console.log("🤔 1s before cutoff — Nova pre-alert possible")
          }
          if (silenceElapsedRef.current >= silenceMs) {
            console.log("🔇 Extended silence → onSilence() callback")
            silenceElapsedRef.current = 0
            stopRecording()

            if (lastSilentAtRef.current) {
              const pause = performance.now() - lastSilentAtRef.current
              if (pause > 500) pausesRef.current.push(pause)
              lastSilentAtRef.current = null
            }

            const endTime = performance.now()
            const duration_ms = startTimeRef.current ? Math.round(endTime - startTimeRef.current) : null

            const pauses_count = pausesRef.current.length

            onSilence?.({
              duration_ms,
              pauses_count,
              pauses: pausesRef.current.slice(),
            })

            startTimeRef.current = null
            pausesRef.current = []
            lastSilentAtRef.current = null

            return
          }
        }

        analyseTickRef.current = window.setTimeout(loop, 100)
      }

      setTimeout(() => loop(), 500)
    }

    function stopAnalyser() {
      if (analyseTickRef.current) clearTimeout(analyseTickRef.current)
      silenceElapsedRef.current = 0
      try {
        analyserRef.current?.disconnect()
        srcRef.current?.disconnect()
        audioCtxRef.current?.close()
      } catch {}
      analyserRef.current = null
      srcRef.current = null
      audioCtxRef.current = null
    }

    /* ======================================================
       🎙 Start / Stop Recording (with error messages)
    ====================================================== */
    async function startRecording() {
      if (micPausedRef.current || (window as any).videoSpeaking === true) return

      try {
        stopRecording()
        setMicError(null)
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
          video: false,
        })

        micStreamRef.current = stream

        let mimeType = ""
        if (MediaRecorder.isTypeSupported("audio/webm;codecs=opus")) {
          mimeType = "audio/webm;codecs=opus"
        } else if (MediaRecorder.isTypeSupported("audio/webm")) {
          mimeType = "audio/webm"
        } else if (MediaRecorder.isTypeSupported("audio/mp4")) {
          mimeType = "audio/mp4"
        } else {
          console.warn("⚠️ No optimal mimeType found, fallback to audio/webm")
          mimeType = "audio/webm"
        }

        const mr = new MediaRecorder(stream, { mimeType })
        mediaRecorderRef.current = mr
        chunksRef.current = []

        mr.ondataavailable = (e) => {
          if (e.data && e.data.size > 0) chunksRef.current.push(e.data)
        }

        mr.onstop = async () => {
          stopAnalyser()
          const blob = new Blob(chunksRef.current, { type: mimeType })
          chunksRef.current = []

          if (micPausedRef.current || (window as any).videoSpeaking === true) {
            console.log("⏸ Recording ignored (micPaused / videoSpeaking)")
            return
          }

          console.log(`🎧 Sending audio file (${Math.round(blob.size / 1024)} KB, ${mimeType}) for transcription…`)

          if (blob.size < 1000) {
            console.warn("⚠️ Audio too short or silent — transcription skipped.")
            stream.getTracks().forEach((t) => t.stop())
            micStreamRef.current = null
            return
          }

          try {
            const text = await transcribeAudio(blob)
            if (text?.trim()) {
              console.log("✅ User transcript:", text)
              onTranscript?.(text, blob)
            } else {
              console.log("🤔 No text detected (silence or inaudible).")
            }
          } catch (err) {
            console.error("❌ STT error:", err)
          }

          stream.getTracks().forEach((t) => t.stop())
          micStreamRef.current = null
        }

        mr.start(250)
        setRecording(true)
        startAnalyser(stream)
        console.log("🎙 Microphone ACTIVE (speech/silence analysis)")
      } catch (err: any) {
        console.error("🎙 Microphone access error:", err)

        if (err.name === "NotAllowedError") {
          setMicError("🔒 Please allow microphone access in your browser settings.")
        } else if (err.name === "NotFoundError") {
          setMicError("🎤 No microphone detected. Please connect a device and refresh.")
        } else if (err.name === "NotReadableError") {
          setMicError("⚠️ Microphone is currently in use by another application.")
        } else {
          setMicError("⚠️ Unable to access the microphone. Please check your settings.")
        }
      }
    }

    function stopRecording() {
      try {
        mediaRecorderRef.current?.stop()
      } catch {}
      setRecording(false)
      micStreamRef.current?.getTracks().forEach((t) => t.stop())
      micStreamRef.current = null
      stopAnalyser()
      console.log("🔇 Microphone stopped.")
    }

    /* ======================================================
       🎤 Auto activation via prop isActive
    ====================================================== */
    useEffect(() => {
      if (isActive) {
        console.log("🎤 External microphone activation (isActive = true)")
        startRecording()
      } else {
        console.log("🔇 External microphone deactivation (isActive = false)")
        stopRecording()
      }
    }, [isActive])

    /* ======================================================
       🎥 Webcam (posture tracking)
    ====================================================== */
    useEffect(() => {
      let mounted = true
      async function setupCamera() {
        try {
          const cam = await navigator.mediaDevices.getUserMedia({
            video: { width: 640, height: 480 },
            audio: false,
          })
          if (videoRef.current && mounted) {
            videoRef.current.srcObject = cam
            setCameraReady(true)
            captureAndAnalyze(videoRef.current, sessionId, userId)
          }
        } catch {
          setCameraReady(false)
        }
      }

      setupCamera()
      return () => {
        mounted = false
        videoRef.current?.srcObject && (videoRef.current.srcObject as MediaStream).getTracks().forEach((t) => t.stop())
      }
    }, [sessionId, userId])

    /* ======================================================
       🧩 Public API exposed to NovaEngine
    ====================================================== */
    useImperativeHandle(ref, () => ({
      startRecording,
      stopRecording,
    }))

    /* ======================================================
       🖼 Render
    ====================================================== */
    return (
      <div className="flex flex-col gap-2 items-center">
        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          width={260}
          height={200}
          className="rounded-xl opacity-80 border border-gray-700 bg-black"
        />

        {!cameraReady && <p className="text-gray-400 text-xs">📷 Initializing camera...</p>}

        <span className={`font-mono text-sm ${recording ? "text-green-400" : "text-gray-400"}`}>
          {recording ? "🎙 Active" : "🔇 Inactive"}
        </span>

        {micError && <p className="text-red-400 text-xs mt-2 text-center max-w-[240px]">{micError}</p>}
      </div>
    )
  },
)

RecordingControl.displayName = "RecordingControl"
export default RecordingControl
