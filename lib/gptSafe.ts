// src/lib/gptSafe.ts
//------------------------------------------------------
// 🔒 GPT-SAFE for Nova PDF Engine
// - GPT-5-chat-fast
// - Never crashes PDF
// - Always returns valid JSON or {}
//------------------------------------------------------

import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

function extractJSON(text: string): any {
  try {
    if (!text) return {};

    let clean = text.replace(/```json/gi, "")
                    .replace(/```/g, "")
                    .trim();

    const start = clean.indexOf("{");
    const end = clean.lastIndexOf("}");

    if (start === -1 || end === -1) return {};

    return JSON.parse(clean.slice(start, end + 1));
  } catch {
    return {};
  }
}

export async function gptSafe(prompt: string): Promise<any> {
  try {
    const r = await client.chat.completions.create({
      model: "gpt-5-chat-fast",
      temperature: 0,
      max_tokens: 2000,
      messages: [
        {
          role: "system",
          content:
            "Return ONLY valid JSON. No commentary. No markdown. No ```.",
        },
        { role: "user", content: prompt },
      ],
    });

    const raw = r.choices?.[0]?.message?.content || "";
    return extractJSON(raw);
  } catch (err) {
    console.error("❌ GPT SAFE ERROR:", err);
    return {};
  }
}
