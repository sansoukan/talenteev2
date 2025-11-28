import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { SESSION_FEEDBACK_PROMPT } from "@/lib/prompts/prompt_feedback_session";

// ENV VARS
const OPENAI_API_KEY = process.env.OPENAI_API_KEY!;
const ELEVEN_API_KEY = process.env.ELEVENLABS_API_KEY!;

// 🌍 MULTILINGUAL VOICE MAPPING
const VOICE_MAP: Record<string, string> = {
  en: process.env.ELEVENLABS_VOICE_EN || "nova_voice_en",
  fr: process.env.ELEVENLABS_VOICE_FR || "nova_voice_fr",
  es: process.env.ELEVENLABS_VOICE_ES || "nova_voice_es",
  it: process.env.ELEVENLABS_VOICE_IT || "nova_voice_it",
  de: process.env.ELEVENLABS_VOICE_DE || "nova_voice_de",
  zh: process.env.ELEVENLABS_VOICE_ZH || "nova_voice_zh",
  ko: process.env.ELEVENLABS_VOICE_KO || "nova_voice_ko",
};

const ELEVEN_MODEL_ID = "eleven_multilingual_v2";
const OPENAI_URL = "https://api.openai.com/v1/chat/completions";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { session_id, lang = "en" } = body || {};

    if (!session_id) {
      return NextResponse.json(
        { ok: false, error: "Missing session_id" },
        { status: 400 }
      );
    }

    /* -------------------------------
       🔒 LANGUAGE SAFETY
    --------------------------------*/
    const allowed = ["en", "fr", "es", "it", "de", "zh", "ko"];
    const L = allowed.includes((lang || "en").toLowerCase())
      ? (lang || "en").toLowerCase()
      : "en";

    const voice_id = VOICE_MAP[L] || VOICE_MAP["en"];

    /* -----------------------------------------
     * 1️⃣ Fetch SESSION
     * ----------------------------------------- */
    const { data: session } = await supabaseAdmin
      .from("nova_sessions")
      .select(`
        id,
        user_id,
        domain,
        sub_domain,
        score_global,
        axes_improvement,
        summary_json,
        match_score,
        type_entretien,
        career_target,
        segment,
        total_questions,
        duration,
        duration_target,
        is_premium,
        speaking_time_total,
        silence_time_total,
        emotion_summary,
        posture_summary,
        transcript_full,
        session_replay_manifest
      `)
      .eq("id", session_id)
      .maybeSingle();

    if (!session) throw new Error("Session not found");

    /* -----------------------------------------
     * 2️⃣ Fetch PROFILE
     * ----------------------------------------- */
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("prenom, career_stage")
      .eq("id", session.user_id)
      .maybeSingle();

    /* -----------------------------------------
     * 3️⃣ Fetch MEMORY
     * ----------------------------------------- */
    const { data: memory } = await supabaseAdmin
      .from("nova_memory")
      .select(`
        question_id,
        reponse,
        theme,
        score,
        clarity_summary,
        ai_feedback,
        ai_score,
        ai_scores_detail,
        improvement_score,
        tag,
        lang,
        latency_before_answer,
        speaking_speed_wpm,
        hesitations_count,
        stress_score,
        confidence_score,
        eye_contact_score,
        posture_score,
        transcript_clean,
        tags_detected,
        ideal_answer_distance,
        created_at
      `)
      .eq("session_id", session_id);

    /* -----------------------------------------
     * 4️⃣ Optional CV Summary
     * ----------------------------------------- */
    const { data: cvData } = await supabaseAdmin
      .from("nova_analysis")
      .select("result_text")
      .eq("user_id", session.user_id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const cv_summary = cvData?.result_text || "";

    /* -----------------------------------------
     * 5️⃣ GPT PAYLOAD
     * ----------------------------------------- */
    const gptPayload = {
      model: "gpt-5-chat-latest",
      messages: [
        { role: "system", content: SESSION_FEEDBACK_PROMPT },
        {
          role: "user",
          content: JSON.stringify({
            language: L,
            user_firstname: profile?.prenom,
            career_stage: profile?.career_stage,
            domain: session.domain,
            sub_domain: session.sub_domain,
            cv_summary,
            memory_detailed: memory,
            transcript_full: session.transcript_full || "",
            match_score: session.match_score,
            segment: session.segment,
            total_questions: session.total_questions,
            duration: session.duration,
            session_score: session.score_global,
            session_axes: session.axes_improvement,
            speaking_time_total: session.speaking_time_total,
            silence_time_total: session.silence_time_total,
            emotion_summary: session.emotion_summary,
            posture_summary: session.posture_summary,
          }),
        },
      ],
      temperature: 0.3,
      max_tokens: 2000,
    };

    /* -----------------------------------------
     * 6️⃣ GPT CALL
     * ----------------------------------------- */
    const gptRes = await fetch(OPENAI_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(gptPayload),
    });

    const gptJson = await gptRes.json();

    let feedback = {};
    try {
      feedback = JSON.parse(
        gptJson.choices[0].message.content.replace(/```json|```/g, "").trim()
      );
    } catch {
      throw new Error("Invalid GPT JSON in feedback");
    }

    const audioScript = feedback.audio_script;

    /* -----------------------------------------
     * 7️⃣ ElevenLabs TTS
     * ----------------------------------------- */
    const audioRes = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voice_id}`,
      {
        method: "POST",
        headers: {
          "xi-api-key": ELEVENLABS_API_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: audioScript,
          model_id: ELEVEN_MODEL_ID,
        }),
      }
    );

    const audioBuffer = Buffer.from(await audioRes.arrayBuffer());
    const audio_base64 = audioBuffer.toString("base64");

    /* -----------------------------------------
     * 8️⃣ SAVE IN DB
     * ----------------------------------------- */
    await supabaseAdmin
      .from("nova_sessions")
      .update({
        final_feedback_text: feedback.final_text,
        final_feedback_audio: audio_base64,
        final_feedback_summary: feedback.summary,
        final_feedback_axes: feedback.axes,
      })
      .eq("id", session_id);

    /* -----------------------------------------
     * 9️⃣ RETURN to NovaEngine
     * ----------------------------------------- */
    return NextResponse.json({
      ok: true,
      final_text: feedback.final_text,
      final_summary: feedback.summary,
      axes: feedback.axes,
      audio_base64,
      audio_script: audioScript,
    });
  } catch (err: any) {
    console.error("SESSION FEEDBACK ERROR:", err);
    return NextResponse.json(
      { ok: false, error: err.message || "Feedback generation failed" },
      { status: 500 }
    );
  }
}