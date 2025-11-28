import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import OpenAI from "openai";

/* ---------------- Utils ---------------- */
const avg = (arr: number[]) =>
  arr.length ? Math.round((arr.reduce((a, b) => a + b, 0) / arr.length) * 100) / 100 : 0;

const avgObj = (items: any[], field: string) =>
  avg(items.map((x) => Number(x?.[field] || 0)));

const mostCommon = (arr: (string | null)[]) => {
  const f: Record<string, number> = {};
  for (const v of arr) if (v) f[v] = (f[v] || 0) + 1;
  return Object.entries(f).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
};

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/* ======================================================
   GET /api/report?session_id=xxx
   Rapport complet pour feedback + PDF V5
====================================================== */
export async function GET(req: NextRequest) {
  try {
    const sp = req.nextUrl.searchParams;
    const session_id = sp.get("session_id");

    if (!session_id) {
      return NextResponse.json({ error: "Missing session_id" }, { status: 400 });
    }

    /* ---------------- 1) Charger session ---------------- */
    const { data: session } = await supabaseAdmin
      .from("nova_sessions")
      .select(
        `
        id, user_id, score_global, summary_json, axes_improvement,
        fit_asked, general_asked, closing_asked,
        clarity_overall, structure_overall, communication_overall, confidence_overall,
        final_feedback_summary, final_feedback_text, final_feedback_axes,
        lang
        `
      )
      .eq("id", session_id)
      .single();

    if (!session)
      return NextResponse.json({ error: "Session not found" }, { status: 404 });

    /* ---------------- 2) Charger mémoire ---------------- */
    const { data: memory } = await supabaseAdmin
      .from("nova_memory")
      .select(
        `
        id, question_id, reponse,
        score, score_auto, scoring_axes,
        feedback, feedback_json, expected_answer_used,
        answer_first, answer_second,
        duration_ms, pauses_count,
        speaking_speed_wpm, hesitations_count,
        stress_score, confidence_score, eye_contact_score, posture_score,
        emotions_snapshot,
        tags_detected, ideal_answer_distance,
        created_at
        `
      )
      .eq("session_id", session_id)
      .order("created_at", { ascending: true });

    /* ---------------- 3) Charger questions ---------------- */
    const qIds = memory?.map((m) => m.question_id).filter(Boolean) || [];
    let qMap: Record<string, any> = {};
    if (qIds.length) {
      const { data: qRows } = await supabaseAdmin
        .from("nova_questions")
        .select("question_id, question_en, expected_answer_en, category, tags")
        .in("question_id", qIds);

      qMap = Object.fromEntries((qRows || []).map((q) => [q.question_id, q]));
    }

    /* ---------------- 4) Charger émotions ---------------- */
    const { data: emotions } = await supabaseAdmin
      .from("nova_emotions")
      .select(
        `
        stress, confidence, eye_contact, smile, smiles,
        posture, posture_score, hesitations, words_per_min,
        gaze_stability, authenticity_score
        `
      )
      .eq("session_id", session_id);

    /* ---------------- 5) Behavior (agrégation) ---------------- */
    const behavior = {
      stress: avgObj(emotions || [], "stress"),
      confidence: avgObj(emotions || [], "confidence"),
      eye_contact: avgObj(emotions || [], "eye_contact"),
      smile: avgObj(emotions || [], "smile"),
      posture_score: avgObj(emotions || [], "posture_score"),
      authenticity: avgObj(emotions || [], "authenticity_score"),
      posture: mostCommon((emotions || []).map((e) => e.posture)),
      hesitations: avgObj(emotions || [], "hesitations"),
      wpm: avgObj(emotions || [], "words_per_min"),
      gaze_stability: avgObj(emotions || [], "gaze_stability"),
    };

    /* ---------------- 6) Scores par catégorie (FIT / GENERAL / CLOSING) ---------------- */
    const categories = { fit: [], general: [], closing: [] as number[] };

    for (const m of memory || []) {
      const meta = qMap[m.question_id];
      const tags = JSON.stringify(meta?.tags || []);

      if (tags.includes("fit")) categories.fit.push(m.score_auto || 0);
      else if (tags.includes("closing")) categories.closing.push(m.score_auto || 0);
      else categories.general.push(m.score_auto || 0);
    }

    const categoryScores = {
      fit_avg: avg(categories.fit),
      general_avg: avg(categories.general),
      closing_avg: avg(categories.closing),
      fit_count: categories.fit.length,
      general_count: categories.general.length,
      closing_count: categories.closing.length,
    };

    /* ---------------- 7) Synthèse GPT-5 (fallback) ---------------- */
    const answersText = (memory || [])
      .map(
        (m, i) =>
          `Q${i + 1} (${m.question_id}): ${m.reponse || "—"}\nFeedback: ${
            m.feedback_json?.comment || m.feedback || "—"
          }\n`
      )
      .join("\n");

    const prompt = `
You are Nova, an elite interview coach.
Produce a professional summary of the candidate’s performance.

Inputs:
${answersText}

Return JSON ONLY:
{
  "summary": {
    "strengths": string[],
    "weaknesses": string[],
    "recommendations": string[]
  }
}
Respond in ${session.lang === "fr" ? "French" : "English"}.
`;

    let aiSummary: any = null;
    try {
      const ai = await client.responses.create({
        model: "gpt-5",
        input: [{ role: "user", content: prompt }],
      });

      aiSummary = JSON.parse(ai.output_text.trim().replace(/```json|```/g, ""));
    } catch (err) {
      aiSummary = {
        summary: {
          strengths: ["Clear communication", "Good structure"],
          weaknesses: ["Needs more precision"],
          recommendations: ["Add more numbers and specifics"],
        },
      };
    }

    /* ---------------- 8) Payload final (NovaFinalFeedback + PDF V5) ---------------- */
    return NextResponse.json({
      ok: true,

      session: {
        id: session.id,
        score_global: session.score_global,
        clarity_overall: session.clarity_overall,
        structure_overall: session.structure_overall,
        communication_overall: session.communication_overall,
        confidence_overall: session.confidence_overall,
      },

      memory,      // toutes les réponses + scoring_axes + snapshots
      questions: qMap,
      emotions: behavior,

      summary: aiSummary.summary,
      axes_improvement: session.axes_improvement,

      category_scores: categoryScores,

      counters: {
        fit_asked: session.fit_asked,
        general_asked: session.general_asked,
        closing_asked: session.closing_asked,
      },
    });
  } catch (e: any) {
    console.error("❌ report/GET error:", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
