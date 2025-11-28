// /src/app/api/analysis/status/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Query params:
 *   ?sessionId=xxxx
 *
 * Returns:
 *   { status: "pending" | "ready" }
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get("sessionId");

    if (!sessionId) {
      return NextResponse.json(
        { status: "error", message: "Missing sessionId" },
        { status: 400 }
      );
    }

    // Check nova_pdf_analysis table
    const { data, error } = await supabaseAdmin
      .from("nova_pdf_analysis")
      .select("session_id")
      .eq("session_id", sessionId)
      .maybeSingle();

    if (error) {
      console.error("❌ /api/analysis/status error:", error);
      return NextResponse.json(
        { status: "error", message: "DB error" },
        { status: 500 }
      );
    }

    if (!data) {
      return NextResponse.json({ status: "pending" });
    }

    return NextResponse.json({ status: "ready" });
  } catch (err: any) {
    console.error("❌ /api/analysis/status fatal:", err);
    return NextResponse.json(
      { status: "error", message: err.message || "Unknown error" },
      { status: 500 }
    );
  }
}