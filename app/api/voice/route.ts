import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

/**
 * POST /api/voice
 * body: { text: string, lang?: "en"|"fr", voice?: string }
 * -> retourne un MP3 (ou WAV) généré à partir du texte
 */
export async function POST(req: NextRequest) {
  try {
    const { text, lang = "en", voice = "alloy" } = await req.json();

    if (!text || typeof text !== "string") {
      return NextResponse.json({ error: "missing text" }, { status: 400 });
    }

    // 1. Appel OpenAI TTS
    const response = await openai.audio.speech.create({
      model: "gpt-4o-mini-tts",
      voice, // ex: "alloy", "verse", "sage"
      input: text,
    });

    const buffer = Buffer.from(await response.arrayBuffer());

    // 2. Retourner flux audio
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": "audio/mpeg",
        "Content-Length": buffer.length.toString(),
      },
    });
  } catch (e: any) {
    console.error("voice error:", e);
    return NextResponse.json(
      { error: e?.message ?? "server_error" },
      { status: 500 }
    );
  }
}
