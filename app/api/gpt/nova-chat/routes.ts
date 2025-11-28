import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  // on redirige simplement vers la vraie route
  const body = await req.text(); // on lit brut pour pouvoir le renvoyer
  const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || ""}/app/nova-chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
  });

  const data = await res.text();
  return new NextResponse(data, {
    status: res.status,
    headers: { "Content-Type": res.headers.get("content-type") || "application/json" },
  });
}
