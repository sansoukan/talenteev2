import { type NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabaseAdmin"

/**
 * ======================================================
 *  🧠 /api/memoire — Mémoire utilisateur / session (V5)
 * ------------------------------------------------------
 *  Gère :
 *   • POST → insertion complète des réponses + métriques
 *   • GET  → récupération mémoire complète (pour replay/PDF)
 * ======================================================
 */

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    const {
      user_id,
      session_id,
      question_id,

      // Réponse utilisateur
      transcript,
      answer_first,
      answer_second,

      // Feedback IA
      feedback,
      ai_feedback,
      ai_tip,
      feedback_text,

      // Scores
      score,
      score_auto,
      ai_score,
      ai_scores_detail,
      improvement_score,
      scoring_axes, // 🆕 multi-dimensionnel

      // Clarification
      needs_clarify,
      clarity_followup_used,
      clarity_summary,

      // Vidéos
      video_played,
      feedback_video_selected, // 🆕 High/Mid/Low utilisé
      expected_answer_used, // 🆕 réponse idéale premium

      // NLP / Analyse
      transcript_clean,
      tags_detected,
      ideal_answer_distance,

      // Comportement
      duration_ms, // 🆕 durée réponse
      pauses_count, // 🆕 nombre pauses
      speaking_speed_wpm,
      hesitations_count,
      stress_score,
      confidence_score,
      eye_contact_score,
      posture_score,
      emotions_snapshot, // 🆕 snapshot complet

      // Meta
      lang,
      theme,
      tag,
    } = body || {}

    if (!user_id || !session_id) {
      return NextResponse.json({ error: "Missing user_id or session_id" }, { status: 400 })
    }

    // 🔹 Vérifie tentatives précédentes
    const { data: previous } = await supabaseAdmin
      .from("nova_memory")
      .select("id")
      .eq("session_id", session_id)
      .eq("question_id", question_id)

    const attempt = previous?.length ? previous.length + 1 : 1

    let enrichedEmotionsSnapshot = emotions_snapshot

    if (user_id && session_id) {
      try {
        const { data: latestEmotions } = await supabaseAdmin
          .from("nova_emotions")
          .select("*")
          .eq("user_id", user_id)
          .eq("session_id", session_id)
          .order("timestamp", { ascending: false })
          .limit(1)
          .single()

        if (latestEmotions) {
          // Normalisation des émotions récupérées
          enrichedEmotionsSnapshot = {
            stress: typeof latestEmotions.stress === "number" ? latestEmotions.stress : null,
            confidence: typeof latestEmotions.confidence === "number" ? latestEmotions.confidence : null,
            eye_contact: typeof latestEmotions.eye_contact === "number" ? latestEmotions.eye_contact : null,
            posture_score: typeof latestEmotions.posture_score === "number" ? latestEmotions.posture_score : null,
            gaze_stability: typeof latestEmotions.gaze_stability === "number" ? latestEmotions.gaze_stability : null,
            smiles: latestEmotions.smiles ?? null,
            hesitations: latestEmotions.hesitations ?? null,
            words_per_min: latestEmotions.words_per_min ?? null,
            pauses_count: latestEmotions.pauses_count ?? null,
            timestamp: latestEmotions.timestamp,
          }
        }
      } catch (emotionError) {
        console.warn("⚠️ Could not fetch latest emotions:", emotionError)
        // Continue with original emotions_snapshot if fetch fails
      }
    }

    // 🔹 Insertion complète
    const { data, error } = await supabaseAdmin
      .from("nova_memory")
      .insert({
        user_id,
        session_id,
        question_id: question_id ?? null,

        // Réponses
        reponse: transcript ?? null,
        answer_first: answer_first ?? null,
        answer_second: answer_second ?? null,

        // Feedback IA
        feedback: feedback ?? null,
        ai_feedback: ai_feedback ?? null,
        ai_tip: ai_tip ?? null,
        feedback_text: feedback_text ?? null,

        // Scores
        score: typeof score === "number" ? score : null,
        score_auto: typeof score_auto === "number" ? score_auto : null,
        ai_score: typeof ai_score === "number" ? ai_score : null,
        ai_scores_detail: ai_scores_detail ?? null,
        improvement_score: typeof improvement_score === "number" ? improvement_score : null,
        scoring_axes: scoring_axes ?? null,

        // Clarification
        needs_clarify: needs_clarify ?? false,
        clarity_followup_used: clarity_followup_used ?? null,
        clarity_summary: clarity_summary ?? null,

        // Vidéos
        video_played: video_played ?? null,
        feedback_video_selected: feedback_video_selected ?? null,
        expected_answer_used: expected_answer_used ?? null,

        // NLP
        transcript_clean: transcript_clean ?? null,
        tags_detected: tags_detected ?? null,
        ideal_answer_distance: typeof ideal_answer_distance === "number" ? ideal_answer_distance : null,

        // Comportement
        duration_ms: duration_ms ?? null,
        pauses_count: pauses_count ?? null,
        speaking_speed_wpm: speaking_speed_wpm ?? null,
        hesitations_count: hesitations_count ?? null,
        stress_score: stress_score ?? null,
        confidence_score: confidence_score ?? null,
        eye_contact_score: eye_contact_score ?? null,
        posture_score: posture_score ?? null,
        emotions_snapshot: enrichedEmotionsSnapshot ?? null,

        // Meta
        lang: lang ?? "en",
        theme: theme ?? null,
        tag: tag ?? null,

        attempt,
        created_at: new Date().toISOString(),
      })
      .select("id, created_at")
      .single()

    if (error) throw error

    return NextResponse.json(
      {
        ok: true,
        id: data?.id,
        attempt,
        created_at: data?.created_at,
      },
      { status: 200 },
    )
  } catch (e: any) {
    console.error("❌ memoire/POST error:", e)
    return NextResponse.json({ error: e?.message ?? "Server error" }, { status: 500 })
  }
}

/* -------------------- GET (V5 complet) -------------------- */
export async function GET(req: NextRequest) {
  try {
    const sp = req.nextUrl.searchParams
    const session_id = sp.get("session_id")
    const user_id = sp.get("user_id")

    if (!session_id || !user_id) {
      return NextResponse.json({ error: "Missing user_id or session_id" }, { status: 400 })
    }

    const { data, error } = await supabaseAdmin
      .from("nova_memory")
      .select("*")
      .eq("session_id", session_id)
      .eq("user_id", user_id)
      .order("created_at", { ascending: true })

    if (error) throw error

    return NextResponse.json({ items: data ?? [] }, { status: 200 })
  } catch (e: any) {
    console.error("❌ memoire/GET error:", e)
    return NextResponse.json({ error: e?.message ?? "Server error" }, { status: 500 })
  }
}

export const dynamic = "force-dynamic"
