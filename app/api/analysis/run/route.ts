// 🚀 Nova Deep Analysis Engine — GPT-5-chat-fast → nova_pdf_analysis
// File: src/app/api/analysis/run/route.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(req: NextRequest) {
  try {
    const { sessionId } = await req.json();
    if (!sessionId) {
      return NextResponse.json({ error: "Missing sessionId" }, { status: 400 });
    }

    // 1) LOAD SESSION + MEMORY
    const { data: session } = await supabaseAdmin
      .from("nova_sessions")
      .select("id, transcript_full, lang")
      .eq("id", sessionId)
      .maybeSingle();

    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    const { data: memory } = await supabaseAdmin
      .from("nova_memory")
      .select("question_id, answer_first, answer_second, feedback, scoring_axes, created_at")
      .eq("session_id", sessionId)
      .order("created_at", { ascending: true });

    // 2) BUILD GPT PROMPT
    const gptInput = {
      sessionId,
      transcript: session.transcript_full || "",
      answers: memory || [],
    };

    const systemPrompt = `
You are Nova Deep Analysis Engine — a world-class behavioural, performance and communication analyst.

IMPORTANT:
- ALWAYS answer in English only.
- Output MUST be valid JSON. 
- No explanations. No commentary. No markdown.

Analyze the candidate on:
1) Persona type (Leader, Analytical, Storyteller, Executor, Adaptive)
2) Strengths (8 bullet points)
3) Risks (8 bullet points)
4) Stress curve minute-by-minute (array: [{ t, stress }])
5) Confidence curve minute-by-minute (array: [{ t, confidence }])
6) Improved pitch (20-second and 45-second variants)
7) Micro-habits to install (10 items)
8) Three scores from 0–100: clarity, depth, alignment
9) Final English summary (max 80 words)

`;
    const userPrompt = `
SESSION RAW DATA:
${JSON.stringify(gptInput, null, 2)}

Return JSON EXACTLY in this format:
{
  "persona_type": "",
  "strengths": [],
  "risks": [],
  "stress_curve": [],
  "confidence_curve": [],
  "improved_pitch": { "pitch20": "", "pitch45": "" },
  "micro_habits": [],
  "clarity": 0,
  "depth": 0,
  "alignment": 0,
  "summary": ""
}
`;

    // 3) CALL GPT
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "Missing OPENAI_API_KEY" }, { status: 500 });
    }

    const gptRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-5-chat-fast",
        temperature: 0.2,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    const gptJson = await gptRes.json();

    if (!gptJson?.choices?.[0]?.message?.content) {
      return NextResponse.json({ error: "GPT returned empty response" }, { status: 500 });
    }

    const analysis = JSON.parse(gptJson.choices[0].message.content);

    // 4) UPSERT INTO nova_pdf_analysis
    await supabaseAdmin.from("nova_pdf_analysis").upsert({
      session_id: sessionId,
      analysis_json: analysis,
      created_at: new Date().toISOString(),
    });

    return NextResponse.json({ ok: true, analysis });
  } catch (err: any) {
    console.error("❌ /api/analysis/run error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
