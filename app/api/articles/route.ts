import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

/**
 * 🔒 API /articles
 * --------------------------------------------------
 * Lecture des articles côté serveur (clé service_role)
 * Utilisée pour back-office ou pré-render SSR
 */

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // ⚠️ clé serveur, pas NEXT_PUBLIC
);

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const slug = searchParams.get("slug");

    if (slug) {
      // 🔍 Article unique
      const { data, error } = await supabaseAdmin
        .from("nova_articles")
        .select("*")
        .eq("slug", slug)
        .eq("is_published", true)
        .maybeSingle();

      if (error || !data)
        return NextResponse.json(
          { error: "Article not found" },
          { status: 404 }
        );

      return NextResponse.json(data);
    }

    // 🧾 Liste courte (aperçus)
    const { data, error } = await supabaseAdmin
      .from("nova_articles")
      .select(
        "id, title, slug, excerpt, cover_url, author, created_at, reading_time, category"
      )
      .eq("is_published", true)
      .order("created_at", { ascending: false })
      .limit(10);

    if (error) throw error;

    return NextResponse.json(data || []);
  } catch (err: any) {
    console.error("❌ [API /articles] Error:", err.message || err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}