import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

const ELEVEN_API_KEY = process.env.ELEVENLABS_API_KEY!;
const ELEVEN_VOICES: Record<string, string> = {
  en: "nova_en",
  fr: "nova_fr",
  es: "nova_es",
  it: "nova_it",
  de: "nova_de",
  zh: "nova_zh",
  ko: "nova_ko",
};

export async function POST(req: NextRequest) {
  try {
    const { session_id, question_id, feedback_text, lang } = await req.json();

    if (!session_id || !question_id || !feedback_text || !lang) {
      return NextResponse.json(
        { ok: false, error: "Missing session_id, question_id, feedback_text or lang" },
        { status: 400 }
      );
    }

    // 1️⃣ Vérifier cache
    const { data: existing } = await supabaseAdmin
      .from("nova_feedback_audio")
      .select("audio_url")
      .eq("question_id", question_id)
      .eq("lang", lang)
      .maybeSingle();

    if (existing?.audio_url) {
      return NextResponse.json({
        ok: true,
        cached: true,
        audio_url: existing.audio_url,
      });
    }

    // 2️⃣ Génération ElevenLabs
    const voiceId = ELEVEN_VOICES[lang] ?? ELEVEN_VOICES["en"];

    const ttsRes = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
      {
        method: "POST",
        headers: {
          "xi-api-key": ELEVEN_API_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: feedback_text,
          model_id: "eleven_multilingual_v2",
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.8,
          },
        }),
      }
    );

    if (!ttsRes.ok) {
      const err = await ttsRes.text();
      console.error("❌ ElevenLabs error:", err);
      return NextResponse.json({ ok: false, error: "TTS failed" }, { status: 500 });
    }

    const audioBuffer = Buffer.from(await ttsRes.arrayBuffer());

    // 3️⃣ Upload Storage
    const path = `${question_id}/${lang}.mp3`;

    const { error: uploadError } = await supabaseAdmin.storage
      .from("nova-audio-feedback")
      .upload(path, audioBuffer, {
        upsert: true,
        contentType: "audio/mpeg",
      });

    if (uploadError) {
      console.error("❌ Upload error:", uploadError);
      return NextResponse.json({ ok: false, error: "Upload failed" }, { status: 500 });
    }

    const { data: publicUrl } = supabaseAdmin.storage
      .from("nova-audio-feedback")
      .getPublicUrl(path);

    const audio_url = publicUrl.publicUrl;

    // 4️⃣ Enregistrer en base
    await supabaseAdmin.from("nova_feedback_audio").insert({
      question_id,
      lang,
      audio_url,
    });

    return NextResponse.json({
      ok: true,
      cached: false,
      audio_url,
    });
  } catch (err: any) {
    console.error("❌ audio-feedback error:", err);
    return NextResponse.json(
      { ok: false, error: err.message || "Server error" },
      { status: 500 }
    );
  }
}