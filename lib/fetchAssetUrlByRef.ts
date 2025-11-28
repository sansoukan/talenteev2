import { supabaseAdmin } from "@/lib/supabaseAdmin";

/**
 * fetchAssetUrlByRef
 * - Vidéo d’abord : question / relance / feedback / listening
 * - Vérifie existence réelle via HEAD
 * - Si rien → fallback vidéo générique (nova_fallbacks)
 * - Texte = dernier recours
 */
export async function fetchAssetUrlByRef(
  refId: string,
  type: "question" | "feedback" | "relance" | "listening",
  lang: string,
  niveau?: string
): Promise<string | null> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const bucket = "nova-videos";

    // 1. Chercher asset explicite dans nova_assets
    const { data: asset } = await supabaseAdmin
      .from("nova_assets")
      .select("url, status")
      .eq("id", refId)
      .eq("type", type)
      .eq("lang", lang)
      .maybeSingle();

    if (asset?.url && asset.status === "ready") {
      const head = await fetch(asset.url, { method: "HEAD" });
      if (head.ok) return asset.url;
    }

    // 2. Essayer via nommage standard
    const candidateUrl = `${baseUrl}/storage/v1/object/public/${bucket}/${refId}_${type}_${lang}.mp4`;
    try {
      const resp = await fetch(candidateUrl, { method: "HEAD" });
      if (resp.ok) return candidateUrl;
    } catch {
      // ignore
    }

    // 3. Si question → tenter une autre du même niveau/lang
    if (type === "question" && niveau) {
      const { data: q } = await supabaseAdmin
        .from("nova_questions")
        .select("id")
        .eq("niveau", niveau)
        .eq("is_active", true)
        .neq("id", refId)
        .order("last_used_at", { ascending: true })
        .limit(1);

      if (q && q.length > 0) {
        const altUrl = `${baseUrl}/storage/v1/object/public/${bucket}/${q[0].id}_question_${lang}.mp4`;
        const resp = await fetch(altUrl, { method: "HEAD" });
        if (resp.ok) return altUrl;
      }
    }

    // 4. Fallback vidéo générique depuis nova_fallbacks
    const { data: fb } = await supabaseAdmin
      .from("nova_fallbacks")
      .select("url")
      .eq("lang", lang)
      .limit(1)
      .maybeSingle();

    if (fb?.url) {
      const head = await fetch(fb.url, { method: "HEAD" });
      if (head.ok) return fb.url;
    }

    // 5. Dernier recours → null (texte/IA)
    return null;
  } catch (e) {
    console.error("fetchAssetUrlByRef error:", e);
    return null;
  }
}
