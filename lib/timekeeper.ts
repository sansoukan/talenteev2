// timekeeper.ts

export type TK = { 
  target: number;   // durée totale session en secondes
  left: number;     // temps restant
  niveau: string;   // "1" | "2" | "3"
};

/**
 * Détermine si on doit activer le gate freemium
 * - N2 et N3 : coupure à 4 minutes (240s)
 */
export function shouldPremiumGate(tk: TK): boolean {
  if (tk.niveau === "2" || tk.niveau === "3") {
    const elapsed = tk.target - tk.left;
    return elapsed >= 240; // 4 minutes
  }
  return false;
}

/**
 * Détermine si on doit lancer la synthèse finale
 * - Déclenchée à T–60s
 */
export function shouldSynthesize(tk: TK): boolean {
  return tk.left <= 60;
}

/**
 * Durée max autorisée pour une réponse
 * - N3 : 180s (cas pratiques)
 * - N1/N2 : 90s
 */
export function perAnswerMaxSeconds(niveau: string): number {
  return (niveau === "3") ? 180 : 90;
}

/**
 * Classification d’un silence utilisateur
 * Permet de distinguer :
 * - une pause de réflexion
 * - un besoin de relance
 * - une vraie fin de réponse
 *
 * @param durationMs Durée du silence détecté (en millisecondes)
 * @param niveau Niveau simulation ("1"|"2"|"3")
 * @param keywordDetected Mot-clé explicite (ex: "Nova" en N3)
 * @returns "thinking" | "relance" | "end"
 */
export function classifySilence(
  durationMs: number,
  niveau: string,
  keywordDetected: boolean = false
): "thinking" | "relance" | "end" {
  
  // Cas spécial Niveau 3 : si l’utilisateur dit "Nova" → fin explicite
  if (niveau === "3" && keywordDetected) {
    return "end";
  }

  // Pauses très courtes → réflexion normale
  if (durationMs < 3000) return "thinking";

  // 3–5s → relance courte
  if (durationMs < 5000) return "relance";

  // >5s → considéré comme fin de réponse
  return "end";
}
