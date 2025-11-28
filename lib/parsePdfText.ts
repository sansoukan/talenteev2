import pdf from "pdf-parse";

export async function extractTextFromPdf(buffer: Buffer): Promise<string> {
  try {
    const data = await pdf(buffer);
    return data.text;
  } catch (e: any) {
    console.error("❌ pdf-parse error:", e?.message);
    return "";
  }
}
