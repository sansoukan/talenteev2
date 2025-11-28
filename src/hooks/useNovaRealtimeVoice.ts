"use client";

import { useEffect, useState } from "react";

/**
 * 🧱 useNovaRealtimeVoice — Mode texte uniquement (final)
 * --------------------------------------------------------
 * - Aucune connexion WebSocket
 * - Ne touche jamais au micro
 * - Coupe automatiquement le micro simulation pendant la voix ElevenLabs
 * - Restaure le micro après lecture
 * - Compatible avec NovaEngine V2
 */

export function useNovaRealtimeVoice(lang: "fr" | "en" = "fr") {
  const [connected, setConnected] = useState(true);

  useEffect(() => {
    console.log("🧱 NovaRealtimeVoice (text-only mode active)");
    return () => {
      console.log("🧹 NovaRealtimeVoice cleaned (no audio connection)");
      setConnected(false);
    };
  }, [lang]);

  /**
   * 🔊 Lecture vocale ElevenLabs (sécurisée)
   * Désactive temporairement le micro simulation
   */
  const speak = async (text: string) => {
    if (!text?.trim()) return;
    try {
      const res = await fetch("/api/nova-speak", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: text, lang }),
      });

      if (!res.ok) throw new Error("Nova speak failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);

      // 🔇 Désactiver micro simulation pendant la lecture
      if (typeof window !== "undefined" && (window as any).pauseSimulationMic) {
        (window as any).pauseSimulationMic();
      }

      const audio = new Audio(url);
      await audio.play();

      // 🔁 Réactiver micro simulation après lecture
      audio.onended = () => {
        if (typeof window !== "undefined" && (window as any).resumeSimulationMic) {
          (window as any).resumeSimulationMic();
        }
      };
    } catch (err) {
      console.warn("⚠️ NovaRealtimeVoice speak() error:", err);
    }
  };

  return {
    connected,
    speak,
    disconnect: () => {
      console.log("🔌 NovaRealtimeVoice disconnected (text-only mode)");
      setConnected(false);
    },
  };
}