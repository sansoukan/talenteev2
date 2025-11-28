import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import OpenAI from "openai";
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

export async function POST(req: NextRequest) {
  try {
    const { session_id } = await req.json();
    if (!session_id)
      return NextResponse.json({ error: "Missing session_id" }, { status: 400 });

    const { data: emotions } = await supabaseAdmin
      .from("nova_emotions")
      .select("eye_contact,posture_score,hesitations,words_per_min,confidence,stress")
      .eq("session_id", session_id);

    if (!emotions?.length)
      return NextResponse.json({ error: "No emotions" }, { status: 404 });

    const avg = (f: string) =>
      emotions.map((e) => Number(e[f] || 0)).reduce((a, b) => a + b, 0) / emotions.length;

    const metrics = {
      eye_contact: avg("eye_contact"),
      posture: avg("posture_score"),
      hesitations: avg("hesitations"),
      wpm: avg("words_per_min"),
      confidence: avg("confidence"),
      stress: avg("stress"),
    };

    const prompt = `
You are Nova, a behavioral analyst.
Given these numeric signals, describe the candidate’s behavior (≤5 sentences):
${JSON.stringify(metrics)}
Return JSON {behavior_comment, tone}`;
    const gpt = await openai.chat.completions.create({
      model: "gpt-5-chat-latest",
      temperature: 0.3,
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
    });
    const parsed = JSON.parse(gpt.choices[0].message?.content || "{}");

    await supabaseAdmin
      .from("nova_sessions")
      .update({ behavioral_feedback: parsed.behavior_comment })
      .eq("id", session_id);

    return NextResponse.json(parsed);
  } catch (err: any) {
    console.error("❌ feedback-behavior error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
