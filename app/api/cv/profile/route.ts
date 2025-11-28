import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

export async function POST(req: NextRequest) {
  try {
    const { user_id, cv_text } = await req.json();
    if (!user_id || !cv_text)
      return NextResponse.json({ error: "Missing user_id or cv_text" }, { status: 400 });

    const prompt = `
You are Nova AI, a recruiter. Read the following CV and return clean JSON:
{
  "parsed_name": "string",
  "parsed_title": "string",
  "languages": ["English", "French"],
  "skills": ["leadership", "sales"],
  "experiences": [{"title": "Manager", "company": "XYZ", "years": 3}],
  "tags": ["sales", "management"],
  "seniority": "mid",
  "domain_focus": "sales"
}
CV:
${cv_text}
`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.2,
      messages: [{ role: "system", content: prompt }],
      max_tokens: 1000,
    });

    const output = completion.choices[0]?.message?.content ?? "{}";
    let parsed;
    try {
      parsed = JSON.parse(output);
    } catch {
      parsed = { domain_focus: "general", tags: ["interview"] };
    }

    await supabaseAdmin
      .from("nova_cv_profiles")
      .upsert({
        user_id,
        ...parsed,
        last_updated_at: new Date().toISOString(),
      })
      .eq("user_id", user_id);

    return NextResponse.json({ ok: true, profile: parsed });
  } catch (err: any) {
    console.error("❌ CV Profile Error:", err);
    return NextResponse.json({ error: err.message ?? "Server error" }, { status: 500 });
  }
}