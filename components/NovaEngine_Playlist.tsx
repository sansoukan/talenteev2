"use client"

import { useState, useEffect, useRef, useMemo, useCallback } from "react"
import { useRouter } from "next/navigation"
import NovaRecorder from "@/components/NovaRecorder"
import { useRepeatIntent } from "@/hooks/useRepeatIntent"
import { NovaStartButton } from "@/components/ui/NovaStartButton"

const isDefined = (x: any) => x !== undefined && x !== null

import { getSystemVideo } from "@/lib/videoManager"
import { useNovaRealtimeVoice } from "@/hooks/useNovaRealtimeVoice"
import { NOVA_SESSION_CONFIG } from "@/config/novaSessionConfig"
import NovaTimer from "@/components/NovaTimer"
import { NovaPlaylistManager } from "@/lib/NovaPlaylistManager"
import { NovaIdleManager_Playlist } from "@/lib/NovaIdleManager_Playlist"
import NovaChatBox_TextOnly from "@/components/NovaChatBox_TextOnly"
import { startNovaTranscription, stopNovaTranscription, disableNovaTranscription } from "@/lib/voice-utils"
import { NovaFlowController } from "@/lib/NovaFlowController"

/* ============================================================
   🔥 EMOTIONAL HEARTBEAT V5 — Niveau Google
============================================================ */
let EMO_INTERVAL: any = null

function startEmotionHeartbeat(questionId: string, sessionId: string, userId: string) {
  if (EMO_INTERVAL) clearInterval(EMO_INTERVAL)

  EMO_INTERVAL = setInterval(() => {
    fetch("/api/emotions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        session_id: sessionId,
        user_id: userId,
        question_id: questionId,
        source: "voice",
        words_per_min: (window as any).__novaResponseMetrics?.speaking_speed_wpm || null,
        hesitations: (window as any).__novaResponseMetrics?.hesitations_count || null,
      }),
    })
  }, 800)
}

function stopEmotionHeartbeat() {
  if (EMO_INTERVAL) clearInterval(EMO_INTERVAL)
  EMO_INTERVAL = null
}

interface ResponseMetrics {
  startTime: number
  endTime: number
  currentTranscript: string
  currentQuestionId: string | null
  detectedPauses: any[]
  lastSilenceTime: number | null
  scoring_axes?: any
  feedbackVideo?: string | null
  expectedAnswer?: string | null
  currentScore?: number | null
  currentScoreAuto?: number | null
}

export default function NovaEngine_Playlist({ sessionId }: { sessionId: string }) {
  const router = useRouter()
  const recordingRef = useRef<any>(null)
  const chatRef = useRef<any>(null)
  const playlist = useRef(new NovaPlaylistManager()).current
  const idleMgrRef = useRef<any>(null)
  const flowRef = useRef<any>(null)
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const userCameraRef = useRef<HTMLVideoElement | null>(null)

  const startTimeRef = useRef<number | null>(null)
  const pausesRef = useRef<number[]>([])
  const lastSilentAtRef = useRef<number | null>(null)

  const [session, setSession] = useState<any>(null)
  // 🔥 Patch sécurité : élimine le placeholder 404
  const [videoSrc, setVideoSrc] = useState<string | null>(null)

  useEffect(() => {
    if (videoSrc && videoSrc.includes("placeholder")) {
      console.warn("🟧 placeholder détecté → ignoré")
      setVideoSrc(null)
    }
  }, [videoSrc])

  /* ============================================================
     🔵 PRELOAD SYSTEM VIDEOS (obligatoire Chrome)
  ============================================================ */
  useEffect(() => {
    ;(async () => {
      try {
        console.log("📦 Préchargement vidéos système…")
        const { preloadSystemVideos } = await import("@/lib/preloadSystemVideos")
        await preloadSystemVideos("en") // intros = en; idle = toutes langues OK
        console.log("✅ Préchargement vidéos OK")
      } catch (err) {
        console.error("❌ Erreur preloadSystemVideos:", err)
      }
    })()
  }, [])

  const [isPlaying, setIsPlaying] = useState(false)
  const [videoPaused, setVideoPaused] = useState(false)
  const [audioUnlocked, setAudioUnlocked] = useState(false)
  const [lastFollowupText, setLastFollowupText] = useState<string | null>(null)
  const [hovered, setHovered] = useState(false)
  const [userCameraHovered, setUserCameraHovered] = useState(false)
  const [hasStarted, setHasStarted] = useState(false)
  const [micEnabled, setMicEnabled] = useState(false)
  const [userCameraStream, setUserCameraStream] = useState<MediaStream | null>(null)
  const [showDashboardButton, setShowDashboardButton] = useState(false)
  const [showPreparingOverlay, setShowPreparingOverlay] = useState(false)

  const responseMetrics = useRef<ResponseMetrics>({
    startTime: 0,
    endTime: 0,
    currentTranscript: "",
    currentQuestionId: null,
    detectedPauses: [],
    lastSilenceTime: null,
  })

  const novaVoice = useNovaRealtimeVoice(session?.lang || "en")
  const { checkRepeatIntent } = useRepeatIntent()
  const durationSecSafe = useMemo(() => session?.duration_target ?? NOVA_SESSION_CONFIG.durationSec, [session])

  const simulationMode = session?.simulation_mode || ((session?.lang || "en") === "en" ? "video" : "audio")
  const isAudioMode = simulationMode === "audio"
  const isVideoMode = simulationMode === "video"

  useEffect(() => {
    ;(async () => {
      console.log("📡 Chargement session + questions…")

      let attempts = 0
      let json: any = null
      let res: any = null

      while (attempts < 6) {
        try {
          res = await fetch(`/api/engine/orchestrate`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ session_id: sessionId }),
          })
          json = await res.json()
        } catch {
          json = null
        }

        if (res?.ok && (json?.questions?.length > 0 || json?.action === "INIT_Q1")) {
          console.log(`✅ Tentative ${attempts + 1} OK (${json?.questions?.length || 1} reçue(s))`)
          break
        }

        console.warn(`⏳ Tentative ${attempts + 1} — orchestrate encore en attente`)
        await new Promise((r) => setTimeout(r, 2000))
        attempts++
      }

      if (!json) {
        console.error("❌ Orchestrate null → Dashboard")
        router.push("/dashboard")
        return
      }

      // ---------------------------------------------------------
      // CAS 1 — INIT_Q1
      // ---------------------------------------------------------
      if (json?.action === "INIT_Q1" && json?.question) {
        console.log("🟦 INIT_Q1 détecté → Setup minimal (FlowController FIRST)")

        // 1) FlowController → toujours AVANT playlist.reset()
        flowRef.current = new NovaFlowController(
          sessionId,
          json.lang || "en",
          json.simulation_mode || ((json.lang || "en") === "en" ? "video" : "audio"),
          json.firstname || null,
        )

        flowRef.current.ctx.currentQuestion = json.question
        flowRef.current.ctx.nextQuestions = [] // ⛔ FIX MAJEUR

        // 2) Playlist reset → APRES FlowController
        playlist.reset?.()

        // 3) Session locale
        setSession({
          ...json,
          questions: [json.question],
          total_questions: 1,
        })

        setHasStarted(false)
        setIsPlaying(false)
        setVideoSrc(null)
        return
      }

      // ---------------------------------------------------------
      // CAS 2 — Séquence complète
      // ---------------------------------------------------------
      const qs = json.questions || json.session?.questions || json.detail?.questions || []

      console.log("📊 Questions reçues:", qs.length)

      // 1) FlowController → toujours AVANT playlist.reset()
      flowRef.current = new NovaFlowController(
        sessionId,
        json.lang || "en",
        json.simulation_mode || ((json.lang || "en") === "en" ? "video" : "audio"),
        json.firstname || null,
      )

      // 2) Injection questions dans FlowController
      flowRef.current.ctx.nextQuestions = [...qs]

      // 3) Playlist reset → APRES FlowController
      playlist.reset?.()

      // 4) Session locale
      setSession({
        ...json,
        questions: qs,
        total_questions: qs.length,
      })

      setHasStarted(false)
      setIsPlaying(false)
      setVideoSrc(null)
      ;(window as any).__novaFlow = flowRef.current
    })()
  }, [sessionId, playlist, router])

  useEffect(() => {
    if (!session || !flowRef.current) return

    idleMgrRef.current = new NovaIdleManager_Playlist({
      lang: session.lang || "en",
      playlist,
      onNextQuestion: async () => {
        const next = await flowRef.current.fetchNextQuestion()
        if (next) {
          if (next.type === "video") {
            playlist.add(next.url)
          } else if (next.type === "audio") {
            responseMetrics.current.currentQuestionId = next.question.id
            await playAudioQuestion(next.question)
            const idle = await flowRef.current.getIdleListen()
            playlist.add(idle)
          }
          playlist.isPlaying = false
          playlist.next()
        } else {
          console.log("🏁 Fin des questions → vidéos de clôture")
          const end1 = await getSystemVideo("nova_end_interview_en", session.lang || "en")
          const end2 = await getSystemVideo("nova_feedback_final", session.lang || "en")
          playlist.add(end1, end2)
          playlist.isPlaying = false
          playlist.next()
        }
      },
      getFollowupText: async () => lastFollowupText,
    })

    console.log("🧠 IdleManager_Playlist initialisé")
  }, [session, playlist, lastFollowupText])

  useEffect(() => {
    playlist.subscribe((next) => {
      if (!next) {
        console.log("⏸ Playlist vide — attente de clips.")
        return
      }

      const v = videoRef.current
      if (!v) return

      const preload = document.createElement("video")
      preload.src = next
      preload.preload = "auto"
      preload.load()

      v.classList.add("loading")

      preload.addEventListener(
        "canplaythrough",
        () => {
          v.src = next
          v.load()

          v.addEventListener(
            "canplay",
            () => {
              v.classList.remove("loading")
              v.classList.add("ready")
              v.play().catch((err) => console.warn("Autoplay blocked", err))
            },
            { once: true },
          )
        },
        { once: true },
      )

      console.log("🎬 Lecture du prochain clip:", next)
      setVideoSrc(next)
    })
  }, [playlist])

  useEffect(() => {
    async function setupUserCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 1280, height: 720 },
          audio: false,
        })
        setUserCameraStream(stream)
        if (userCameraRef.current) {
          userCameraRef.current.srcObject = stream
        }
      } catch (err) {
        console.error("❌ Could not access user camera:", err)
      }
    }

    setupUserCamera()

    return () => {
      if (userCameraStream) {
        userCameraStream.getTracks().forEach((track) => {
          track.stop()
        })
      }
    }
  }, [])

  useEffect(() => {
    if (userCameraRef.current && userCameraStream) {
      userCameraRef.current.srcObject = userCameraStream
    }
  }, [userCameraStream])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space" && hasStarted) {
        e.preventDefault()
        const v = videoRef.current
        if (!v) return

        if (isPlaying) {
          v.pause()
          setVideoPaused(true)
          setIsPlaying(false)
          console.log("⏸ Pause vidéo (spacebar):", videoSrc)
        } else {
          v.play()
          setVideoPaused(false)
          setIsPlaying(true)
          console.log("▶️ Reprise vidéo (spacebar):", videoSrc)
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [hasStarted, isPlaying, videoSrc])

  useEffect(() => {
    ;(window as any).__novaResponseMetrics = responseMetrics.current
    ;(window as any).__novaSessionId = sessionId
    ;(window as any).__novaUserId = session?.user_id
    ;(window as any).__novaLang = session?.lang || "en"
    ;(window as any).__novaFirstname = session?.profiles?.prenom || null
    ;(window as any).__novaIsTrial = session?.type_entretien === "trial"
    ;(window as any).__novaSimulationMode = simulationMode

    // Register hooks emitted by NovaRecorder
    ;(window as any).__novaSpeechStart = () => {
      console.log("🗣️ Speech start (WS)")
    }
    ;(window as any).__novaSilence = (metrics: any) => {
      console.log("🔇 Silence (WS)", metrics)
      idleMgrRef.current?.handleSilence()
    }
  }, [sessionId, session, simulationMode])

  const handleStart = async () => {
    playlist.reset?.()
    console.log("♻️ Playlist nettoyée avant démarrage")
    if (!session) return console.warn("⚠️ Session non chargée")

    if (!flowRef.current) {
      console.error("❌ FlowController non initialisé")
      return
    }

    try {
      const intro1 = await flowRef.current.getIntro1()
      playlist.add(intro1)

      const intro2 = await flowRef.current.getIntro2()
      playlist.add(intro2)

      console.log("🎞️ Playlist initialisée avec intro_1 + intro_2")
      setIsPlaying(true)
      setVideoPaused(false)
      setHasStarted(true)

      await startNovaTranscription({
        sessionId,
        userId: session?.user_id,
        onTranscript: (t) => {
          responseMetrics.current.currentTranscript = t
          setLastFollowupText(t)

          if (idleMgrRef.current?.onUserSpeaking) {
            idleMgrRef.current.onUserSpeaking()
          }
        },
        onSilence: (metrics) => {
          ;(window as any).__novaSilence?.(metrics)
        },
        onSpeaking: () => {
          ;(window as any).__novaSpeechStart?.()
        },
      })

      const v = videoRef.current
      if (v) {
        v.muted = true
        await v
          .play()
          .then(() => console.log("▶️ Lecture vidéo démarrée"))
          .catch((err) => console.warn("🔇 Autoplay bloqué:", err))
      }
    } catch (err) {
      console.error("❌ Erreur pendant le handleStart:", err)
    }
  }

  const handleEnded = async () => {
    console.log("⏹ Clip terminé:", videoSrc)
    playlist.next()

    if (!flowRef.current) {
      console.error("❌ FlowController non initialisé")
      return
    }

    const flow = flowRef.current
    const state = flow.ctx.state
    const mode = flow.ctx.mode
    const lang = flow.ctx.lang
    const currentSrc = typeof videoSrc === "string" ? videoSrc : videoSrc?.url || ""

    // INTRO 1 → INTRO 2
    if (state === "INTRO_1") {
      const intro2 = await flow.getIntro2()
      playlist.add(intro2)
      playlist.next()
      return
    }

    // INTRO 2 → Q1
    if (state === "INTRO_2") {
      const first = await flow.fetchQ1()

      if (!first) {
        console.error("❌ fetchQ1() a renvoyé NULL")
        return
      }

      if (first.type === "video") {
        playlist.add(first.url)
      } else if (first.type === "audio") {
        const q1 = first.question
        responseMetrics.current.currentQuestionId = q1.id

        const text =
          q1[`audio_prompt_${lang}`] ||
          q1[`text_${lang}`] ||
          q1[`question_${lang}`] ||
          q1.question_en ||
          q1.question_fr ||
          ""

        chatRef.current?.addMessage("nova", text)
        await playAudioQuestion(q1)

        const idle = await flow.getIdleListen()
        playlist.add(idle)
      }

      playlist.next()
      return
    }

    // Q1 → RUN
    if (state === "Q1_AUDIO" || state === "Q1_VIDEO") {
      const next = await flow.fetchNextQuestion()

      if (!next) {
        console.log("🏁 Plus de question → fin")
        return
      }

      if (next.type === "video") {
        playlist.add(next.url)
      } else if (next.type === "audio") {
        responseMetrics.current.currentQuestionId = next.question.id
        await playAudioQuestion(next.question)
        const idle = await flow.getIdleListen()
        playlist.add(idle)
      }

      playlist.next()
      return
    }

    // REPEAT (audio)
    if ((window as any).__novaRepeatRequested && mode === "audio") {
      ;(window as any).__novaRepeatRequested = false
      responseMetrics.current.currentTranscript = ""

      const q = flow.ctx.currentQuestion
      if (q?.id) {
        responseMetrics.current.currentQuestionId = q.id
      }
      await playAudioQuestion(q)
      const idle = await flow.getIdleListen()
      playlist.add(idle)
      playlist.next()
      return
    }

    // REPEAT (video)
    if ((window as any).__novaRepeatRequested && mode === "video") {
      ;(window as any).__novaRepeatRequested = false
      responseMetrics.current.currentTranscript = ""

      const q = flow.currentQuestion
      if (q?.id) {
        responseMetrics.current.currentQuestionId = q.id
      }
      playlist.add(videoSrc)
      playlist.next()
      return
    }

    // FIN QUESTION → FEEDBACK
    if (flow.ctx.currentQuestion) {
      const transcript = responseMetrics.current.currentTranscript || ""
      await flow.sendFeedback(transcript)
      responseMetrics.current.currentTranscript = ""

      const idle = await flow.getIdleListen()
      playlist.add(idle)
      playlist.next()
      return
    }

    // Fallback — playlist vide
    if (playlist.size() === 0) {
      const idle = await flow.getIdleListen()
      playlist.add(idle)
      playlist.next()
    }
  }

  const playAudioQuestion = async (q: any) => {
    if ((window as any).__novaAudioLock) return
    ;(window as any).__novaAudioLock = true
    setTimeout(() => {
      ;(window as any).__novaAudioLock = false
    }, 2000)

    if (!q) return
    if (q.id) {
      responseMetrics.current.currentQuestionId = q.id
    }
    const lang = session?.lang || "en"
    const text =
      q[`audio_prompt_${lang}`] || q[`text_${lang}`] || q[`question_${lang}`] || q.question_en || q.question_fr || ""
    chatRef.current?.addMessage("nova", text)
    await novaVoice.speak(text)
  }

  const handleUserChatMessage = useCallback(async (message: string) => {
    console.log("💬 User message:", message)
    try {
      const lastQuestion = chatRef.current?.getLastQuestion() || null
      const res = await fetch("/api/nova-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userMessage: message, lastQuestion }),
      })
      const data = await res.json()
      console.log("🧠 Nova response:", data)
      chatRef.current?.addMessage("nova", data.reply || "I'm here to help!")
    } catch (err) {
      console.error("❌ nova-chat error:", err)
      chatRef.current?.addMessage("nova", "Sorry, I couldn't process your message.")
    }
  }, [])

  const handleSessionEnd = async () => {
    console.log("⏹ Fin de session par timer")

    stopEmotionHeartbeat()

    try {
      stopNovaTranscription()
    } catch {}

    disableNovaTranscription()
    setMicEnabled(false)

    playlist.reset?.()
    setIsPlaying(false)
    setHasStarted(false)
    videoRef.current?.pause()

    idleMgrRef.current?.showEndScreen?.()

    await fetch("/api/session/end", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ session_id: sessionId }),
    }).catch(() => {})

    await fetch("/api/engine/complete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ session_id: sessionId }),
    }).catch(() => {})

    await handleFinalFeedback()
  }

  const handleFinalFeedback = async () => {
    console.log("🎯 Génération du feedback final...")
    setShowPreparingOverlay(true)

    try {
      if (flowRef.current) {
        await flowRef.current.endSession()
      }

      setTimeout(() => {
        router.push(`/interview/${sessionId}/results`)
      }, 1500)
    } catch (err) {
      console.error("❌ Erreur lors du feedback final:", err)
      setShowPreparingOverlay(false)
    }
  }

  return (
    <main className="h-screen w-screen bg-zinc-950 text-white overflow-hidden flex flex-col">
      {/* Header bar - style Zoom/Teams */}
      <header className="h-14 bg-zinc-900/80 backdrop-blur border-b border-zinc-800 flex items-center justify-between px-6">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
            <span className="text-white font-bold text-sm">N</span>
          </div>
          <span className="text-lg font-semibold">Nova Interview</span>
        </div>
        <div className="flex items-center gap-4">
          {/* Live indicator */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-500/20">
            <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
            <span className="text-sm font-medium text-red-400">Live</span>
          </div>
          {/* Timer - only when started */}
          {hasStarted && <NovaTimer totalMinutes={durationSecSafe / 60} onHardStop={handleSessionEnd} />}
        </div>
      </header>

      {/* Main content area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Video area - takes all available space */}
        <div
          className="flex-1 relative bg-black"
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
        >
          {/* Video player - full size */}
          {videoSrc ? (
            <video
              ref={videoRef}
              src={typeof videoSrc === "string" ? videoSrc : videoSrc?.url || ""}
              autoPlay
              playsInline
              preload="auto"
              muted={!audioUnlocked}
              onCanPlay={() => {
                const v = videoRef.current
                if (!v) return
                v.play().catch(() => console.warn("Autoplay blocked:", videoSrc))
              }}
              onPlay={() => {
                console.log("Lecture en cours:", videoSrc)
                setIsPlaying(true)

                const src = typeof videoSrc === "string" ? videoSrc : videoSrc?.url || ""

                if (isAudioMode && !(window as any).__novaAudioLock) {
                  const q = flowRef.current?.ctx?.currentQuestion
                  if (q) playAudioQuestion(q)
                }

                const hasSystemVideo = [
                  "nova_idle_listen",
                  "nova_idle_follow",
                  "nova_thinking",
                  "nova_intro",
                  "nova_end",
                ].some((key) => src.includes(key))

                setMicEnabled(hasSystemVideo)

                const q = flowRef.current?.ctx?.currentQuestion
                if (q) {
                  const lang = session?.lang || "en"
                  const promptKey = `audio_prompt_${lang}`
                  const textKey = `text_${lang}`
                  const questionKey = `question_${lang}`
                  const questionText =
                    q[promptKey] || q[textKey] || q[questionKey] || q.question_en || q.question_fr || ""

                  if (questionText && chatRef.current) {
                    chatRef.current.addMessage("nova", questionText)
                  }

                  if (isAudioMode) {
                    playAudioQuestion(q)
                  }
                }
              }}
              onPause={() => console.log("Pause detectee:", videoSrc)}
              onEnded={handleEnded}
              className="absolute inset-0 w-full h-full object-contain"
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-zinc-900 via-zinc-800 to-black flex items-center justify-center">
              <div className="text-zinc-500 text-lg">Preparing interview...</div>
            </div>
          )}

          {/* Start button overlay */}
          {!hasStarted && (
            <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/40">
              <NovaStartButton
                label="Start Simulation"
                onClick={async () => {
                  console.log("Bouton START clique!")
                  await handleStart()
                }}
              />
            </div>
          )}

          {/* Click to play/pause overlay */}
          <div
            onClick={(e) => {
              if (!hasStarted) return
              e.stopPropagation()
              const v = videoRef.current
              if (!v) return

              if (isPlaying) {
                v.pause()
                setVideoPaused(true)
                setIsPlaying(false)
              } else {
                v.play()
                setVideoPaused(false)
                setIsPlaying(true)
              }
            }}
            className={hasStarted ? "absolute inset-0 cursor-pointer z-10" : "pointer-events-none"}
          />

          {/* User camera PIP - bottom right of video */}
          {userCameraStream && (
            <div
              className="absolute bottom-6 right-6 z-20 group/camera"
              onMouseEnter={() => setUserCameraHovered(true)}
              onMouseLeave={() => setUserCameraHovered(false)}
            >
              <div
                className={`rounded-xl overflow-hidden border-2 border-zinc-600/50 bg-zinc-900 shadow-2xl transition-all duration-300 ${
                  userCameraHovered ? "w-56 h-42" : "w-40 h-30"
                }`}
                style={{ width: userCameraHovered ? 224 : 160, height: userCameraHovered ? 168 : 120 }}
              >
                <video
                  ref={(el) => {
                    if (el && userCameraStream) {
                      el.srcObject = userCameraStream
                    }
                  }}
                  autoPlay
                  muted
                  playsInline
                  className="w-full h-full object-cover scale-x-[-1]"
                />
              </div>
              <span className="absolute bottom-2 left-3 text-xs text-white/80 bg-black/60 px-2 py-0.5 rounded-md font-medium">
                You
              </span>
            </div>
          )}

          {/* Bottom control bar - centered over video */}
          {hasStarted && (
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30 flex items-center gap-3 px-4 py-2.5 bg-zinc-900/95 backdrop-blur-xl rounded-2xl border border-zinc-700/50 shadow-2xl">
              {/* Mute/Unmute audio button */}
              {!audioUnlocked ? (
                <button
                  onClick={async (e) => {
                    e.stopPropagation()
                    const v = videoRef.current
                    if (v) {
                      v.muted = false
                      try {
                        await v.play()
                      } catch {}
                    }
                    setAudioUnlocked(true)
                  }}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-500/20 hover:bg-red-500/30 text-red-400 transition-all hover:scale-105"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2"
                    />
                  </svg>
                  <span className="text-sm font-medium">Unmute</span>
                </button>
              ) : (
                <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-zinc-800 text-emerald-400">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"
                    />
                  </svg>
                  <span className="text-sm font-medium">Audio On</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Chat sidebar - fixed width */}
        <aside className="w-80 lg:w-96 bg-zinc-900/50 border-l border-zinc-800 flex flex-col">
          {/* Chat header */}
          <div className="h-14 px-4 flex items-center border-b border-zinc-800 bg-zinc-900/80">
            <h2 className="font-semibold text-zinc-200">Chat</h2>
          </div>

          {/* Chat messages */}
          <div className="flex-1 overflow-hidden">
            <NovaChatBox_TextOnly ref={chatRef} onUserMessage={handleUserChatMessage} />
          </div>

          {/* Recorder at bottom */}
          <div className="p-4 border-t border-zinc-800 bg-zinc-950/80">
            <NovaRecorder
              ref={recordingRef}
              sessionId={sessionId}
              userId={session?.user_id}
              onTranscript={(transcript: string) => {
                responseMetrics.current.currentTranscript = transcript

                if (checkRepeatIntent(transcript)) {
                  console.log("Repeat intent detected:", transcript)
                  ;(window as any).__novaRepeatRequested = true
                  return
                }

                setLastFollowupText(transcript || "")
              }}
              onSilence={async (metrics) => {
                console.log("Silence detecte -> IdleManager declenche")
                stopEmotionHeartbeat()

                const transcript = responseMetrics.current.currentTranscript || ""
                const question_id = responseMetrics.current.currentQuestionId

                const duration_ms = metrics?.duration_ms || 0
                const pauses_count = metrics?.pauses_count || 0

                const speaking_speed_wpm =
                  transcript.trim().length > 0 && duration_ms > 0
                    ? Math.round(transcript.split(" ").length / (duration_ms / 60000))
                    : 0

                const hesitations_count = transcript.match(/(euh|uh|erm|hum)/gi)?.length || 0

                const emotions_snapshot = await fetch(
                  `/api/emotions/latest?session_id=${sessionId}&question_id=${question_id}`,
                )
                  .then((r) => r.json())
                  .catch(() => null)

                const stress_score = emotions_snapshot?.stress ?? null
                const confidence_score = emotions_snapshot?.confidence ?? null
                const eye_contact_score = emotions_snapshot?.eye_contact ?? null
                const posture_score = emotions_snapshot?.posture_score ?? null

                const scoring_axes = responseMetrics.current.scoring_axes || null
                const feedback_video_selected = responseMetrics.current.feedbackVideo || null
                const expected_answer_used = responseMetrics.current.expectedAnswer || null

                const score = responseMetrics.current.currentScore || null
                const score_auto = responseMetrics.current.currentScoreAuto || null

                try {
                  await fetch("/api/memoire", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      user_id: session?.user_id,
                      session_id: sessionId,
                      question_id,
                      transcript,
                      score,
                      score_auto,
                      duration_ms,
                      pauses_count,
                      speaking_speed_wpm,
                      hesitations_count,
                      stress_score,
                      confidence_score,
                      eye_contact_score,
                      posture_score,
                      emotions_snapshot,
                      scoring_axes,
                      feedback_video_selected,
                      expected_answer_used,
                      lang: session?.lang,
                    }),
                  })
                } catch (error) {
                  console.error("Error saving memory:", error)
                }

                idleMgrRef.current?.handleSilence()
              }}
              onSpeaking={async () => {
                console.log("Detection de parole -> IdleManager averti")

                if (!startTimeRef.current) {
                  startTimeRef.current = performance.now()
                  pausesRef.current = []
                  lastSilentAtRef.current = null
                }

                if (responseMetrics.current.startTime === 0) {
                  responseMetrics.current.startTime = performance.now()
                  responseMetrics.current.detectedPauses = []
                  responseMetrics.current.lastSilenceTime = null
                }

                if (lastSilentAtRef.current === null) {
                  lastSilentAtRef.current = performance.now()
                }

                idleMgrRef.current?.onUserSpeaking()

                startEmotionHeartbeat(responseMetrics.current.currentQuestionId, sessionId, session?.user_id)
              }}
            />
          </div>
        </aside>
      </div>

      {showDashboardButton && (
        <button
          onClick={() => router.push("/dashboard")}
          className="fixed bottom-6 right-6 bg-white text-black px-6 py-3 rounded-xl shadow-lg hover:scale-105 transition z-50 font-semibold"
        >
          Return to dashboard
        </button>
      )}

      {showPreparingOverlay && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center">
          <div className="text-center space-y-4 animate-pulse">
            <div className="text-white text-lg font-semibold">Nova is preparing your final feedback...</div>
            <div className="w-8 h-8 mx-auto border-4 border-white/40 border-t-white rounded-full animate-spin"></div>
          </div>
        </div>
      )}
    </main>
  )
}

/* ======================================================
   🔵 HOOKS EMIS PAR NOVARECORDER → NOVAENGINE
   ====================================================== */
export function emitSpeechStart() {
  try {
    const cb = (window as any).__novaSpeechStart
    if (typeof cb === "function") cb()
  } catch {}
}

export function emitSilence() {
  try {
    const cb = (window as any).__novaSilence
    if (typeof cb === "function") cb()
  } catch {}
}
