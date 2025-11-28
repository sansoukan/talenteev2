"use client";

import { useEffect, useState } from "react";

/**
 * Hook pour afficher un texte avec un effet "machine à écrire".
 * @param text - le texte complet à afficher
 * @param speed - vitesse de frappe (ms par caractère, par défaut 25)
 * @returns texte affiché progressivement
 */
export function useTypingEffect(text: string, speed: number = 25) {
  const [displayed, setDisplayed] = useState("");

  useEffect(() => {
    if (!text) return;
    setDisplayed(""); // reset
    let i = 0;
    const interval = setInterval(() => {
      setDisplayed((prev) => prev + text[i]);
      i++;
      if (i >= text.length) clearInterval(interval);
    }, speed);
    return () => clearInterval(interval);
  }, [text, speed]);

  return displayed;
}
