"use client";

import { useEffect, useRef, useState } from "react";

type ReactionType = "idle" | "listening" | "nodding" | "smile" | "thinking";

/**
 * NovaReactionsManager V6 — Micro désactivé
 * ----------------------------------------
 * 🎥 Anime Nova sans écoute micro
 * 💫 Garde idle loop, sourire, regard
 * 🧱 Aucun accès audio / getUserMedia
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
  micReactive = false, // 🔒 Désactivé par défaut
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
     🔇 Micro complètement désactivé
  ====================================================== */
  useEffect(() => {
    if (micReactive) {
      console.warn("⚠️ micReactive ignoré — mode texte uniquement");
    } else {
      console.log("🎙️ NovaReactionsManager — micro désactivé (text-only mode)");
    }
  }, [micReactive]);

  /* ======================================================
     🔁 Idle Loop automatique (pas de micro)
  ====================================================== */
  useEffect(() => {
    if (!autoIdleLoop) return;
    const timer = setInterval(() => {
      if (current === "idle") {
        const rand = Math.random();
        if (rand < 0.5) play("thinking");
        else if (rand < 0.8) play("smile");
        else play("idle");
      }
    }, 9000 + Math.random() * 4000);
    return () => clearInterval(timer);
  }, [current, autoIdleLoop]);

  /* ======================================================
     🎞 Gestion des clips vidéo
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
     🔗 Interface globale (NovaEngine)
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
     👁 Micro-animations (respiration, regard)
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