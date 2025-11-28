/** 🔧 Normalisation des niveaux de carrière (Nova RH) */
export function normalizeStage(stage: string): string {
  const value = stage.toLowerCase();
  if (["intern", "student"].includes(value)) return "student";
  if (["junior", "graduate"].includes(value)) return "graduate";
  if (["mid", "professional"].includes(value)) return "professional";
  if (["senior", "exec", "manager", "leader"].includes(value)) return "manager";
  return "graduate";
}