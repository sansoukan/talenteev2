import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

/**
 * Nova Speak — ElevenLabs uniquement (TTS)
 * -----------------------------------------
 * Input:  { prompt: string, lang?: "en"|"fr" }
 * Output: audio/mpeg (voix Nova)
 */
export async function POST(req: NextRequest) {
  try {
    const { prompt, lang = "en" } = await req.json();
    if (!prompt) {
      return NextResponse.json({ error: "Missing prompt" }, { status: 400 });
    }

    /* ======================================================
       🔊 Génération audio directe ElevenLabs
       ====================================================== */
    const elevenApi = process.env.ELEVENLABS_API_KEY;
    if (!elevenApi) throw new Error("Missing ELEVENLABS_API_KEY");

    const voiceId =
      lang === "fr"
        ? process.env.ELEVENLABS_VOICE_ID_FR || "EXAVITQu4vr4xnSDxMaL"
        : process.env.ELEVENLABS_VOICE_ID_EN || "21m00Tcm4TlvDq8ikWAM";

    const ttsResp = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
      {
        method: "POST",
        headers: {
          "xi-api-key": elevenApi,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: prompt, // 🧠 on lit directement le texte reçu
          model_id: "eleven_multilingual_v2",
          voice_settings: { stability: 0.45, similarity_boost: 0.85 },
        }),
      }
    );

    if (!ttsResp.ok) {
      const errorText = await ttsResp.text();
      console.error("❌ ElevenLabs TTS error:", errorText);
      throw new Error("TTS request failed");
    }

    const audioBuffer = await ttsResp.arrayBuffer();

    /* ======================================================
       ✅ Retourne uniquement l'audio (pas de GPT)
       ====================================================== */
    return new NextResponse(Buffer.from(audioBuffer), {
      status: 200,
      headers: {
        "Content-Type": "audio/mpeg",
        "Content-Disposition": 'inline; filename="nova_speak.mp3"',
        // renvoie le texte original pour affichage facultatif
        "x-nova-text": encodeURIComponent(prompt),
      },
    });
  } catch (err: any) {
    console.error("❌ Nova Speak error:", err);
    return NextResponse.json(
      { error: err.message || "Server error" },
      { status: 500 }
    );
  }
}
