"use client";

import { useEffect, useRef } from "react";

interface VideoPlayerProps {
  src: string;
  autoPlay?: boolean;
  muted?: boolean;
  loop?: boolean;
  playsInline?: boolean;
  onReady?: () => void;
  onEnded?: () => void;
  onUnlockAudio?: () => void;
  className?: string;
}

/**
 * =========================================================
 * 🎥 VideoPlayer — Lecteur persistant Nova
 * ---------------------------------------------------------
 * ✅ Garde le contexte audio entre les clips
 * ✅ Enchaîne automatiquement les vidéos
 * ✅ Zéro recréation DOM (pas de flash)
 * =========================================================
 */
export default function VideoPlayer({
  src,
  autoPlay = true,
  muted = true,
  loop = false,
  playsInline = true,
  onReady,
  onEnded,
  onUnlockAudio,
  className,
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // ⏩ Met à jour la source sans recréer l'élément
  useEffect(() => {
    const v = videoRef.current;
    if (!v || !src) return;

    // changer la source en douceur
    if (v.src !== src) {
      v.src = src;
      v.load();
    }

    const tryPlay = async () => {
      try {
        if (autoPlay) {
          await v.play();
          onReady?.();
        }
      } catch (err) {
        console.warn("🔇 Autoplay bloqué:", err);
      }
    };

    const handleCanPlay = () => tryPlay();
    v.addEventListener("canplay", handleCanPlay);

    return () => v.removeEventListener("canplay", handleCanPlay);
  }, [src, autoPlay, onReady]);

  // 🎧 Gestion du déverrouillage audio (clic utilisateur)
  const unlockAudio = async () => {
    const v = videoRef.current;
    if (!v) return;
    try {
      v.muted = false;
      await v.play();
      onUnlockAudio?.();
    } catch (err) {
      console.warn("🔇 Impossible d’activer le son :", err);
    }
  };

  return (
    <video
      ref={videoRef}
      className={className || "w-full h-full object-cover rounded-xl"}
      muted={muted}
      playsInline={playsInline}
      loop={loop}
      onEnded={onEnded}
      onClick={unlockAudio} // clic = activer le son
    />
  );
}
