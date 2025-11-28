import { playControlled, getSystemVideo } from "@/lib/videoManager";

export enum NovaState {
  ASKING = "ASKING",
  LISTENING = "LISTENING",
  RELANCING = "RELANCING",
  INTERRUPTING = "INTERRUPTING",
  TRANSITIONING = "TRANSITIONING",
}

export function useNovaStateMachine(videoRef, sessionLang = "en") {
  async function play(type: string) {
    const url = await getSystemVideo(type, sessionLang);
    playControlled(videoRef.current, url);
  }

  // 🔹 Analyse la qualité de la réponse et choisit le comportement
  async function handleAnswer(questionText: string, userAnswer: string) {
    // 1. Longueur brute
    const wordCount = userAnswer.trim().split(/\s+/).length;
    if (wordCount < 5) return await play("relance_generic_1");

    // 2. Score IA léger
    const res = await fetch("/api/engine/analyze-answer", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question: questionText, answer: userAnswer }),
    });
    const result = await res.json();
    const score = result.score || 50;

    // 3. Réaction
    if (score < 40) await play("relance_specific");
    else if (score >= 40 && score < 70) await play("relance_generic_2");
    else if (score >= 70 && score < 90) await play("interrupt_ack");
    else await play("interrupt_continue");
  }

  return { handleAnswer };
}
