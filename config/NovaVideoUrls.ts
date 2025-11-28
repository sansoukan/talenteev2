/**
 * ======================================================
 *  🎞️ NovaVideoUrls — V3 Production (avec micAllowed)
 * ------------------------------------------------------
 *  Centralisation des URLs vidéo système de Nova.
 *  ➤ micAllowed = true → le micro s’active pendant la lecture.
 * ======================================================
 */

export const NOVA_VIDEO_URLS: Record<
  string,
  { url: string; micAllowed: boolean }
> = {
  // 🔹 Clarify / Relance (Nova parle → micro OFF)
  clarify_end: {
    url: "https://qpnalviccuopdwfscoli.supabase.co/storage/v1/object/public/videos/system/clarify_end.mp4",
    micAllowed: false,
  },
  clarify_end_alt: {
    url: "https://qpnalviccuopdwfscoli.supabase.co/storage/v1/object/public/videos/system/clarify_end (1).mp4",
    micAllowed: false,
  },
  clarify_start: {
    url: "https://qpnalviccuopdwfscoli.supabase.co/storage/v1/object/public/videos/system/clarify_start.mp4",
    micAllowed: false,
  },

  // 🔹 Idle loops (Nova écoute → micro ON)
  idle_listen: {
    url: "https://qpnalviccuopdwfscoli.supabase.co/storage/v1/object/public/videos/system/idle_listen.mp4",
    micAllowed: true,
  },
  idle_smile: {
    url: "https://qpnalviccuopdwfscoli.supabase.co/storage/v1/object/public/videos/system/idle_smile.mp4",
    micAllowed: true,
  },
  listen_idle_01: {
    url: "https://qpnalviccuopdwfscoli.supabase.co/storage/v1/object/public/videos/system/listen_idle_01.mp4",
    micAllowed: true,
  },

  // 🔹 Intros (Nova parle → micro OFF)
  intro_en_1: {
    url: "https://qpnalviccuopdwfscoli.supabase.co/storage/v1/object/public/videos/system/intro_en_1.mp4",
    micAllowed: false,
  },
  intro_en_2: {
    url: "https://qpnalviccuopdwfscoli.supabase.co/storage/v1/object/public/videos/system/intro_en_2.mp4",
    micAllowed: false,
  },

  // 🔹 Fin d’entretien (Nova parle → micro OFF)
  nova_end_interview_en: {
    url: "https://qpnalviccuopdwfscoli.supabase.co/storage/v1/object/public/videos/system/nova_end_interview_en.mp4",
    micAllowed: false,
  },
  nova_end_interview: {
    url: "https://qpnalviccuopdwfscoli.supabase.co/storage/v1/object/public/videos/system/nova_end_interview.mp4",
    micAllowed: false,
  },

  // 🔹 Feedbacks (Nova parle → micro OFF)
  nova_feedback_final: {
    url: "https://qpnalviccuopdwfscoli.supabase.co/storage/v1/object/public/videos/system/nova_feedback_final.mp4",
    micAllowed: false,
  },

  // 🔹 Autres / Fallbacks (Nova parle → micro OFF)
  question_missing: {
    url: "https://qpnalviccuopdwfscoli.supabase.co/storage/v1/object/public/videos/system/question_missing.mp4",
    micAllowed: false,
  },
  thankyou: {
    url: "https://qpnalviccuopdwfscoli.supabase.co/storage/v1/object/public/videos/system/thankyou.mp4",
    micAllowed: false,
  },
};
