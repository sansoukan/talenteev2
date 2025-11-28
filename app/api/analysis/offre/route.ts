import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import PDFParser from "pdf2json";

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

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

// ✅ Normalization helper
function normalizeArray(field: any): string[] {
  if (!field) return [];
  if (Array.isArray(field)) return field.filter((x) => typeof x === "string");
  if (typeof field === "string") return [field];
  return [];
}

export async function POST(req: NextRequest) {
  try {
    let text: string | null = null;
    let buffer: Buffer | null = null;
    let url: string | null = null;

    if (req.headers.get("content-type")?.includes("multipart/form-data")) {
      const formData = await req.formData();
      const file = formData.get("file") as File | null;
      if (!file) {
        return NextResponse.json({ error: "No file provided" }, { status: 400 });
      }
      buffer = Buffer.from(await file.arrayBuffer());
    } else {
      const body = await req.json();
      text = body.text ?? "";
      url = body.url ?? null;
    }

    if (buffer && !text) {
      text = await extractTextWithPdf2Json(buffer);
      console.log("📄 Job offer text extracted from PDF:", text.slice(0, 300));
    }

    if (url && !text) {
      try {
        const res = await fetch(url);
        const html = await res.text();
        text = html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
      } catch {
        return NextResponse.json(
          { error: "An error occurred while fetching the job offer" },
          { status: 400 }
        );
      }
    }

    if (!text?.trim()) {
      return NextResponse.json({
        ok: false,
        error: "An error occurred while analyzing the job offer",
        analysis: {
          role_detected: "Not detected",
          must_have: [],
          nice_to_have: [],
          main_responsibilities: [],
          critical_points: [],
        },
      });
    }

    const safeText = text.slice(0, 3000);

    const prompt = `
You are Nova, an AI recruiter.
Analyze the job offer text and return enriched JSON.`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: prompt },
        { role: "user", content: `JOB OFFER TEXT:\n${safeText}` },
      ],
      max_tokens: 700,
    });

    let rawOutput = completion.choices[0]?.message?.content ?? "";
    let cleanOutput = rawOutput.replace(/```json/g, "").replace(/```/g, "").trim();

    let parsed: any;
    try {
      parsed = cleanOutput.trim() ? JSON.parse(cleanOutput) : {};
    } catch {
      console.warn("⚠️ Parsing failed, fallback empty");
      parsed = {};
    }

    // ✅ Sanitize
    const analysis = {
      role_detected: typeof parsed.role_detected === "string" ? parsed.role_detected : "Not detected",
      must_have: normalizeArray(parsed.must_have),
      nice_to_have: normalizeArray(parsed.nice_to_have),
      main_responsibilities: normalizeArray(parsed.main_responsibilities),
      critical_points: normalizeArray(parsed.critical_points),
    };

    return NextResponse.json({ ok: true, analysis });
  } catch (e: any) {
    console.error("analysis/offre error:", e?.message);
    return NextResponse.json(
      { error: "An error occurred while analyzing the job offer" },
      { status: 500 }
    );
  }
}
