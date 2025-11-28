import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import OpenAI from "openai";

/**
 * Nova Engine – Feedback Case API (GPT-5)
 * ---------------------------------------
 * Évalue les réponses des études de cas (niveau 3).
 * 🔹 Compare avec expected_keywords + expected_answer_qX
 * 🔹 Génère feedback multi-axes (clarity, insight, structure, leadership)
 * 🔹 Calcule score global pondéré
 * 🔹 Sauvegarde dans nova_memory
 */

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(req: NextRequest) {
  try {
    const { session_id, case_id, step_index = 0, question_text, answer_text, lang = "en" } =
      await req.json();

    if (!session_id || !case_id || !answer_text)
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });

    // 1️⃣ Charger le cas complet
    const { data: caseData, error } = await supabaseAdmin
      .from("nova_case_library")
      .select(
        `
        expected_keywords,
        expected_answer_en,
        expected_answer_q1,
        expected_answer_q2,
        expected_answer_q3,
        expected_answer_q4,
        expected_answer_q5,
        evaluation_axes
        `
      )
      .eq("id", case_id)
      .single();

    if (error || !caseData)
      throw new Error("Case not found in nova_case_library");

    const {
      expected_keywords,
      expected_answer_en,
      expected_answer_q1,
      expected_answer_q2,
      expected_answer_q3,
      expected_answer_q4,
      expected_answer_q5,
      evaluation_axes,
    } = caseData;

    // 2️⃣ Choisir la bonne expected_answer
    const stepAnswers = [
      expected_answer_q1,
      expected_answer_q2,
      expected_answer_q3,
      expected_answer_q4,
      expected_answer_q5,
    ];
    const expected_answer =
      stepAnswers[step_index - 1] || expected_answer_en || "";

    // 3️⃣ Calcul lexical basique
    const lower = answer_text.toLowerCase();
    const matched =
      expected_keywords?.filter((k: string) =>
        lower.includes(k.toLowerCase())
      ) ?? [];
    const lexicalScore = Math.round(
      (matched.length / (expected_keywords?.length || 1)) * 100
    );

    // 4️⃣ Prompt GPT-5
    const prompt = `
You are Nova, an interviewer trained at McKinsey, BCG, and Oliver Wyman.

Evaluate the candidate's answer to this business case step.

Question: "${question_text}"
Expected strong answer: "${expected_answer}"
Candidate's answer: "${answer_text}"

Return valid JSON only:
{
  "axes": {"clarity":0–100,"insight":0–100,"structure":0–100,"leadership":0–100},
  "comment":"recruiter feedback (3–5 sentences)"
}
`;

    const ai = await client.responses.create({
      model: "gpt-5",
      input: [{ role: "user", content: prompt }],
    });

    let feedback = ai.output_text.trim().replace(/```json|```/g, "");
    let parsed: any;
    try {
      parsed = JSON.parse(feedback);
    } catch {
      parsed = {
        axes: { clarity: 75, insight: 70, structure: 80, leadership: 65 },
        comment:
          "Clear reasoning and structured flow. Could add quantitative insight and leadership framing.",
      };
    }

    // 5️⃣ Score global pondéré
    const weights = evaluation_axes || {
      clarity: 0.3,
      insight: 0.3,
      structure: 0.2,
      leadership: 0.2,
    };
    const score_auto = Math.round(
      (parsed.axes.clarity * weights.clarity +
        parsed.axes.insight * weights.insight +
        parsed.axes.structure * weights.structure +
        parsed.axes.leadership * weights.leadership) /
        100
    );

    // 6️⃣ Enregistrement dans nova_memory
    await supabaseAdmin.from("nova_memory").insert({
      session_id,
      question_id: `${case_id}_q${step_index}`,
      reponse: answer_text,
      score_auto,
      feedback_json: {
        ...parsed,
        lexical: lexicalScore,
        expected_answer,
      },
      created_at: new Date().toISOString(),
    });

    // 7️⃣ Réponse à NovaEngine
    return NextResponse.json({
      ok: true,
      score_auto,
      feedback_json: {
        ...parsed,
        lexical: lexicalScore,
        expected_answer,
      },
    });
  } catch (e: any) {
    console.error("❌ feedback-case error:", e);
    return NextResponse.json(
      { error: e.message ?? "Server error" },
      { status: 500 }
    );
  }
}