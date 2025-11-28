import { NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

export async function GET() {
  try {
    const modelName = process.env.OPENAI_MODEL || "gpt-5";

    // 🔎 On teste avec un prompt minimal
    const completion = await openai.chat.completions.create({
      model: modelName,
      messages: [{ role: "user", content: "Say your model name only." }],
      max_completion_tokens: 20, // ✅ Spécifique aux modèles GPT-5 et o1
    });

    return NextResponse.json({
      ok: true,
      configured: modelName,
      responded: completion.model,
      id: completion.id,
    });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err.message ?? "Unknown error" },
      { status: 500 }
    );
  }
}
