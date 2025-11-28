import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY!;
const ELEVEN_API_KEY = process.env.ELEVENLABS_API_KEY!;
const ELEVEN_MODEL_ID = "eleven_multilingual_v2";

/* 🔥 Voice map multilingue */
const ELEVEN_VOICE_MAP: Record<string, string> = {
  en: process.env.ELEVENLABS_VOICE_EN || "nova_en",
  fr: process.env.ELEVENLABS_VOICE_FR || "nova_fr",
  es: process.env.ELEVENLABS_VOICE_ES || "nova_es",
  it: process.env.ELEVENLABS_VOICE_IT || "nova_it",
  de: process.env.ELEVENLABS_VOICE_DE || "nova_de",
  zh: process.env.ELEVENLABS_VOICE_ZH || "nova_zh",
  ko: process.env.ELEVENLABS_VOICE_KO || "nova_ko",
};

export async function POST(req: NextRequest) {
  try {
    const { session_id, question_id, question_text, answer_text, lang = "en" } =
      await req.json();

    if (!session_id || !question_id || !answer_text) {
      return NextResponse.json(
        { error: "Missing session_id, question_id or answer_text" },
        { status: 400 }
      );
    }

    /* 🔒 Sécurité langue */
    const allowed = ["en", "fr", "es", "it", "de", "zh", "ko"];
    const L = allowed.includes((lang || "en").toLowerCase())
      ? (lang || "en").toLowerCase()
      : "en";

    const voiceId = ELEVEN_VOICE_MAP[L] || ELEVEN_VOICE_MAP["en"];

    /* 1️⃣ FETCH expected answer */
    const { data: qData } = await supabaseAdmin
      .from("nova_questions")
      .select("expected_keywords, expected_answer_en, expected_answer_fr")
      .eq("id", question_id)
      .maybeSingle();

    const expected_keywords = qData?.expected_keywords ?? [];
    const expected_answer =
      L === "fr"
        ? qData?.expected_answer_fr || qData?.expected_answer_en || ""
        : qData?.expected_answer_en || qData?.expected_answer_fr || "";

    /* 2️⃣ Score lexical */
    const lower = answer_text.toLowerCase();
    const matched = expected_keywords.filter((k: string) =>
      lower.includes(k.toLowerCase())
    );
    const lexicalScore = expected_keywords.length
      ? Math.round((matched.length / expected_keywords.length) * 100)
      : 0;

    /* 3️⃣ GPT feedback JSON */
    const prompt = `
You are Nova, a senior interview coach speaking in ${L}.
Return ONLY valid JSON.

Question: "${question_text}"
Expected strong answer: "${expected_answer}"
User answer: "${answer_text}"

JSON:
{
  "clarity": number,
  "structure": number,
  "relevance": number,
  "comment": "feedback in ${L}"
}`;
    const gptRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-5-chat-latest",
        temperature: 0.2,
        messages: [
          { role: "system", content: "Return pure JSON only." },
          { role: "user", content: prompt },
        ],
      }),
    });

    const raw = await gptRes.json();
    const rawText = raw?.choices?.[0]?.message?.content || "{}";

    let parsed: any = {};
    try {
      parsed = JSON.parse(rawText.replace(/```json|```/g, "").trim());
    } catch {
      parsed = {
        clarity: 60,
        structure: 60,
        relevance: 60,
        comment:
          L === "fr"
            ? "Réponse correcte mais améliorable."
            : "A decent answer but can be improved.",
      };
    }

    /* 4️⃣ Score final */
    const score_auto = Math.round(
      lexicalScore * 0.3 +
        parsed.clarity * 0.3 +
        parsed.structure * 0.2 +
        parsed.relevance * 0.2
    );

    const feedback_json = {
      clarity: parsed.clarity / 100,
      structure: parsed.structure / 100,
      relevance: parsed.relevance / 100,
      lexical: lexicalScore / 100,
      comment: parsed.comment,
    };

    /* 5️⃣ TTS ElevenLabs */
    const ttsRes = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
      {
        method: "POST",
        headers: {
          "xi-api-key": ELEVEN_API_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: parsed.comment,
          model_id: ELEVEN_MODEL_ID,
          voice_settings: {
            stability: 0.45,
            similarity_boost: 0.7,
          },
        }),
      }
    );

    const audioBuffer = Buffer.from(await ttsRes.arrayBuffer());
    const audio_base64 = audioBuffer.toString("base64");

    /* 6️⃣ Save in memory */
    await supabaseAdmin
      .from("nova_memory")
      .update({
        score_auto,
        feedback_json,
        feedback_text: parsed.comment,
        feedback_audio: audio_base64,
        updated_at: new Date().toISOString(),
      })
      .eq("session_id", session_id)
      .eq("question_id", question_id);

    /* 7️⃣ Return to NovaEngine */
    return NextResponse.json({
      ok: true,
      score_auto,
      feedback_json,
      feedback_text: parsed.comment,
      audio_base64,
    });
  } catch (e: any) {
    console.error("❌ feedback-question error:", e);
    return NextResponse.json(
      { error: e.message || "Server error" },
      { status: 500 }
    );
  }
}