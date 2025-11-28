import { NextRequest, NextResponse } from "next/server";

async function extractTextWithPdfParse(buffer: Buffer): Promise<string> {
  try {
    const pdfParse = (await import("pdf-parse")).default;
    const data = await pdfParse(buffer);
    return data.text || "";
  } catch (e: any) {
    console.error("❌ pdf-parse failed:", e?.message);
    return "";
  }
}

export async function POST(req: NextRequest) {
  try {
    let buffer: Buffer | null = null;

    if (req.headers.get("content-type")?.includes("multipart/form-data")) {
      const formData = await req.formData();
      const file = formData.get("file") as File | null;
      if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });

      buffer = Buffer.from(await file.arrayBuffer());
    }

    if (!buffer) {
      return NextResponse.json({ error: "No buffer" }, { status: 400 });
    }

    const text = await extractTextWithPdfParse(buffer);
    console.log("✅ pdf-parse extracted:", text.slice(0, 200));

    return NextResponse.json({ ok: true, preview: text.slice(0, 500) });
  } catch (e: any) {
    console.error("debug-pdf error:", e?.message);
    return NextResponse.json({ error: e?.message ?? "server_error" }, { status: 500 });
  }
}
