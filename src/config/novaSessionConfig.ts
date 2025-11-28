/**
 * ======================================================
 *  ⚙️ NOVA_SESSION_CONFIG — V3 Production
 * ------------------------------------------------------
 *  Définition des durées, du nombre de questions et
 *  de la structure de chaque type de session Nova RH.
 * ======================================================
 */

export const NOVA_SESSION_CONFIG = {
  /* ======================================================
   🔹 Durées cibles par type d’entretien
  ====================================================== */
  durationSec: 1200, // durée par défaut (20 minutes)

  durationsByLevel: {
    level1: 900,   // Niveau 1 — Pré-sélection (15 min)
    level2: 1200,  // Niveau 2 — Fit & Matching poste (20 min)
    level3: 1800,  // Niveau 3 — Mise en situation (30 min)
    internal: 1200 // Entretien interne (évolution, feedback, etc.)
  },

  /* ======================================================
   🔹 Nombre total de questions par session
  ====================================================== */
  totalQuestions: 20, // fallback global

  /* ======================================================
   🔹 Structure de session (typologie des questions)
  ====================================================== */
  structure: {
    // ⚙️ Bloc d’introduction
    intro: 1, // ex: q_0001 = “Tell me about yourself”

    // 🔹 Fit général (soft skills / motivation / carrière)
    fit: 5,

    // 🔹 Niveaux de difficulté progressive (spécifique au métier)
    diff1: 5,
    diff2: 5,
    diff3: 3,

    // 🔹 Optionnels (peuvent être activés selon le profil)
    bonus: 1,      // ex: étude de cas courte
    feedback: 1,   // conclusion
  },

  /* ======================================================
   🔹 Modes / Segments (Elite vs Operational)
  ====================================================== */
  segments: {
    elite: {
      description: "Entretiens pour cadres, managers, experts",
      totalQuestions: 18,
      durationSec: 1200,
    },
    operational: {
      description: "Entretiens pour fonctions terrain ou exécutants",
      totalQuestions: 15,
      durationSec: 900,
    },
  },

  /* ======================================================
   🔹 Fallbacks
  ====================================================== */
  defaults: {
    lang: "en",
    segment: "elite",
    domain: "general",
    sub_domain: null,
  },
};