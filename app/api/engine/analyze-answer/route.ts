// /src/app/api/engine/analyze-answer/route.ts
import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";

// ✅ Initialisation API
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

// ✅ Initialisation Supabase admin (lecture/écriture DB)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const { question, answer, session_id, user_id, lang = "en" } = await req.json();

    if (!question || !answer) {
      return NextResponse.json(
        { error: "Missing question or answer" },
        { status: 400 }
      );
    }

    // 🧠 Prompt enrichi
    const prompt = `
You are Nova, an advanced AI interview coach and recruiter.
Evaluate the candidate’s answer using 5 cognitive dimensions.

Question: "${question}"
Answer: "${answer}"

Assess the answer from 0 to 1 for each criterion:
1. Relevance — how well it answers the question
2. Clarity — precision and conciseness of expression
3. Structure — logical flow (context > action > result)
4. Confidence — tone, ownership, assertiveness
5. Depth — reasoning, justification, examples

Then calculate a global_score = average of all five.

Return ONLY valid JSON:
{
  "scores": {
    "relevance": 0–1,
    "clarity": 0–1,
    "structure": 0–1,
    "confidence": 0–1,
    "depth": 0–1
  },
  "global_score": 0–1,
  "summary": "brief recruiter feedback",
  "improvement": "short coaching advice",
  "action": "pass" | "clarify" | "reask"
}
`;

    // 🔥 Appel GPT-5
    const completion = await openai.chat.completions.create({
      model: "gpt-5-chat-latest",
      temperature: 0.35,
      messages: [
        { role: "system", content: "You are Nova, a recruiter and professional interview evaluator." },
        { role: "user", content: prompt },
      ],
    });

    const text = completion.choices[0]?.message?.content?.trim() || "{}";

    let result: any;
    try {
      result = JSON.parse(text);
    } catch {
      console.warn("⚠️ GPT returned non-JSON output → fallback applied.");
      result = {
        scores: { relevance: 0.5, clarity: 0.5, structure: 0.5, confidence: 0.5, depth: 0.5 },
        global_score: 0.5,
        summary: "Default feedback applied due to parsing issue.",
        improvement: "Try to give more structured and detailed examples.",
        action: "pass",
      };
    }

    // 🧾 Sauvegarde facultative dans nova_memory
    if (session_id && user_id) {
      await supabase
        .from("nova_memory")
        .update({
          ai_feedback: result.summary,
          ai_tip: result.improvement,
          ai_score: result.global_score,
          ai_scores_detail: result.scores,
        })
        .eq("session_id", session_id)
        .eq("user_id", user_id)
        .order("created_at", { ascending: false })
        .limit(1);
    }

    return NextResponse.json(result);
  } catch (err: any) {
    console.error("❌ analyze-answer error:", err);
    return NextResponse.json(
      { error: err?.message ?? "Server error" },
      { status: 500 }
    );
  }
}