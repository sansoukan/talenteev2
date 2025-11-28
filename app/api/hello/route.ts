import { NextResponse } from "next/server";
import { getModelInfo } from "@/lib/getModelInfo";

export async function GET() {
  const info = await getModelInfo();
  return NextResponse.json(info);
}
