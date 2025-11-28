/**
 * ======================================================
 *  🎞️ preloadSystemVideos — V4 (Fix complet, stable Chrome)
 * ------------------------------------------------------
 *  ✔ Corrige les erreurs "URL non-string"
 *  ✔ Accepte string ou { url, micAllowed }
 *  ✔ Ignore cleanly les URLs invalides
 *  ✔ Préchargement HEAD 100% compatible Chrome/Safari
 *  ✔ Supprime toute logique feedback_positive/neutral
 * ======================================================
 */

import { NOVA_VIDEO_URLS } from "@/config/NovaVideoUrls";

/**
 * Normalise une entrée vidéo venant de NOVA_VIDEO_URLS
 */
function normalizeUrl(raw: any, key: string): string | null {
  if (typeof raw === "string") return raw;

  if (raw && typeof raw === "object" && typeof raw.url === "string") {
    return raw.url;
  }

  console.error(`❌ [preloadSystemVideos] URL invalide pour ${key}:`, raw);
  return null;
}

/**
 * Précharge toutes les vidéos système
 */
export async function preloadSystemVideos(lang: string = "en") {
  try {
    console.log(`🚀 Préchargement des vidéos système [lang=${lang}]...`);

    const keys = [
      // Intros
      "intro_en_1",
      "intro_en_2",

      // Idle loops
      "idle_listen",
      "idle_smile",

      // Clarify
      "clarify_end",
      "clarify_end_alt",

      // Fin d'entretien
      "nova_end_interview_en",

      // Feedback final unique (oral + idle → pas de positive/neutral/high)
      "nova_feedback_final",
    ];

    await Promise.all(
      keys.map(async (key) => {
        const raw = NOVA_VIDEO_URLS[key];

        const url = normalizeUrl(raw, key);
        if (!url || !url.startsWith("http")) {
          console.error(`❌ [preloadSystemVideos] ${key} ignorée (URL non valide):`, url);
          return;
        }

        try {
          const res = await fetch(url, { method: "HEAD" });
          console.log(`🔍 [preloadSystemVideos] HEAD ${key} → ${res.status}`);

          if (!res.ok) {
            console.warn(`⚠️ [preloadSystemVideos] ${key} inaccessible (status ${res.status})`);
            return;
          }

          const video = document.createElement("video");
          video.src = url;
          video.preload = "auto";
          video.load();

          console.log(`✅ Préchargée : ${key}`);
        } catch (err) {
          console.error(`⚠️ [preloadSystemVideos] Erreur pour ${key}:`, err);
        }
      })
    );

    console.log("🎬 Toutes les vidéos système sont préchargées ✅");
  } catch (err) {
    console.error("❌ Erreur preloadSystemVideos :", err);
  }
}