"use client";

import { useEffect, useRef, useState } from "react";

type ReactionType = "idle" | "listening" | "nodding" | "smile" | "thinking";

/**
 * NovaReactionsManager V5 — Micro désactivé
 * ----------------------------------------
 * 🎞️ Gère les réactions vidéo de Nova sans micro
 * 🧱 Aucune détection audio (text-only mode)
 * 💫 Maintient idle loop et micro-expressions
 */

const CLIPS: Record<ReactionType, string[]> = {
  idle: ["/videos/reactions/neutral_1.mp4"],
  listening: [
    "/videos/reactions/listening_1.mp4",
    "/videos/reactions/listening_2.mp4",
  ],
  nodding: [
    "/videos/reactions/nodding_1.mp4",
    "/videos/reactions/nodding_2.mp4",
  ],
  smile: [
    "/videos/reactions/smile_1.mp4",
    "/videos/reactions/smile_2.mp4",
  ],
  thinking: [
    "/videos/reactions/thinking_1.mp4",
    "/videos/reactions/thinking_2.mp4",
  ],
};

export default function NovaReactionsManager({
  visible = true,
  micReactive = false, // 🔒 désactivé par défaut
  autoIdleLoop = true,
}: {
  visible?: boolean;
  micReactive?: boolean;
  autoIdleLoop?: boolean;
}) {
  const [current, setCurrent] = useState<ReactionType>("idle");
  const [clip, setClip] = useState<string>(CLIPS.idle[0]);
  const [isPlaying, setIsPlaying] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  /* ======================================================
     🧱 Micro désactivé
  ====================================================== */
  useEffect(() => {
    if (micReactive) {
      console.log("⚠️ micReactive ignoré — le micro est désactivé dans cette version.");
    } else {
      console.log("🎙 NovaReactionsManager — text-only mode (no mic active).");
    }
  }, [micReactive]);

  /* ======================================================
     🔁 Boucle Idle + micro-mouvements
  ====================================================== */
  useEffect(() => {
    if (!autoIdleLoop) return;
    const timer = setInterval(() => {
      if (current === "idle") {
        const rand = Math.random();
        if (rand < 0.6) play("thinking");
        else if (rand < 0.9) play("smile");
        else play("idle");
      }
    }, 9000 + Math.random() * 4000);
    return () => clearInterval(timer);
  }, [current, autoIdleLoop]);

  /* ======================================================
     🎞 Gestion clip
  ====================================================== */
  function play(type: ReactionType) {
    const opts = CLIPS[type];
    const file = opts[Math.floor(Math.random() * opts.length)];
    setCurrent(type);
    setClip(file);
    setIsPlaying(true);

    if (videoRef.current) {
      videoRef.current.src = file;
      videoRef.current.play().catch(() => {});
    }
  }

  /* ======================================================
     🔗 Interface globale (NovaReactionSequencer / Engine)
  ====================================================== */
  useEffect(() => {
    (window as any).reactionManager = {
      playIdle: () => play("idle"),
      playListening: () => play("listening"),
      playSmile: () => play("smile"),
      playNod: () => play("nodding"),
      playThinking: () => play("thinking"),
      stop: () => setIsPlaying(false),
    };
  }, []);

  /* ======================================================
     👁️ Micro animations (respiration subtile)
  ====================================================== */
  useEffect(() => {
    if (!videoRef.current) return;
    let angle = 0;
    const animate = () => {
      angle += 0.002;
      const scale = 1 + Math.sin(angle * 2) * 0.004;
      const rotate = Math.sin(angle * 1.2) * 0.8;
      videoRef.current!.style.transform = `scale(${scale}) rotate(${rotate}deg)`;
      requestAnimationFrame(animate);
    };
    animate();
  }, []);

  if (!visible) return null;

  return (
    <video
      ref={videoRef}
      src={clip}
      autoPlay
      muted
      playsInline
      onEnded={() => {
        setIsPlaying(false);
        play("idle");
      }}
      className={`rounded-2xl shadow-lg transition-all duration-700 ease-in-out ${
        isPlaying ? "opacity-100" : "opacity-80"
      }`}
      style={{
        width: 340,
        height: 220,
        objectFit: "cover",
        border: "1px solid rgba(255,255,255,0.15)",
        borderRadius: 16,
        background: "black",
        boxShadow: "0 0 12px rgba(0,0,0,0.4)",
      }}
    />
  );
}