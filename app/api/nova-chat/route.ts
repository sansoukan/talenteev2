import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

/**
 * ======================================================
 *  🧠 Nova Chat — Secure Coaching Context
 * ------------------------------------------------------
 *  ⚙️ Limite les réponses au domaine RH / coaching d’entretien.
 *  ⚙️ Refuse poliment toute question hors sujet.
 *  ⚙️ Multilingue auto (FR/EN/ES).
 * ======================================================
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY || "";
const MODEL = process.env.NOVA_GPT_MODEL || "gpt-5-chat-latest";

export async function POST(req: NextRequest) {
  try {
    if (!OPENAI_API_KEY) {
      console.error("❌ Missing OPENAI_API_KEY");
      return NextResponse.json(
        { reply: "Server configuration error (missing API key)." },
        { status: 500 }
      );
    }

    const { userMessage, lastQuestion } = await req.json();
    if (!userMessage?.trim()) {
      return NextResponse.json({ reply: "I didn’t catch that." }, { status: 200 });
    }

    const client = new OpenAI({ apiKey: OPENAI_API_KEY });

    // 🔹 Contexte Nova RH sécurisé
    const systemPrompt = `
You are Nova, an AI interview and career coach.
You ONLY answer questions or engage in discussions related to:
- job interviews, career coaching, behavioral questions, personal presentation,
- analysis of answers, communication skills, performance evaluation,
- HR methods (like STAR, 7s, feedback, posture, etc.),
- preparation for a role, reflection on a position, or coaching methodology.

If a user asks something unrelated (like politics, science, personal advice, or jokes),
you must politely refuse and say something like:
"I can only help with interviews, career preparation, and coaching topics."

Always respond concisely, professionally, and in the same language as the user.
Never write long essays or stray from the interview/coaching theme.
`;

    const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
      { role: "system", content: systemPrompt },
    ];

    if (lastQuestion) {
      messages.push({
        role: "user",
        content: `Previous question by Nova: ${lastQuestion}`,
      });
    }

    messages.push({
      role: "user",
      content: userMessage,
    });

    const completion = await client.chat.completions.create({
      model: MODEL,
      messages,
      temperature: 0.4,
      max_tokens: 250,
    });

    const reply =
      completion.choices?.[0]?.message?.content?.trim() ||
      "I'm here to help you with interview preparation.";

    console.log("🧠 NovaChat secure reply →", reply);

    return NextResponse.json({ reply }, { status: 200 });
  } catch (e: any) {
    console.error("❌ /app/nova-chat error:", e?.message || e);
    return NextResponse.json(
      { reply: "Sorry, something went wrong processing your message." },
      { status: 500 }
    );
  }
}
