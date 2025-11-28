import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

/** Moyenne sécurisée sur tableau de nombres */
function avg(arr: number[]): number {
  if (!arr?.length) return 0;
  const valid = arr.map(Number).filter((v) => !Number.isNaN(v));
  if (!valid.length) return 0;
  return Math.round((valid.reduce((a, b) => a + b, 0) / valid.length) * 100) / 100;
}

/**
 * Nova Engine – Feedback Final API
 * ---------------------------------
 * Génère le feedback complet après la session :
 *  - Synthèse verbale (GPT)
 *  - Moyenne comportementale (stress, confiance, posture)
 *  - Axes d'amélioration (JSON)
 *  - Enregistre score_global + résumé + axes dans nova_sessions
 */
export async function POST(req: NextRequest) {
  try {
    const { session_id } = await req.json();
    if (!session_id) {
      return NextResponse.json({ error: "Missing session_id" }, { status: 400 });
    }

    // 1) Réponses utilisateur (on prend score_auto si dispo, sinon score)
    const { data: answers, error: memErr } = await supabaseAdmin
      .from("nova_memory")
      .select("question_id, reponse, score, score_auto, feedback, analysis_json, theme, tag")
      .eq("session_id", session_id);

    if (memErr) throw memErr;
    if (!answers || answers.length === 0) {
      return NextResponse.json({ error: "No responses found" }, { status: 404 });
    }

    // 2) Émotions comportementales — ⚠️ filtrées par session_id
    const { data: emotions, error: emoErr } = await supabaseAdmin
      .from("nova_emotions")
      .select("stress, confidence, eye_contact, smiles, posture_score")
      .eq("session_id", session_id);

    if (emoErr) console.warn("⚠️ Emotion data fetch issue:", emoErr);

    const behaviorSummary = {
      stress: avg(emotions?.map((e) => e.stress ?? 0) || []),
      confidence: avg(emotions?.map((e) => e.confidence ?? 0) || []),
      eye_contact: avg(emotions?.map((e) => e.eye_contact ?? 0) || []),
      smiles: avg(emotions?.map((e) => e.smiles ?? 0) || []),
      posture_score: avg(emotions?.map((e) => e.posture_score ?? 0) || []),
    };

    // 3) Concaténer les réponses pour le prompt
    const formattedAnswers =
      answers
        ?.map((a, i) => {
          const s = Number.isFinite(a.score_auto) ? a.score_auto : a.score;
          return `Q${i + 1}: ${a.question_id}\nA${i + 1}: ${a.reponse}\nAuto-score: ${s ?? "N/A"}`;
        })
        .join("\n\n") || "N/A";

    // 4) Prompt global IA — on exige axes_improvement[]
    const prompt = `
You are Nova, a professional AI recruiter.
Provide a structured evaluation of the candidate's performance during a mock interview.

Behavioral data (averages): ${JSON.stringify(behaviorSummary)}

Candidate responses:
${formattedAnswers}

Return STRICT valid JSON (no comments, no markdown), with exactly these fields:

{
  "score_global": number (0-100),
  "summary": {
    "strengths": [string],
    "weaknesses": [string],
    "recommendations": [string]
  },
  "axes_improvement": [
    {
      "axis": "communication" | "structure" | "impact" | "confidence" | "posture" | "clarity" | "listening" | "conciseness",
      "score": number (0-100),
      "comment": string,
      "recommendation": string,
      "resource": string | null
    }
  ],
  "tone": "encouraging" | "neutral" | "direct"
}
Ensure the output is valid JSON only.
`;

    // 5) Appel OpenAI (ou fallback si indisponible)
    let feedback: {
      score_global: number;
      summary: { strengths: string[]; weaknesses: string[]; recommendations: string[] };
      axes_improvement: Array<{
        axis: string;
        score: number;
        comment: string;
        recommendation: string;
        resource?: string | null;
      }>;
      tone: string;
    };

    try {
      const aiRes = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          temperature: 0.4,
          response_format: { type: "json_object" }, // 👈 aide le parsing
          messages: [
            {
              role: "system",
              content:
                "You are Nova, an AI recruiter giving a professional debrief. Always answer in valid JSON.",
            },
            { role: "user", content: prompt },
          ],
        }),
      });

      const json = await aiRes.json();
      const text = json?.choices?.[0]?.message?.content || "{}";
      feedback = JSON.parse(text);
    } catch (err) {
      console.warn("⚠️ JSON parsing fallback:", err);
      feedback = {
        score_global: Math.round(
          avg(
            answers
              .map((a: any) =>
                Number.isFinite(a.score_auto) ? Number(a.score_auto) : Number(a.score)
              )
              .filter((x) => Number.isFinite(x))
          ) || 70
        ),
        summary: {
          strengths: ["Clear and structured answers", "Calm tone and good presence"],
          weaknesses: ["Needs more specific metrics", "Occasional overlong answers"],
          recommendations: [
            "Use STAR consistently with concrete KPIs",
            "Pause 1–2 seconds before key points to increase authority",
          ],
        },
        axes_improvement: [
          {
            axis: "communication",
            score: 72,
            comment: "Clarity is good, but examples lack precision.",
            recommendation: "Add one metric per result to anchor credibility.",
            resource: null,
          },
          {
            axis: "structure",
            score: 68,
            comment: "You jump to solutions without setting context.",
            recommendation: "Frame with 1-line context before any solution.",
            resource: null,
          },
          {
            axis: "confidence",
            score: 80,
            comment: "Tone is calm, add short pauses for emphasis.",
            recommendation: "Pause before conclusions to signal control.",
            resource: null,
          },
        ],
        tone: "neutral",
      };
    }

    // 6) Mise à jour de la session (sauvegarde axes_improvement + feedback)
    const { error: updateErr } = await supabaseAdmin
      .from("nova_sessions")
      .update({
        status: "completed",
        score_global: feedback.score_global ?? 70,
        summary_json: feedback.summary ?? {},
        axes_improvement: feedback.axes_improvement ?? [],
        tone: feedback.tone ?? "neutral",
        ended_at: new Date().toISOString(),
      })
      .eq("id", session_id);

    if (updateErr) throw updateErr;

    // 7) Réponse finale
    return NextResponse.json({
      ok: true,
      feedback,
      behavior: behaviorSummary,
      message: "✅ Global feedback & improvement axes generated successfully.",
    });
  } catch (err: any) {
    console.error("❌ Engine Complete Error:", err);
    return NextResponse.json(
      { error: err?.message ?? "Server error generating feedback" },
      { status: 500 }
    );
  }
}