import { NOVA_SESSION_CONFIG } from "@/config/novaSessionConfig";

/**
 * getNovaSessionConfig
 * --------------------
 * 🔹 Rend la config Nova côté client sans planter
 * 🔹 Garantit toujours une valeur même si l'import échoue
 * 🔹 Évite le crash "undefined (reading 'durationSec')"
 */
export function getNovaSessionConfig() {
  try {
    if (!NOVA_SESSION_CONFIG) throw new Error("NOVA_SESSION_CONFIG undefined");
    return NOVA_SESSION_CONFIG;
  } catch {
    console.warn("⚠️ Nova session config fallback used.");
    return {
      durationSec: 1200,
      totalQuestions: 19,
      precloseThresholdSec: 180,
      closeThresholdSec: 120,
      hardStopThresholdSec: 30,
    };
  }
}