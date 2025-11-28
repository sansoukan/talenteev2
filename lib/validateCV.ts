import OpenAI from "openai";
import PDFParser from "pdf2json";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

// ✅ Extraction texte PDF → string
async function extractTextWithPdf2Json(buffer: Buffer): Promise<string> {
  return new Promise((resolve, reject) => {
    const pdfParser = new PDFParser();
    pdfParser.on("pdfParser_dataError", (errData) => reject(errData.parserError));
    pdfParser.on("pdfParser_dataReady", (pdfData) => {
      try {
        const texts = pdfData.Pages.flatMap((page: any) =>
          page.Texts.map((t: any) =>
            decodeURIComponent(t.R[0].T ?? "").trim()
          )
        );
        resolve(texts.join(" ").replace(/\s+/g, " ").trim());
      } catch (err) {
        reject(err);
      }
    });
    pdfParser.parseBuffer(buffer);
  });
}

// ✅ Validation CV (format, taille, contenu)
export async function validateCV(file: File | null) {
  if (!file) {
    return { ok: false, error: "No file provided" };
  }

  // Vérifier extension
  const allowedExtensions = ["pdf", "doc", "docx"];
  const ext = file.name.split(".").pop()?.toLowerCase();
  if (!ext || !allowedExtensions.includes(ext)) {
    return { ok: false, error: "Invalid file type. Please upload a PDF, DOC, or DOCX." };
  }

  // Vérifier taille (max 5Mo)
  if (file.size > 5 * 1024 * 1024) {
    return { ok: false, error: "File too large. Maximum allowed size is 5MB." };
  }

  // Convertir en Buffer
  const buffer = Buffer.from(await file.arrayBuffer());

  // Extraire texte si PDF, sinon fallback texte brut (simplifié pour DOC/DOCX)
  let text = "";
  if (ext === "pdf") {
    text = await extractTextWithPdf2Json(buffer);
  } else {
    text = buffer.toString("utf8");
  }

  if (!text?.trim()) {
    return { ok: false, error: "Could not extract text from CV." };
  }

  // ✅ Vérifier avec OpenAI moderation
  try {
    const moderation = await openai.moderations.create({
      model: "omni-moderation-latest",
      input: text.slice(0, 2000), // limiter l'analyse aux 2000 premiers caractères
    });

    const result = moderation.results[0];
    const categories = result.category_scores;

    // Cas bloquant → racisme, haine, menaces, violence explicite
    if (result.flagged && (
      categories.hate > 0.85 ||
      categories.violence > 0.85 ||
      categories.self_harm > 0.85 ||
      categories.sexual > 0.9
    )) {
      return { ok: false, error: "⚠️ Content violates Nova’s policy (hate, violence, or explicit content)." };
    }

    // Cas suspects → on flag mais on laisse passer
    if (
      categories.hate > 0.6 ||
      categories.violence > 0.6 ||
      categories.sexual > 0.7
    ) {
      console.warn("⚠️ Suspicious CV content flagged for review.");
      // 👉 Ici tu pourrais enregistrer en DB si besoin
    }

    // ✅ Tout est OK
    return { ok: true, text };

  } catch (err) {
    console.error("Moderation API error:", err);
    return { ok: false, error: "Moderation service unavailable." };
  }
}
