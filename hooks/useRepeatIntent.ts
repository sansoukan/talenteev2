"use client"

//
// ======================================================
//   useRepeatIntent — Detects “repeat question” intent
//   Multi-language (EN/FR/ES) + fuzzy matching
//   Lightweight, production-ready, Nova V3 internal
// ======================================================
//

export function useRepeatIntent() {
  // 🔹 Expressions naturelles que les utilisateurs disent VRAIMENT
  const keywords = [
    // ENGLISH
    "repeat", "say again", "again please", "sorry repeat",
    "could you repeat", "can you repeat",
    "can you say that again", "could you say that again",
    "would you mind repeating", "repeat the question",
    "i didn’t catch", "i didn't catch",
    "i didn’t hear", "i didn't hear",
    "i didn’t understand", "i didn't understand",
    "can you go again", "one more time",
    "sorry?", "pardon?",

    // FRENCH
    "répète", "répéter", "repete", "repeter",
    "tu peux répéter", "vous pouvez répéter",
    "peux tu répéter", "peux-tu répéter",
    "pouvez vous répéter", "pouvez-vous répéter",
    "tu peux redire", "tu peux relire",
    "tu peux redire la question",
    "j’ai pas entendu", "j'ai pas entendu",
    "j’ai pas compris", "j'ai pas compris",
    "je n’ai pas compris", "je n'ai pas compris",
    "répète stp", "répète s’il te plaît", "repete s'il te plait",
    "désolé ?", "excuse moi ?",

    // SPANISH
    "repite", "repita", "otra vez",
    "puedes repetir", "puede repetir",
    "puedes repetir eso", "puede repetir eso",
    "puedes decirlo otra vez",
    "puede repetir la pregunta",
    "no entendí", "no entendi",
    "no escuché", "no escuche",
    "no lo entendí", "no lo entendi",
    "¿puedes repetir", "puedes repetir?"
  ]

  // ------------------------------------------------------
  //   Main detector
  // ------------------------------------------------------
  function checkRepeatIntent(text: string | null | undefined): boolean {
    if (!text) return false

    const lower = text.toLowerCase().trim()

    // tiny fuzzy: ignore accents + apostrophes
    const normalized = lower
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/'/g, " ")

    // Pure keyword includes()
    for (const k of keywords) {
      if (normalized.includes(k.toLowerCase())) {
        return true
      }
    }

    return false
  }

  return { checkRepeatIntent }
}
