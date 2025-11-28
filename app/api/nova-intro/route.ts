import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const { NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env;

if (!NEXT_PUBLIC_SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("Missing Supabase environment variables");
}

const supabase = createClient(NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

/**
 * GET /api/nova-intro
 * -> retourne l’URL publique de la vidéo d’introduction Nova
 */
export async function GET(_req: NextRequest) {
  try {
    const bucket = "nova-videos"; // ⚠️ adapter si le bucket est différent
    const fileName = "nova_intro.mp4";

    const {
      data: { publicUrl },
    } = supabase.storage.from(bucket).getPublicUrl(fileName);

    if (!publicUrl) {
      return NextResponse.json({ error: "intro_not_found" }, { status: 404 });
    }

    return NextResponse.json({ url: publicUrl });
  } catch (e: any) {
    console.error("nova-intro error:", e);
    return NextResponse.json(
      { error: e?.message ?? "server_error" },
      { status: 500 }
    );
  }
}