import { NextRequest, NextResponse } from "next/server";

/**
 * /api/voice/elevenlabs
 * ---------------------
 * Génère la voix Nova (voix ElevenLabs) pour la relance ou la clôture.
 * Input: { text: string, lang?: "en" | "fr" }
 * Output: Audio Buffer (MP3)
 */

const ELEVEN_API_KEY = process.env.ELEVEN_API_KEY!;
const VOICE_ID_EN = "EXAVITQu4vr4xnSDxMaL"; // voix Nova anglaise
const VOICE_ID_FR = "TxGEqnHWrfWFTfGW9XjX"; // voix Nova française

export async function POST(req: NextRequest) {
  try {
    const { text, lang = "en" } = await req.json();
    if (!text) {
      return NextResponse.json({ error: "Missing text" }, { status: 400 });
    }

    const voiceId = lang.toLowerCase().startsWith("fr")
      ? VOICE_ID_FR
      : VOICE_ID_EN;

    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "xi-api-key": ELEVEN_API_KEY,
        },
        body: JSON.stringify({
          text,
          model_id: "eleven_turbo_v2", // voix naturelle & rapide
          voice_settings: {
            stability: 0.45,
            similarity_boost: 0.75,
          },
        }),
      }
    );

    if (!response.ok) {
      const err = await response.text();
      console.error("❌ ElevenLabs error:", err);
      return NextResponse.json({ error: "TTS failed" }, { status: 500 });
    }

    const audioBuffer = await response.arrayBuffer();

    return new NextResponse(Buffer.from(audioBuffer), {
      headers: {
        "Content-Type": "audio/mpeg",
        "Content-Disposition": "inline; filename=voice.mp3",
      },
    });
  } catch (err: any) {
    console.error("❌ ElevenLabs route error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}