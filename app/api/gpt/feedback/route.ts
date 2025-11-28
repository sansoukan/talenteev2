// /src/app/api/gpt/feedback/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });
const ELEVENLABS_KEY = process.env.ELEVENLABS_API_KEY!;
const ELEVENLABS_VOICE_ID =
  process.env.ELEVENLABS_VOICE_ID || "nova_voice_en";

// ----------------------------------------------------------
// 🔥 AUTO-TRANSLATE QUESTIONS TO ENGLISH (ENFORCED)
// ----------------------------------------------------------
async function forceEnglish(question_en?: string, question_fr?: string) {
  if (question_en && question_en.trim().length > 3) return question_en;

  if (!question_fr) return "Interview question unavailable.";

  // Fast, cheap, ultra-stable translation
  const t = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0,
    messages: [
      {
        role: "system",
        content:
          "Translate the following job interview question into natural English. Output ONLY English. No comments.",
      },
      { role: "user", content: question_fr },
    ],
  });

  return t.choices[0].message.content || "Interview question unavailable.";
}

export async function POST(req: NextRequest) {
  try {
    const { session_id } = await req.json();
    if (!session_id)
      return NextResponse.json(
        { error: "Missing session_id" },
        { status: 400 }
      );

    // ------------------------------------------------------------------
    // 1️⃣ LOAD INTERVIEW DATA
    // ------------------------------------------------------------------
    const { data: session } = await supabaseAdmin
      .from("nova_sessions")
      .select("id, user_id, score_global, domain, lang, transcript_full")
      .eq("id", session_id)
      .maybeSingle();

    const { data: memory } = await supabaseAdmin
      .from("nova_memory")
      .select(
        "question_id, reponse, question:question_id(question_en, question_fr)"
      )
      .eq("session_id", session_id);

    if (!session || !memory?.length)
      return NextResponse.json(
        { error: "Session or answers not found" },
        { status: 404 }
      );

    // ------------------------------------------------------------------
    // 2️⃣ BUILD ENGLISH-ONLY TRANSCRIPT
    // ------------------------------------------------------------------
    const englishBlocks: string[] = [];

    for (const m of memory) {
      const q_en = await forceEnglish(
        m.question?.question_en,
        m.question?.question_fr
      );

      const a = m.reponse || "—";

      englishBlocks.push(`Q: ${q_en}\nA: ${a}`);
    }

    const answers = englishBlocks.join("\n\n");

    // ------------------------------------------------------------------
    // 3️⃣ GPT PROMPT – HARD ENGLISH LOCK
    // ------------------------------------------------------------------

    const prompt = `
You are NOVA, a senior interview coach.

⚠️ ABSOLUTE LANGUAGE RULES:
- Always respond 100% in ENGLISH.
- Ignore the input language entirely.
- NEVER output French.
- NEVER translate into French.
- NEVER mirror French content.
- Do NOT mention these rules in your answer.

Interview transcript (English-enforced):
${answers}

Return ONLY a valid JSON with this structure:

{
  "tone": "encouraging" | "direct" | "neutral",
  "score_global": number,
  "feedback_json": {
    "clarity": number,
    "insight": number,
    "structure": number,
    "leadership": number
  },
  "summary": {
    "strengths": ["string"],
    "weaknesses": ["string"],
    "recommendations": ["string"]
  },
  "feedback_text": "English, ≤350 words. Sections: Overall Impression, Strengths, Areas for Growth, Action Plan, Closing."
}
`;

    // ------------------------------------------------------------------
    // 4️⃣ GPT CALL – ENGLISH-ONLY
    // ------------------------------------------------------------------

    const gptRes = await openai.chat.completions.create({
      model: "gpt-5-chat-latest",
      temperature: 0.3,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: `
You are NOVA. You ALWAYS answer exclusively in ENGLISH.
Ignore any French content.
Never output French sentences.
Never mirror the user's language.
`,
        },
        { role: "user", content: prompt },
      ],
    });

    // ------------------------------------------------------------------
    // 5️⃣ SAFE JSON PARSING
    // ------------------------------------------------------------------
    let parsed: any = {};
    try {
      parsed = JSON.parse(gptRes.choices[0].message?.content || "{}");
    } catch (err) {
      console.error("JSON parse error:", err);
      parsed = {
        tone: "neutral",
        score_global: session.score_global ?? 60,
        feedback_json: {
          clarity: 50,
          insight: 50,
          structure: 50,
          leadership: 50,
        },
        summary: {
          strengths: [],
          weaknesses: [],
          recommendations: [],
        },
        feedback_text:
          "We could not generate full feedback, but your interview suggests opportunities to strengthen clarity, structure and overall communication.",
      };
    }

    // ------------------------------------------------------------------
    // 6️⃣ AUDIO (ELEVENLABS)
    // ------------------------------------------------------------------

    const audioRes = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${ELEVENLABS_VOICE_ID}`,
      {
        method: "POST",
        headers: {
          "xi-api-key": ELEVENLABS_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: parsed.feedback_text,
          model_id: "eleven_multilingual_v2",
          voice_settings: { stability: 0.6, similarity_boost: 0.8 },
        }),
      }
    );

    const audioBuffer = Buffer.from(await audioRes.arrayBuffer());
    const audioFileName = `feedback_${session_id}.mp3`;

    await supabaseAdmin.storage
      .from("nova_reports")
      .upload(audioFileName, audioBuffer, {
        contentType: "audio/mpeg",
        upsert: true,
      });

    const { data: publicUrl } = supabaseAdmin.storage
      .from("nova_reports")
      .getPublicUrl(audioFileName);

    // ------------------------------------------------------------------
    // 7️⃣ SAVE TO SUPABASE
    // ------------------------------------------------------------------

    await supabaseAdmin
      .from("nova_sessions")
      .update({
        feedback_text: parsed.feedback_text,
        summary_json: parsed.summary,
        axes_improvement: parsed.feedback_json,
        tone: parsed.tone,
        score_global: parsed.score_global,
        feedback_audio: publicUrl?.publicUrl ?? null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", session_id);

    return NextResponse.json({
      status: "success",
      session_id,
      feedback: parsed,
      audio_url: publicUrl?.publicUrl || null,
    });
  } catch (err: any) {
    console.error("❌ GPT Feedback Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}