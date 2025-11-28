import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import PDFParser from "pdf2json";
import { matchCvToOffer } from "@/lib/matchCvToOffer";

// --- 1️⃣ Utilitaire pour extraire le texte d’un PDF ---
async function extractTextWithPdf2Json(buffer: Buffer): Promise<string> {
  return new Promise((resolve, reject) => {
    const pdfParser = new PDFParser();
    pdfParser.on("pdfParser_dataError", (errData) => reject(errData.parserError));
    pdfParser.on("pdfParser_dataReady", (pdfData) => {
      try {
        const texts = pdfData.Pages.flatMap((page: any) =>
          page.Texts.map((t: any) => decodeURIComponent(t.R[0].T ?? "").trim())
        );
        resolve(texts.join(" ").replace(/\s+/g, " ").trim());
      } catch (err) {
        reject(err);
      }
    });
    pdfParser.parseBuffer(buffer);
  });
}

// --- 2️⃣ OpenAI client ---
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

// --- 3️⃣ Route principale ---
export async function POST(req: NextRequest) {
  try {
    let cvText: string | null = null;
    let offerText: string | null = null;
    let cvBuffer: Buffer | null = null;
    let offerBuffer: Buffer | null = null;

    // 🧱 Récupération des fichiers ou texte brut
    if (req.headers.get("content-type")?.includes("multipart/form-data")) {
      const formData = await req.formData();
      const cvFile = formData.get("cv") as File | null;
      const offerFile = formData.get("offer") as File | null;
      if (!cvFile || !offerFile)
        return NextResponse.json({ error: "Both CV and Offer files are required" }, { status: 400 });

      cvBuffer = Buffer.from(await cvFile.arrayBuffer());
      offerBuffer = Buffer.from(await offerFile.arrayBuffer());
    } else {
      const body = await req.json();
      cvText = body.cv ?? "";
      offerText = body.offer ?? "";
    }

    // 🧠 Extraction texte PDF
    if (cvBuffer && !cvText) cvText = await extractTextWithPdf2Json(cvBuffer);
    if (offerBuffer && !offerText) offerText = await extractTextWithPdf2Json(offerBuffer);

    if (!cvText?.trim() || !offerText?.trim()) {
      return NextResponse.json({
        ok: false,
        match: { error: "⚠️ CV ou Offre illisible même après parsing." },
      });
    }

    const safeCV = cvText.slice(0, 3000);
    const safeOffer = offerText.slice(0, 3000);

    // --- 4️⃣ Prompt GPT ---
    const prompt = `
You are Nova, an AI recruiter.
Compare the candidate CV with the job offer and return enriched JSON.

Format:
{
  "match_score": number,
  "strong_points": string[],
  "weak_points": string[],
  "missing_requirements": string[]
}

Rules:
- Use ONLY info from CV and Offer.
- NEVER invent.
- Output strictly valid JSON.
`;

    let match: any = {};

    try {
      // --- 5️⃣ Appel GPT ---
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: prompt },
          { role: "user", content: `CV:\n${safeCV}\n\nJOB OFFER:\n${safeOffer}` },
        ],
        max_tokens: 800,
        temperature: 0.3,
      });

      let rawOutput = completion.choices[0]?.message?.content ?? "";
      console.log("🧠 GPT raw output:", rawOutput);

      const cleanOutput = rawOutput
        .replace(/```json/g, "")
        .replace(/```/g, "")
        .trim();

      match = cleanOutput ? JSON.parse(cleanOutput) : {};
    } catch (err) {
      console.warn("⚠️ GPT failed or invalid JSON → using local fallback", err);
    }

    // --- 6️⃣ Fallback local si GPT échoue ou vide ---
    if (!match?.match_score || typeof match.match_score !== "number") {
      console.log("🧩 Local fallback: matchCvToOffer()");

      // Simule une analyse simple à partir des textes
      const cvAnalysis = {
        strengths: safeCV.split(/\W+/).filter((w) => w.length > 3),
        role_detected: safeCV.match(/(manager|engineer|analyst|intern|lead)/i)?.[0] ?? "",
      };
      const offerAnalysis = {
        must_have: safeOffer.match(/\b(excel|sql|python|leadership|sales|budget|reporting)\b/gi) ?? [],
        nice_to_have: safeOffer.match(/\b(power bi|tableau|english|communication|analytics)\b/gi) ?? [],
        main_responsibilities: safeOffer.match(/\b(manage|develop|coordinate|design|analyze)\b/gi) ?? [],
        role_detected: safeOffer.match(/(manager|engineer|analyst|intern|lead)/i)?.[0] ?? "",
      };

      match = matchCvToOffer(cvAnalysis, offerAnalysis);
      match.fallback = true;
    }

    // --- 7️⃣ Sécurisation du retour final ---
    const response = {
      ok: true,
      match: {
        score: match.match_score ?? match.score ?? 0,
        strong_points: match.strong_points ?? match.matches?.must_have ?? [],
        weak_points: match.weak_points ?? [],
        missing_requirements: match.missing_requirements ?? match.missing ?? [],
        details: match.details ?? {},
        summary: match.summary ?? "",
        fallback: !!match.fallback,
      },
    };

    console.log("🎯 Match result:", response.match);
    return NextResponse.json(response);
  } catch (e: any) {
    console.error("❌ match/cv-offre error:", e?.message);
    return NextResponse.json(
      { error: e?.message ?? "server_error", stack: e?.stack },
      { status: 500 }
    );
  }
}