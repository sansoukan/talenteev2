/**
 * ======================================================
 *  🎥 videoManager — V3 Production (Unified, Safe URLs)
 * ------------------------------------------------------
 *  Gère l’accès à toutes les vidéos Nova RH :
 *  - intros / idle / clarify / feedbacks / fin (système)
 *  - questions (Supabase)
 *  - fallback automatique
 * ======================================================
 */

import { NOVA_VIDEO_URLS } from "@/config/NovaVideoUrls";
import { supabase } from "@/lib/singletonSupabaseClient";

/**
 * Récupère une URL vidéo système (intros, idle, clarify, feedback, fin)
 * @param key identifiant de la vidéo (ex: intro_en_1, idle_listen)
 * @param lang langue cible (ex: en, fr, es)
 */
export async function getSystemVideo(key: string, lang: string = "en"): Promise<string> {
  try {
    // 1️⃣ Vérifie d’abord dans le mapping statique
    if (NOVA_VIDEO_URLS[key]) {
      const url = NOVA_VIDEO_URLS[key];
      return typeof url === "string" ? url : (url?.url ?? NOVA_VIDEO_URLS["question_missing"]);
    }

    // 2️⃣ Si non trouvé, tente de récupérer depuis Supabase (table nova_assets)
    const { data, error } = await supabase
      .from("nova_assets")
      .select("url")
      .eq("type", "system")
      .eq("lang", lang)
      .eq("key", key)
      .maybeSingle();

    if (error) throw error;
    if (data?.url) return String(data.url);

    console.warn(`⚠️ Vidéo système non trouvée (${key}) → fallback question_missing`);
    return NOVA_VIDEO_URLS["question_missing"];
  } catch (err) {
    console.error("❌ getSystemVideo error:", err);
    return NOVA_VIDEO_URLS["question_missing"];
  }
}

/**
 * Récupère une vidéo de question depuis Supabase
 * @param questionId identifiant logique (ex: q_0001)
 * @param lang langue (par défaut "en")
 */
export async function getQuestionVideo(questionId: string, lang: string = "en"): Promise<string> {
  try {
    const col = `video_url_${lang}`;
    const { data, error } = await supabase
      .from("nova_questions")
      .select(col)
      .eq("question_id", questionId)
      .maybeSingle();

    if (error) throw error;
    if (data && data[col]) return String(data[col]);

    console.warn(`⚠️ Vidéo de question manquante (${questionId})`);
    return NOVA_VIDEO_URLS["question_missing"];
  } catch (err) {
    console.error("❌ getQuestionVideo error:", err);
    return NOVA_VIDEO_URLS["question_missing"];
  }
}

/**
 * Vérifie si une URL vidéo existe réellement (HEAD request)
 */
export async function checkVideoExists(url: any): Promise<boolean> {
  try {
    // 🧠 Sécurisation et log diagnostic
    if (typeof url !== "string") {
      console.warn("⚠️ [videoManager] checkVideoExists a reçu un objet au lieu d'une string:", url);
      // Cas typique : { url: "https://..." }
      if (url && typeof url === "object" && "url" in url) {
        url = url.url;
      } else {
        console.error("❌ [videoManager] URL invalide — impossible d'effectuer un HEAD:", url);
        return false;
      }
    }

    const res = await fetch(url, { method: "HEAD" });
    console.log(`🔍 [Nova] Checking HEAD: ${url} → ${res.status}`);
    return res.ok;
  } catch (err) {
    console.error("❌ checkVideoExists error:", err);
    return false;
  }
}

/**
 * Raccourci utilitaire pour sécuriser une URL
 */
export function safeVideo(url?: string | null): string {
  return url && typeof url === "string" && url.trim()
    ? url
    : NOVA_VIDEO_URLS["question_missing"];
}
