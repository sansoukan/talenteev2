// ===============================================================
//  🚀 NovaFlowController.ts — CTO Google Edition (V2 CLEAN)
// ---------------------------------------------------------------
//  Version épurée :
//   • Plus AUCUNE logique de vidéos feedback (positive / neutral / high/mid/low)
//   • Feedback = idle + TTS uniquement
//   • Compatible preloadSystemVideos V4
//   • Compatible Chrome / Safari / Edge
// ===============================================================

import { getSystemVideo } from "@/lib/videoManager"

export type FlowState =
  | "INIT"
  | "INTRO_1"
  | "INTRO_2"
  | "Q1_AUDIO"
  | "Q1_VIDEO"
  | "RUN_AUDIO"
  | "RUN_VIDEO"
  | "ENDING"
  | "FEEDBACK_IDLE" // 💡 Nouveau : feedback = idle + TTS

export interface FlowContext {
  session_id: string
  lang: string
  mode: "audio" | "video"
  firstname?: string | null
  currentQuestion?: any | null
  nextQuestions?: any[] | null
  state: FlowState
}

export class NovaFlowController {
  ctx: FlowContext

  constructor(session_id: string, lang: string, mode: "audio" | "video", firstname?: string | null) {
    this.ctx = {
      session_id,
      lang,
      mode,
      firstname,
      currentQuestion: null,
      nextQuestions: null,
      state: "INIT",
    }
  }

  // ------------------------------
  // 🔄 Transition sécurisée
  // ------------------------------
  transition(next: FlowState) {
    console.log(`🔁 NovaFlowController STATE → ${next}`)
    this.ctx.state = next
  }

  // ============================================================
  // 1️⃣ INTRO FLOW
  // ============================================================
  async getIntro1() {
    this.transition("INTRO_1")
    return await getSystemVideo(`intro_${this.ctx.lang}_1`, this.ctx.lang)
  }

  async getIntro2() {
    this.transition("INTRO_2")
    return await getSystemVideo(`intro_${this.ctx.lang}_2`, this.ctx.lang)
  }

  // ============================================================
  // 2️⃣ INITIAL Q1 — FIX CTO GOOGLE (V4 FINAL)
  // ============================================================
  async fetchQ1() {
    console.log("[v0] fetchQ1() called")
    console.log("[v0] ctx.currentQuestion:", this.ctx.currentQuestion?.question_id)
    console.log("[v0] ctx.nextQuestions length:", this.ctx.nextQuestions?.length)

    // ----------------------------------------------------------
    // CAS 1 — Questions injectées par le front (INIT_Q1)
    // ----------------------------------------------------------
    if (Array.isArray(this.ctx.nextQuestions) && this.ctx.nextQuestions.length === 0 && this.ctx.currentQuestion) {
      console.log("🟦 fetchQ1() — Q1 déjà injectée par le front")

      const q1 = this.ctx.currentQuestion

      console.log("[v0] Q1 question_id:", q1.question_id || q1.id)
      if (q1.question_id !== "q_0001") {
        console.warn("[v0] WARNING: First question is NOT q_0001, it is:", q1.question_id)
      }

      if (this.ctx.mode === "audio") {
        this.transition("Q1_AUDIO")
        return { type: "audio", question: q1 }
      }

      this.transition("Q1_VIDEO")
      const videoUrl = this.ctx.lang === "fr" ? q1.video_url_fr || q1.video_url_en : q1.video_url_en || q1.video_url_fr

      return {
        type: "video",
        url:
          videoUrl || "https://qpnalviccuopdwfscoli.supabase.co/storage/v1/object/public/system/question_missing.mp4",
        question: q1,
      }
    }

    // ----------------------------------------------------------
    // CAS 2 — Liste fournie (séquence classique)
    // ----------------------------------------------------------
    if (Array.isArray(this.ctx.nextQuestions) && this.ctx.nextQuestions.length > 0) {
      console.log("🟧 fetchQ1() — utilisation de nextQuestions[]")

      const q0001Index = this.ctx.nextQuestions.findIndex((q) => q.question_id === "q_0001")
      let q1: any

      if (q0001Index !== -1) {
        // q_0001 found - use it as first question
        q1 = this.ctx.nextQuestions.splice(q0001Index, 1)[0]
        console.log("[v0] Found q_0001 at index", q0001Index, "- using it as first question")
      } else {
        // q_0001 not in list - use first question
        q1 = this.ctx.nextQuestions.shift()
        console.warn("[v0] q_0001 not found in nextQuestions, using first available:", q1?.question_id)
      }

      this.ctx.currentQuestion = q1

      console.log("[v0] Q1 question_id:", q1.question_id || q1.id)

      if (this.ctx.mode === "audio") {
        this.transition("Q1_AUDIO")
        return { type: "audio", question: q1 }
      }

      this.transition("Q1_VIDEO")
      const videoUrl = this.ctx.lang === "fr" ? q1.video_url_fr || q1.video_url_en : q1.video_url_en || q1.video_url_fr

      return {
        type: "video",
        url:
          videoUrl || "https://qpnalviccuopdwfscoli.supabase.co/storage/v1/object/public/system/question_missing.mp4",
        question: q1,
      }
    }

    // ----------------------------------------------------------
    // CAS 3 — Fallback orchestrate
    // ----------------------------------------------------------
    console.log("[v0] fetchQ1() — calling orchestrate API")
    const res = await fetch("/api/engine/orchestrate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ session_id: this.ctx.session_id }),
    })

    const json = await res.json()
    const q1 = json.question || json.questions?.[0]

    console.log("[v0] Q1 from orchestrate, question_id:", q1?.question_id || q1?.id)

    this.ctx.currentQuestion = q1
    this.ctx.nextQuestions = json.questions ? [...json.questions] : []

    // 🔥 Évite Q1 en double
    if (this.ctx.nextQuestions[0]?.id === q1.id || this.ctx.nextQuestions[0]?.question_id === q1.question_id) {
      this.ctx.nextQuestions.shift()
    }

    if (this.ctx.mode === "audio") {
      this.transition("Q1_AUDIO")
      return { type: "audio", question: q1 }
    }

    this.transition("Q1_VIDEO")
    const videoUrl = this.ctx.lang === "fr" ? q1.video_url_fr || q1.video_url_en : q1.video_url_en || q1.video_url_fr

    return {
      type: "video",
      url: videoUrl || "https://qpnalviccuopdwfscoli.supabase.co/storage/v1/object/public/system/question_missing.mp4",
      question: q1,
    }
  }

  // ============================================================
  // 3️⃣ RUNNING QUESTIONS — FIX CTO GOOGLE (V4 FINAL)
  // ============================================================
  async fetchNextQuestion() {
    if (!this.ctx.nextQuestions || this.ctx.nextQuestions.length === 0) {
      console.log("🏁 fetchNextQuestion() — plus de questions")
      return null
    }

    // 🔥 Protection : éviter rejouer la même question
    if (this.ctx.currentQuestion && this.ctx.nextQuestions[0]?.id === this.ctx.currentQuestion.id) {
      this.ctx.nextQuestions.shift()
    }

    const next = this.ctx.nextQuestions.shift()
    if (!next) return null

    this.ctx.currentQuestion = next

    if (this.ctx.mode === "audio") {
      this.transition("RUN_AUDIO")
      return { type: "audio", question: next }
    }

    this.transition("RUN_VIDEO")
    return {
      type: "video",
      url:
        next.video_url_en ||
        next.video_url_fr ||
        "https://qpnalviccuopdwfscoli.supabase.co/storage/v1/object/public/system/question_missing.mp4",
      question: next,
    }
  }

  // ============================================================
  // 4️⃣ FIN DE QUESTION → FEEDBACK (Idle + TTS uniquement)
  // ============================================================
  async sendFeedback(transcript: string) {
    if (!this.ctx.currentQuestion) return null

    const q = this.ctx.currentQuestion
    const lang = this.ctx.lang

    // 🧠 Appel API feedback textuel + score
    const res = await fetch("/api/engine/feedback-question", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        session_id: this.ctx.session_id,
        question_id: q.id,
        question_text: q[`question_${lang}`] || q.question_en || "",
        answer_text: transcript || "",
        lang,
      }),
    })

    const json = await res.json()

    // 🎞️ FEEDBACK = Idle listen
    this.transition("FEEDBACK_IDLE")
    return {
      type: "idle_feedback",
      idle_url: await this.getIdleListen(),
      feedback: json,
    }
  }

  // ============================================================
  // 5️⃣ IDLE VIDEOS
  // ============================================================
  async getIdleListen() {
    return await getSystemVideo("idle_listen", this.ctx.lang)
  }

  async getIdleSmile() {
    try {
      return await getSystemVideo("idle_smile", this.ctx.lang)
    } catch {
      return this.getIdleListen()
    }
  }

  async getIdleAlt() {
    try {
      return await getSystemVideo("listen_idle_01", this.ctx.lang)
    } catch {
      return this.getIdleListen()
    }
  }

  // ============================================================
  // 6️⃣ SESSION END
  // ============================================================
  async endSession() {
    this.transition("ENDING")

    await fetch("/api/session/end", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ session_id: this.ctx.session_id }),
    }).catch(() => {})

    await fetch("/api/engine/complete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ session_id: this.ctx.session_id }),
    }).catch(() => {})

    return true
  }
}
