import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";

const OPENAI_KEY = process.env.OPENAI_API_KEY;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!OPENAI_KEY) console.error("❌ Missing OPENAI_API_KEY in environment.");

const openai = new OpenAI({ apiKey: OPENAI_KEY });
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

export async function POST(req: NextRequest) {
  try {
    const { question, user_id } = await req.json();

    if (!question || !user_id)
      return NextResponse.json({ answer: "⚠️ Missing question or user ID." }, { status: 400 });

    // --- Vérif quota journalière ---
    const { count } = await supabase
      .from("nova_ask_logs")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user_id)
      .gte("created_at", new Date(new Date().setHours(0, 0, 0, 0)).toISOString());

    if ((count ?? 0) >= 10)
      return NextResponse.json(
        { answer: "⚠️ You reached your daily limit (10 questions)." },
        { status: 403 }
      );

    // --- Vérif modération ---
    const moderation = await openai.moderations.create({
      model: "omni-moderation-latest",
      input: question,
    });
    if (moderation.results[0].flagged) {
      return NextResponse.json({
        answer:
          "⚠️ Your question was flagged as inappropriate. Nova only answers professional topics.",
      });
    }

    // --- Appel GPT avec sécurité + timeout ---
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000); // 12s timeout

    let answer: string;
    try {
      const chat = await openai.chat.completions.create(
        {
          model: "gpt-4o-mini",
          messages: [
            {
              role: "system",
              content: `You are Nova, a professional career coach. Answer only career-related questions.`,
            },
            { role: "user", content: question },
          ],
          max_tokens: 300,
        },
        { signal: controller.signal }
      );
      answer = chat.choices[0].message?.content?.trim() || "…";
    } catch (gptError: any) {
      console.error("⚠️ OpenAI connection failed:", gptError.message);
      answer =
        "⚠️ Nova is temporarily unavailable (connection error). Please try again in a few minutes.";
    } finally {
      clearTimeout(timeout);
    }

    // --- Log ---
    await supabase.from("nova_ask_logs").insert({ user_id, question });

    return NextResponse.json({ answer });
  } catch (e: any) {
    console.error("AskNova API error:", e);
    return NextResponse.json(
      { answer: "⚠️ Unexpected server error while contacting Nova." },
      { status: 500 }
    );
  }
}
