import { NextRequest, NextResponse } from "next/server";

// Redirige vers la vraie route
export async function POST(req: NextRequest) {
  const body = await req.text();
  const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || ""}/api/tts/voice/elevenlabs`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
  });

  const buf = await res.arrayBuffer();
  return new NextResponse(Buffer.from(buf), {
    headers: {
      "Content-Type": res.headers.get("content-type") || "audio/mpeg",
      "Content-Disposition": "inline; filename=voice.mp3",
    },
    status: res.status,
  });
}
