import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

export const runtime = "nodejs";

/**
 * ======================================================
 *  🗣️ Nova TTS API — Unified (OpenAI + ElevenLabs)
 * ------------------------------------------------------
 *  POST  { text: string, lang?: "en"|"fr", provider?: "openai"|"elevenlabs" }
 *  Returns: audio/mpeg (stream)
 * ======================================================
 */

const memoryCache = new Map<string, Buffer>();

export async function POST(req: NextRequest) {
  try {
    const { text, lang = "en", provider = "openai" } = await req.json();

    if (!text || typeof text !== "string") {
      return NextResponse.json({ error: "Missing text" }, { status: 400 });
    }

    // 🧩 Cache (clé SHA1 sur le texte + provider + langue)
    const cacheKey = crypto
      .createHash("sha1")
      .update(`${provider}-${lang}-${text.trim()}`)
      .digest("hex");

    if (memoryCache.has(cacheKey)) {
      console.log("⚡ TTS cache hit:", provider, lang);
      const cached = memoryCache.get(cacheKey)!;
      return new NextResponse(cached, {
        status: 200,
        headers: {
          "Content-Type": "audio/mpeg",
          "Cache-Control": "max-age=3600",
        },
      });
    }

    let audioBuffer: ArrayBuffer | null = null;

    /* ======================================================
       🔹 OPTION 1 — OpenAI TTS
       ====================================================== */
    if (provider === "openai") {
      const apiKey = process.env.OPENAI_API_KEY;
      if (!apiKey)
        return NextResponse.json(
          { error: "OPENAI_API_KEY not configured" },
          { status: 500 }
        );

      const voice = "alloy"; // multilingue naturel
      const model = "gpt-4o-mini-tts";

      const resp = await fetch("https://api.openai.com/v1/audio/speech", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          voice,
          input: text,
          format: "mp3",
        }),
      });

      if (!resp.ok) {
        const errText = await resp.text();
        throw new Error(`OpenAI TTS failed (${resp.status}) → ${errText}`);
      }

      audioBuffer = await resp.arrayBuffer();
    }

    /* ======================================================
       🔹 OPTION 2 — ElevenLabs TTS
       ====================================================== */
    else if (provider === "elevenlabs") {
      const apiKey = process.env.ELEVENLABS_API_KEY;
      if (!apiKey)
        return NextResponse.json(
          { error: "ELEVENLABS_API_KEY not configured" },
          { status: 500 }
        );

      const voiceId =
        lang === "fr"
          ? process.env.ELEVENLABS_VOICE_ID_FR ||
            "EXAVITQu4vr4xnSDxMaL" // voix FR féminine
          : process.env.ELEVENLABS_VOICE_ID_EN ||
            "21m00Tcm4TlvDq8ikWAM"; // voix EN féminine

      const resp = await fetch(
        `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
        {
          method: "POST",
          headers: {
            "xi-api-key": apiKey,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            text,
            model_id: "eleven_multilingual_v2",
            voice_settings: { stability: 0.4, similarity_boost: 0.9 },
          }),
        }
      );

      if (!resp.ok) {
        const errText = await resp.text();
        throw new Error(`ElevenLabs TTS failed (${resp.status}) → ${errText}`);
      }

      audioBuffer = await resp.arrayBuffer();
    }

    /* ======================================================
       ✅ Réponse audio + mise en cache
       ====================================================== */
    if (!audioBuffer) {
      return NextResponse.json(
        { error: "Empty audio response" },
        { status: 500 }
      );
    }

    const buf = Buffer.from(audioBuffer);
    memoryCache.set(cacheKey, buf);
    if (memoryCache.size > 100) {
      // simple GC
      const firstKey = memoryCache.keys().next().value;
      memoryCache.delete(firstKey);
    }

    return new NextResponse(buf, {
      status: 200,
      headers: {
        "Content-Type": "audio/mpeg",
        "Content-Disposition": `inline; filename="nova_tts.mp3"`,
        "Cache-Control": "max-age=3600, must-revalidate",
      },
    });
  } catch (err: any) {
    console.error("❌ Nova TTS error:", err);
    return NextResponse.json(
      { error: err?.message ?? "Server error" },
      { status: 500 }
    );
  }
}