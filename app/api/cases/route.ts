import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

/**
 * POST /api/cases
 * body: { id?: string, theme?: string, lang: string }
 *
 * → Renvoie une étude de cas (intro + séquence de questions) en priorité vidéo,
 *   texte uniquement en dernier recours
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, theme, lang = "fr" } = body || {};

    let chosen: any = null;

    // 1. Cas spécifique si id fourni
    if (id) {
      const { data, error } = await supabaseAdmin
        .from("nova_case_library")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      if (data) chosen = data;
    }

    // 2. Sinon → cas actif par thème
    if (!chosen && theme) {
      const { data, error } = await supabaseAdmin
        .from("nova_case_library")
        .select("*")
        .eq("theme", theme)
        .eq("is_active", true)
        .order("created_at", { ascending: true })
        .limit(1);
      if (error) throw error;
      if (data && data.length > 0) chosen = data[0];
    }

    // 3. Sinon → prendre n’importe quel cas actif
    if (!chosen) {
      const { data, error } = await supabaseAdmin
        .from("nova_case_library")
        .select("*")
        .eq("is_active", true)
        .order("created_at", { ascending: true })
        .limit(1);
      if (error) throw error;
      if (data && data.length > 0) chosen = data[0];
    }

    if (!chosen) {
      return NextResponse.json(
        { ok: false, text: "Aucun cas disponible", video_url: null },
        { status: 200 }
      );
    }

    // 4. Construire le bloc vidéo-first
    const buildVideo = (field: string) => {
      const statusField = `status_${field}`;
      if (chosen[field] && chosen[statusField] === "ready") {
        return chosen[field];
      }
      return null;
    };

    const intro = buildVideo(`video_intro_${lang}`) || chosen[`intro_${lang}`];
    const questions = [1, 2, 3, 4, 5].map((n) => {
      const videoField = `video_q${n}_${lang}`;
      const statusField = `status_video_q${n}_${lang}`;
      const video = chosen[videoField] && chosen[statusField] === "ready" ? chosen[videoField] : null;
      return {
        text: video ? null : chosen[`question_${n}_${lang}`],
        video_url: video,
      };
    });

    // 5. Si aucune vidéo trouvée → fallback générique
    let hasVideo = intro && typeof intro === "string";
    if (!hasVideo) {
      hasVideo = questions.some((q) => q.video_url);
    }

    if (!hasVideo) {
      const { data: fb } = await supabaseAdmin
        .from("nova_fallbacks")
        .select("url")
        .eq("lang", lang)
        .limit(1)
        .maybeSingle();
      if (fb?.url) {
        return NextResponse.json({
          ok: true,
          intro: { text: null, video_url: fb.url },
          questions: [],
        });
      }
    }

    return NextResponse.json({
      ok: true,
      intro: {
        text: intro && typeof intro === "string" && intro.startsWith("http") ? null : chosen[`intro_${lang}`],
        video_url: intro && typeof intro === "string" && intro.startsWith("http") ? intro : null,
      },
      questions,
      id: chosen.id,
      theme: chosen.theme,
    });
  } catch (e: any) {
    console.error("case error:", e);

    // Dernier secours → fallback vidéo générique FR
    let video_url: string | null = null;
    try {
      const { data: fb } = await supabaseAdmin
        .from("nova_fallbacks")
        .select("url")
        .eq("lang", "fr")
        .limit(1)
        .maybeSingle();
      if (fb?.url) video_url = fb.url;
    } catch {
      // ignore
    }

    return NextResponse.json(
      {
        ok: false,
        intro: { text: video_url ? null : "Cas pratique indisponible pour le moment.", video_url },
        questions: [],
      },
      { status: 200 }
    );
  }
}
