import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";
import { validateCV } from "@/lib/validateCV";
import { franc } from "franc";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const greetings: Record<string, string> = {
  eng: "Hello",
  fra: "Bonjour",
  spa: "Hola",
  deu: "Hallo",
  ara: "مرحبا",
};

function extractFirstName(cvText: string): string | null {
  const firstLine = cvText.split("\n")[0] || cvText.split(" ")[0];
  const parts = firstLine.trim().split(/\s+/);
  if (parts.length > 0) {
    const candidate = parts[0].trim();
    if (candidate && /^[A-Za-zÀ-ÖØ-öø-ÿ]+$/.test(candidate)) {
      return candidate.length < 30 ? candidate : null;
    }
  }
  return null;
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const id = setTimeout(() => reject(new Error("⏱️ OpenAI request timeout")), ms);
    promise
      .then((res) => {
        clearTimeout(id);
        resolve(res);
      })
      .catch((err) => {
        clearTimeout(id);
        reject(err);
      });
  });
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const user_id = formData.get("user_id") as string | null;
    const offer = (formData.get("offer") as string) || null;

    if (!file)
      return NextResponse.json({ ok: false, error: "⚠️ No file uploaded" }, { status: 400 });
    if (file.size > 5 * 1024 * 1024)
      return NextResponse.json({ ok: false, error: "⚠️ File too large (max 5MB)" }, { status: 400 });

    const validation = await validateCV(file);
    if (!validation.ok)
      return NextResponse.json({ ok: false, error: validation.error }, { status: 400 });

    const cleanedText = validation.text.replace(/[^\x09\x0A\x0D\x20-\x7EÀ-ÿ]/g, "");
    const safeText = cleanedText.slice(0, 3000);

    const firstName = extractFirstName(safeText);
    const cleanFirstName = firstName && firstName.length < 30 ? firstName : "";
    let langCode = franc(safeText);
    if (langCode === "und" || !greetings[langCode]) langCode = "eng";
    const greeting = greetings[langCode] || "Hello";

    // 🔹 Première étape : feedback complet RH
    const feedbackPrompt = `
You are Nova, an experienced HR Director and recruiter.
Provide a detailed, constructive CV analysis for the candidate below.
Follow the same structure and tone as before.
Start with "${greeting} ${cleanFirstName},".
`;

    const feedbackCompletion = await withTimeout(
      openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: feedbackPrompt },
          {
            role: "user",
            content: `Candidate first name: ${cleanFirstName}\n\nCandidate CV:\n${safeText}\n\nJob Offer:\n${offer ?? "Not provided"}`,
          },
        ],
        max_tokens: 1800,
      }),
      60000
    );
    const feedback = (feedbackCompletion as any).choices[0]?.message?.content ?? "";

    // 🔹 Deuxième étape : extraction de profil structuré
    const structurePrompt = `
Extract a structured JSON summary of this CV with the following keys:
{
  "domain_focus": string,        // main field: "product", "finance", "tech", "marketing", etc.
  "seniority": string,           // "junior", "mid", "senior", "exec"
  "parsed_title": string,        // most recent title
  "skills": string[],            // list of 8–15 key skills
  "tags": string[],              // general tags (strategy, leadership, analysis, etc.)
  "languages": string[],         // detected languages
  "experiences": [ { "title": string, "company": string, "years": string } ]
}

Return ONLY valid JSON.
`;

    const structureCompletion = await withTimeout(
      openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: structurePrompt },
          { role: "user", content: safeText },
        ],
        max_tokens: 800,
      }),
      40000
    );

    let profileSummary: any = {};
    try {
      const content = (structureCompletion as any).choices[0]?.message?.content ?? "{}";
      profileSummary = JSON.parse(content);
    } catch (err) {
      console.error("⚠️ JSON parsing error on profileSummary");
      profileSummary = {};
    }

    // 🔹 Insertion dans Supabase
    if (user_id) {
      await supabase.from("nova_cv_profiles").insert({
        user_id,
        parsed_name: cleanFirstName,
        parsed_title: profileSummary.parsed_title || null,
        languages: profileSummary.languages || [langCode],
        skills: profileSummary.skills || [],
        experiences: profileSummary.experiences || {},
        tags: profileSummary.tags || [],
        seniority: profileSummary.seniority || null,
        domain_focus: profileSummary.domain_focus || null,
      });
    }

    // 🔹 Réponse front
    return NextResponse.json({
      ok: true,
      firstName: cleanFirstName,
      feedback,
      detectedLang: langCode,
      profileSummary,
    });
  } catch (e: any) {
    console.error("cv/analyze error:", e?.message);
    return NextResponse.json(
      { ok: false, error: "⚠️ An error occurred while analyzing the CV" },
      { status: 500 }
    );
  }
}
