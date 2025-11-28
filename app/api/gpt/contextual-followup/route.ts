import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

/**
 * /api/gpt/contextual-followup
 * --------------------------------------------------
 * Analyse la réponse du candidat et génère :
 * - une éventuelle relance (needs_followup)
 * - un mini feedback humain (feedback_text)
 * Tonalité : professionnelle, bienveillante, naturelle.
 */
export async function POST(req: NextRequest) {
  try {
    const { question, answer, lang = "en" } = await req.json();

    const systemPrompt = `
You are Nova, a professional recruiter conducting a behavioral interview.
You analyze the candidate's response and decide whether it needs a follow-up question.
Your tone is professional, warm, and encouraging.

Return a valid JSON with three fields:
{
  "needs_followup": true | false,
  "followup_text": "short recruiter-style follow-up question in ${lang}",
  "feedback_text": "short, friendly feedback sentence in ${lang} (1 sentence max)"
}
`;

    const userPrompt = `
Question: "${question}"
Candidate answer: "${answer}"
`;

    // ✅ Nouvelle méthode stable (SDK OpenAI v4)
    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.5,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    });

    const text = completion.choices?.[0]?.message?.content?.trim() || "{}";

    // ✅ Tentative de parsing du JSON GPT
    let result: any = {};
    try {
      result = JSON.parse(text);
    } catch {
      console.warn("⚠️ Failed to parse GPT follow-up JSON:", text);
      result = { needs_followup: false, followup_text: "", feedback_text: "" };
    }

    // ✅ Validation minimale
    if (typeof result.needs_followup !== "boolean") result.needs_followup = false;
    if (typeof result.followup_text !== "string") result.followup_text = "";
    if (typeof result.feedback_text !== "string") result.feedback_text = "";

    // 🧠 LOG serveur visible dans terminal
    console.group("🤖 GPT Follow-up Analysis");
    console.log("📋 Question:", question);
    console.log("🗣️ Answer:", answer);
    console.log("🔹 needs_followup:", result.needs_followup);
    console.log("🔹 followup_text:", result.followup_text);
    console.log("🔹 feedback_text:", result.feedback_text);
    console.groupEnd();

    return NextResponse.json(result);
  } catch (err: any) {
    console.error("❌ contextual-followup API error:", err);
    return NextResponse.json(
      { needs_followup: false, followup_text: "", feedback_text: "" },
      { status: 500 }
    );
  }
}