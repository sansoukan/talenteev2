import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

/**
 * POST /api/questions
 * body: { id?: string, niveau?: string, lang?: "en"|"fr"|"es" }
 * 🔹 Retourne une question active avec sa vidéo (video_url_xx)
 * 🔹 Fallback automatique si aucune vidéo prête
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, niveau, lang = "en" } = body || {};
    let chosen: any = null;

    // 1️⃣ Récupération directe si ID fourni
    if (id) {
      const { data, error } = await supabaseAdmin
        .from("nova_questions")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      if (data) chosen = data;
    }

    // 2️⃣ Sinon : question du même niveau (type ou theme)
    if (!chosen && niveau) {
      const { data, error } = await supabaseAdmin
        .from("nova_questions")
        .select("*")
        .or(`type.eq.${niveau},theme.eq.${niveau}`)
        .eq("is_active", true)
        .order("last_used_at", { ascending: true })
        .limit(1);
      if (error) throw error;
      if (data && data.length > 0) chosen = data[0];
    }

    // 3️⃣ Choix du champ vidéo correct
    const videoField = `video_url_en${lang}`;
    const textField = `question_${lang}`;
    const statusField = `status_video_${lang}`;

    let video_url: string | null = null;

    if (
      chosen &&
      chosen[videoField] &&
      (chosen[statusField] === "ready" ||
        chosen[statusField] === true ||
        chosen[statusField] === "is_ready")
    ) {
      video_url = chosen[videoField];
    }

    // 4️⃣ Fallback si pas de vidéo trouvée
    if (!video_url) {
      const { data: fb } = await supabaseAdmin
        .from("nova_fallbacks")
        .select("url")
        .eq("lang", lang)
        .limit(1)
        .maybeSingle();
      if (fb?.url) video_url = fb.url;
    }

    // 5️⃣ Texte en dernier recours
    const text =
      chosen?.[textField] ??
      (lang === "fr"
        ? "Pouvez-vous me parler de votre dernière expérience professionnelle ?"
        : "Can you tell me about your last professional experience?");

    // 6️⃣ Mise à jour du champ last_used_at
    if (chosen?.id) {
      await supabaseAdmin
        .from("nova_questions")
        .update({ last_used_at: new Date().toISOString() })
        .eq("id", chosen.id);
    }

    return NextResponse.json({
      ok: true,
      id: chosen?.id ?? null,
      text: video_url ? null : text,
      video_url,
    });
  } catch (e: any) {
    console.error("❌ /api/questions error:", e);

    // 7️⃣ Fallback d’urgence global
    let video_url: string | null = null;
    try {
      const { data: fb } = await supabaseAdmin
        .from("nova_fallbacks")
        .select("url")
        .eq("lang", "en")
        .limit(1)
        .maybeSingle();
      if (fb?.url) video_url = fb.url;
    } catch {}

    return NextResponse.json(
      {
        ok: false,
        text: video_url ? null : "Can you tell me about your experience?",
        video_url,
      },
      { status: 200 }
    );
  }
}