/**
 * Nova Tag System – Nova RH
 * --------------------------
 * Définit les correspondances entre les catégories logiques de questions
 * (Fit, General, Analytical, Closing, etc.)
 * et les sous-chaînes de tags présentes dans la table Supabase `nova_questions`.
 */

export const NOVA_TAGS = {
  fit: [
    "fit",
    "motivation",
    "career",
    "self_reflection",
    "adaptability",
    "communication",
    "theme:job_interview",
  ],
  general: [
    "general",
    "teamwork",
    "professional_development",
    "management",
    "leadership",
    "theme:job_interview",
  ],
  analytical: [
    "case",
    "problem_solving",
    "analytical",
    "decision_making",
    "data_analysis",
    "business_analysis",
  ],
  closing: [
    "closing",
    "reflection",
    "wrap_up",
    "feedback",
    "projection",
    "personal_development",
  ],
};

export type NovaTagCategory = keyof typeof NOVA_TAGS;

/**
 * 🔍 buildTagFilter(category)
 * ---------------------------
 * Génère un tableau de filtres utilisables dans une clause Supabase `.or(...)`.
 * Exemple :
 *   buildTagFilter("fit") → ["tags::text.ilike.%motivation%", "tags::text.ilike.%fit%", ...]
 */
export function buildTagFilter(category: NovaTagCategory): string[] {
  const tags = NOVA_TAGS[category] ?? [];
  if (!tags.length) return [];
  // On génère des patterns JSONB compatibles (pour `tags` stocké en array)
  return tags.map((t) => `tags::text.ilike.%${t}%`);
}

/**
 * 🧠 getCategoryForTag()
 * -----------------------
 * Permet, si besoin, d'inférer une catégorie logique à partir d'un tag brut.
 */
export function getCategoryForTag(tag: string): NovaTagCategory | null {
  const lower = tag.toLowerCase();
  for (const [category, keys] of Object.entries(NOVA_TAGS)) {
    if (keys.some((k) => lower.includes(k))) return category as NovaTagCategory;
  }
  return null;
}
