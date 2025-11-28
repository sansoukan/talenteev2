// /src/app/api/chat/route.ts
import { NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

/**
 * Nova Text Chat — contextual endpoint
 * ------------------------------------
 * Reçoit le message utilisateur et la dernière question posée par Nova.
 * GPT voit les deux, ce qui lui permet de comprendre le contexte :
 *  → "je n’ai pas compris" → reformulation de la dernière question
 *  → "peux-tu préciser ?" → relance ciblée
 */
export async function POST(req: Request) {
  try {
    const { message, lastQuestion } = await req.json();

    if (!message || message.trim().length === 0) {
      return NextResponse.json(
        { reply: "I didn’t quite catch that — could you repeat?" },
        { status: 200 }
      );
    }

    // 🧠 Prompt contextuel
    const systemPrompt = `
You are Nova, a friendly, warm, and professional AI interviewer.
The last interview question was: "${lastQuestion || "unknown"}".
The user said: "${message}".
If the user didn't understand, repeat or rephrase the last question clearly.
If the user asks something else, answer briefly but stay in the interview context.
Keep your tone calm, encouraging, and natural.
    `;

    const completion = await openai.chat.completions.create({
      model: "gpt-5-chat-latest",
      temperature: 0.7,
      max_tokens: 120,
      messages: [
        {
          role: "system",
          content: systemPrompt.trim(),
        },
        {
          role: "user",
          content: message,
        },
      ],
    });

    const reply =
      completion.choices?.[0]?.message?.content ||
      "I'm here and listening — please continue.";

    return NextResponse.json({ reply });
  } catch (err: any) {
    console.error("❌ Nova Chat API error:", err);
    return NextResponse.json(
      { reply: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
