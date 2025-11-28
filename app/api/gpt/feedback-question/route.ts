import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

/**
 * Nova RH — Feedback Question API (V3)
 * ------------------------------------
 * 🧠 Compare les réponses du candidat à la réponse attendue
 * 🧩 Analyse également l'amélioration entre réponse initiale et réponse après relance
 * 💾 Met à jour nova_memory avec score + feedback structuré
 */

export async function POST(req: NextRequest) {
  try {
    const { session_id } = await req.json();
    if (!session_id)
      return NextResponse.json({ error: "Missing session_id" }, { status: 400 });

    // 1️⃣ Récupération des réponses de la session
    const { data: memory, error } = await supabaseAdmin
      .from("nova_memory")
      .select(`
        id,
        question_id,
        reponse,
        answer_first,
        answer_second,
        question:question_id(question_en, expected_answer_en)
      `)
      .eq("session_id", session_id);

    if (error) throw error;
    if (!memory?.length)
      return NextResponse.json({ error: "No answers" }, { status: 404 });

    const systemPrompt = `
You are Nova, a professional recruiter assessing a candidate's answers.
For each question:
1. Compare the candidate's answers to the expected answer.
2. If there are two answers (before and after clarification), assess the improvement.
3. Return JSON strictly in this format:
{
  "score": 0-100,
  "comment": "one-sentence evaluation",
  "strengths": ["..."],
  "improvements": ["..."],
  "improvement_score": 0-1,
  "improvement_comment": "if second answer improved or not"
}
`;

    // 2️⃣ Boucle sur les questions
    for (const m of memory) {
      const qText = m.question?.question_en || "N/A";
      const expected = m.question?.expected_answer_en || "N/A";
      const first = m.answer_first || m.reponse || "";
      const second = m.answer_second || "";

      const userPrompt = `
Question: ${qText}
Expected answer: ${expected}
First answer: ${first || "N/A"}
Second answer (after clarification): ${second || "N/A"}
Evaluate and return JSON as specified.`;

      const completion = await openai.chat.completions.create({
        model: "gpt-5-chat-latest",
        temperature: 0.3,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        response_format: { type: "json_object" },
      });

      // 3️⃣ Parsing du JSON GPT
      const parsed = JSON.parse(completion.choices[0].message?.content || "{}");

      // 4️⃣ Préparation du feedback formaté
      const feedbackLines = [
        "Nova Question Feedback:",
        parsed.comment,
        parsed.improvement_comment
          ? "Clarification result: " + parsed.improvement_comment
          : "",
        parsed.strengths
          ? "Strengths: " + parsed.strengths.join("; ")
          : "",
        parsed.improvements
          ? "Improvements: " + parsed.improvements.join("; ")
          : "",
      ]
        .filter(Boolean)
        .join("\n");

      // 5️⃣ Mise à jour en base
      await supabaseAdmin
        .from("nova_memory")
        .update({
          score: parsed.score ?? 70,
          improvement_score: parsed.improvement_score ?? null,
          feedback: feedbackLines,
        })
        .eq("id", m.id);
    }

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("❌ feedback-question error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
