import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { validateCV } from "@/lib/validateCV";
import { franc } from "franc";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

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
    promise.then((res) => {
      clearTimeout(id);
      resolve(res);
    }).catch((err) => {
      clearTimeout(id);
      reject(err);
    });
  });
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ ok: false, error: "⚠️ No file uploaded", feedback: "" }, { status: 400 });
    }

    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ ok: false, error: "⚠️ File too large (max 5MB)", feedback: "" }, { status: 400 });
    }

    const validation = await validateCV(file);
    if (!validation.ok) {
      return NextResponse.json({ ok: false, error: validation.error, feedback: "" }, { status: 400 });
    }

    const cleanedText = validation.text.replace(/[^\x09\x0A\x0D\x20-\x7EÀ-ÿ]/g, "");
    const safeText = cleanedText.slice(0, 3000);

    const firstName = extractFirstName(safeText);
    const cleanFirstName = firstName && firstName.length < 30 ? firstName : "";

    let langCode = franc(safeText);
    if (langCode === "und" || !greetings[langCode]) langCode = "eng";
    const greeting = greetings[langCode] || "Hello";

    const prompt = `
You are Nova, an experienced HR Director and career coach.
You receive a candidate's CV (raw text extracted from PDF).
Your mission is to provide a structured, insightful, and uncompromising CV analysis,
as if you were a senior recruiter giving candid but constructive feedback.

⚠️ Greeting rule:
- Always start EXACTLY with: "${greeting} ${cleanFirstName},"

⚠️ Experience-by-experience analysis rule:
- For EACH professional experience, give strengths and areas for improvement.
- MUST cover all roles, even older ones.
- If bullets are vague, call it out directly ("This bullet is too generic and risks being ignored by recruiters").

⚠️ Metrics rule:
- Always include at least ONE metric from the CV.
- Reformulate it into a storytelling sentence.
- Suggest up to 2 new realistic metrics.
- Never invent implausible numbers.

⚠️ Career progression rule:
- Analyze trajectory (junior → mid → senior).
- Explicitly discuss readiness for CPO/VP Product.
- Highlight risks if leadership is missing.

⚠️ Action-driven reformulation rule:
- Rewrite weak verbs ("helped", "participated") into strong ones ("led", "drove", "delivered").
- At least ONE rewritten bullet per role.

⚠️ Job offer disclaimer rule:
- Since no job offer is provided in improve, always write: "No job offer provided – analysis is CV-only."

⚠️ Short-term priorities:
- 3 priorities (High/Medium/Low).
- Each linked to a role or metric in the CV + current trends.

⚠️ Market positioning:
- Always connect to career progression.
- Mention at least one risk if too generic.

⚠️ Missing tasks:
- Suggest 2–3 realistic missing responsibilities.

⚠️ Soft skill story:
- Pick ONE major challenge implied in the CV.
- Write 3–4 sentences, showing resilience & leadership.

⚠️ Closing rule:
- End with ONE short encouragement sentence.
- DO NOT add a name, title, or signature.

Structure:
1. Narrative summary
2. Experience-by-experience analysis
3. Career progression analysis
4. "No job offer provided – analysis is CV-only."
5. Short-term priorities
6. Market positioning & risks
7. Missing tasks
8. Example of reformulation
9. Soft skill story
10. Final encouragement
`;

    const completion = await withTimeout(
      openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: prompt },
          { role: "user", content: `Candidate first name: ${cleanFirstName}\n\nCandidate CV:\n${safeText}` },
        ],
        max_tokens: 1800,
      }),
      60000
    );

    const rawOutput = (completion as any).choices[0]?.message?.content ?? "";
    return NextResponse.json({ ok: true, feedback: rawOutput, firstName: cleanFirstName, detectedLang: langCode });
  } catch (e: any) {
    console.error("cv/improve error:", e?.message);
    return NextResponse.json({ error: "⚠️ An error occurred while improving the resume" }, { status: 500 });
  }
}
