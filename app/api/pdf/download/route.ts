import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const sessionId = req.nextUrl.searchParams.get("sessionId");
  if (!sessionId)
    return NextResponse.json({ error: "Missing sessionId" }, { status: 400 });

  // Appel interne du PDF principal
  const res = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL}/api/pdf`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sessionId }),
  });

  if (!res.ok) {
    return NextResponse.json(
      { error: "Error generating PDF" },
      { status: res.status }
    );
  }

  const blob = await res.arrayBuffer();
  return new NextResponse(blob, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="Nova_Report_${sessionId}.pdf"`,
    },
  });
}