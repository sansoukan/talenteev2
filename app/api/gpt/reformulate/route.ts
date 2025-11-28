import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

/**
 * /api/gpt/reformulate
 * ---------------------
 * Reformule une question dans la même langue (FR/EN)
 * - détecte la langue du prompt
 * - renvoie une version plus simple, claire et fluide
 * - utilisé par NovaEngineV2.handleClarify()
 */
export async function POST(req: NextRequest) {
  try {
    const { prompt } = await req.json();
    if (!prompt || typeof prompt !== "string") {
      return NextResponse.json(
        { error: "Missing or invalid prompt" },
        { status: 400 }
      );
    }

    // 🧠 Prompt système bilingue
    const systemPrompt = `
Tu es Nova, une coach d'entretien bilingue.
Ta tâche est de reformuler la question donnée avec clarté, sans en changer le sens.
- Si la question est en français, reformule-la en français.
- Si elle est en anglais, reformule-la en anglais.
- Garde un ton professionnel et naturel.
- Ne réponds PAS à la question.
- Ne fais qu'une phrase, directe, claire.
`;

    // ⚙️ Appel OpenAI
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.4,
      max_tokens: 100,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: prompt },
      ],
    });

    const text =
      completion.choices?.[0]?.message?.content?.trim() ||
      "Je reformule la question pour la rendre plus claire.";

    return NextResponse.json({ text });
  } catch (err: any) {
    console.error("❌ GPT Reformulate API error:", err);
    return NextResponse.json(
      {
        error: err?.message ?? "Server error while reformulating question",
        text: "Could you please rephrase the question more clearly?",
      },
      { status: 500 }
    );
  }
}