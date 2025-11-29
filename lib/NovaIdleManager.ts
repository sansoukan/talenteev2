/**
 * ======================================================
 *  🎧 NovaIdleManager_Playlist — V3 Production (+ Écran Fin Nova)
 * ------------------------------------------------------
 *  Gère les boucles d'écoute et relances dans le flux Playlist :
 *  - idle_listen ×5 puis idle_smile
 *  - relance Clarify après 5s de silence
 *  - double silence → question suivante
 *  - voix ElevenLabs intégrée pour les relances GPT
 *  - ajout écran noir + logo Nova à la fin
 * ======================================================
 */

import { getSystemVideo } from "@/lib/videoManager"
import type { NovaPlaylistManager } from "@/lib/NovaPlaylistManager"

type IdleManagerOptions = {
  lang: string
  playlist: NovaPlaylistManager
  onNextQuestion: () => Promise<void>
  getFollowupText?: () => Promise<string | null>
  onRelanceStart?: () => void
  onRelanceEnd?: () => void
}

export class NovaIdleManager_Playlist {
  private lang: string
  private playlist: NovaPlaylistManager
  private onNextQuestion: () => Promise<void>
  private getFollowupText?: () => Promise<string | null>
  private onRelanceStart?: () => void
  private onRelanceEnd?: () => void
  private silenceTimer: any = null
  private hasSpoken = false
  private relanceCount = 0

  constructor(opts: IdleManagerOptions) {
    this.lang = opts.lang
    this.playlist = opts.playlist
    this.onNextQuestion = opts.onNextQuestion
    this.getFollowupText = opts.getFollowupText
    this.onRelanceStart = opts.onRelanceStart
    this.onRelanceEnd = opts.onRelanceEnd
  }

  /* ======================================================
     🎧 Boucle d'écoute principale (idle_listen → smile)
  ====================================================== */
  async startLoop() {
    console.log("🎧 IdleManager_Playlist — boucle écoute démarrée")
    await this.enqueueIdleSet()
    this.resetSilenceTimer()
  }

  async enqueueIdleSet() {
    try {
      const urls: string[] = []
      // 5 clips d'écoute + 1 sourire
      for (let i = 1; i <= 5; i++) {
        urls.push(await getSystemVideo("idle_listen", this.lang))
      }
      urls.push(await getSystemVideo("idle_smile", this.lang))
      this.playlist.add(...urls)
    } catch (err) {
      console.warn("⚠️ Impossible d'ajouter idle set:", err)
    }
  }

  stopLoop() {
    console.log("🛑 IdleManager_Playlist — boucle stoppée")
    if (this.silenceTimer) clearTimeout(this.silenceTimer)
  }

  /* ======================================================
     🧠 Tracking de la parole utilisateur
  ====================================================== */
  onUserSpeaking() {
    this.hasSpoken = true
    this.relanceCount = 0
    this.resetSilenceTimer()
  }

  resetContext() {
    this.hasSpoken = false
    this.relanceCount = 0
    if (this.silenceTimer) clearTimeout(this.silenceTimer)
  }

  /* ======================================================
     🔇 Gestion du silence (5s sans activité)
  ====================================================== */
  resetSilenceTimer() {
    if (this.silenceTimer) clearTimeout(this.silenceTimer)
    this.silenceTimer = setTimeout(() => this.handleSilence(), 5000)
  }

  async handleSilence() {
    console.log("🔇 5s de silence détectées")

    // 🧠 Cas 1 : silence initial (avant toute parole)
    if (!this.hasSpoken) {
      console.log("🤔 Silence initial — patience")
      this.resetSilenceTimer()
      return
    }

    // 🧠 Cas 2 : silence après réponse
    if (this.relanceCount >= 1) {
      console.log("⏭️ Double silence → question suivante")
      this.relanceCount = 0
      await this.onNextQuestion?.()
      return
    }

    this.relanceCount++
    await this.enqueueClarifySequence()
  }

  /* ======================================================
     🗣 Séquence Clarify (relance IA + voix ElevenLabs)
  ====================================================== */
  private async enqueueClarifySequence() {
    try {
      console.log("🎞 Clarify sequence — Nova relance IA")

      this.onRelanceStart?.()

      const clar1 = await getSystemVideo("clarify_end_alt", this.lang)
      const clar2 = await getSystemVideo("clarify_end", this.lang)

      // ... existing code for fetching relance ...

      const sessionId = (window as any).__novaSessionId
      const metrics = (window as any).__novaResponseMetrics || {}
      const questionId = metrics.currentQuestionId || null
      const questionIndex = (window as any).__novaQuestionIndex || 0
      const firstname = (window as any).__novaFirstname || null
      const langDetected = (window as any).__novaLang || this.lang

      let followText = await this.getFollowupText?.()
      if (!followText) followText = ""

      if (!sessionId || !questionId) {
        console.warn("⚠️ Missing sessionId/questionId for relance")
      } else {
        try {
          const rel = await fetch("/api/engine/relance", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              session_id: sessionId,
              question_id: questionId,
              question_text: "clarify",
              question_index: questionIndex,
              user_answer_text: followText,
              lang_detected: langDetected,
              firstname,
              is_trial: (window as any).__novaIsTrial || false,
            }),
          }).then((r) => r.json())

          const audioUrl = rel.audio_url
          const relanceText = rel.relance_text

          if (audioUrl) {
            const audio = new Audio(audioUrl)
            audio.volume = 1.0
            await new Promise<void>((resolve) => {
              audio.onended = () => resolve()
              audio.onerror = () => resolve()
              audio.play().catch(() => resolve())
            })
          }

          console.log("💬 Relance Nova:", relanceText)
        } catch (err) {
          console.error("❌ Error calling /engine/relance", err)
        }
      }

      // Ajoute les deux vidéos Clarify dans la playlist
      this.playlist.add(clar1, clar2)

      this.onRelanceEnd?.()

      // 🔁 Après la relance → reprendre l'écoute
      setTimeout(() => this.enqueueIdleSet(), 2000)
      this.resetSilenceTimer()
    } catch (err) {
      console.error("❌ Clarify sequence error :", err)
      this.onRelanceEnd?.()
      await this.onNextQuestion?.()
    }
  }

  /* ======================================================
     🖼️ Écran de fin avec logo Nova central
  ====================================================== */
  async showEndScreen() {
    console.log("🕹️ Affichage écran de fin Nova RH")

    // Supprime tout overlay existant
    const existing = document.getElementById("nova-end-screen")
    if (existing) existing.remove()

    const overlay = document.createElement("div")
    overlay.id = "nova-end-screen"
    overlay.style.position = "fixed"
    overlay.style.top = "0"
    overlay.style.left = "0"
    overlay.style.width = "100vw"
    overlay.style.height = "100vh"
    overlay.style.backgroundColor = "black"
    overlay.style.display = "flex"
    overlay.style.flexDirection = "column"
    overlay.style.justifyContent = "center"
    overlay.style.alignItems = "center"
    overlay.style.zIndex = "9999"
    overlay.style.animation = "fadeIn 2s ease-in-out"
    overlay.style.color = "white"
    overlay.style.fontFamily = "Inter, sans-serif"

    // Logo central Nova
    const logo = document.createElement("img")
    logo.src = "https://qpnalviccuopdwfscoli.supabase.co/storage/v1/object/public/nova-assets/nova-logo.png"
    logo.alt = "Nova Logo"
    logo.style.width = "160px"
    logo.style.height = "160px"
    logo.style.marginBottom = "24px"
    logo.style.opacity = "0.9"

    // Texte
    const text = document.createElement("div")
    text.innerText = "Session terminée — Merci d'avoir participé"
    text.style.fontSize = "1.5rem"
    text.style.textAlign = "center"
    text.style.opacity = "0.85"

    overlay.appendChild(logo)
    overlay.appendChild(text)
    document.body.appendChild(overlay)

    // Animation fadeIn
    const style = document.createElement("style")
    style.innerHTML = `
      @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }
    `
    document.head.appendChild(style)

    // Suppression auto après 6 secondes (optionnel)
    setTimeout(() => {
      overlay.style.transition = "opacity 1s"
      overlay.style.opacity = "0"
      setTimeout(() => overlay.remove(), 1000)
    }, 6000)
  }
}
