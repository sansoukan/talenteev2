"use client";

import { useEffect, useRef, useState } from "react";
import VideoPlayer from "./VideoPlayer";
import { motion, AnimatePresence } from "framer-motion";

/**
 * =========================================================
 * 🎬 VideoPlayerInteractive — UX Netflix-like
 * ---------------------------------------------------------
 * ✅ Clique ou espace = play / pause
 * ✅ Bouton visible au survol
 * ✅ Fonctionne sur mobile (tap)
 * ✅ Repose sur VideoPlayer (zéro recréation DOM)
 * =========================================================
 */
export default function VideoPlayerInteractive({
  src,
  className,
}: {
  src: string;
  className?: string;
}) {
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [showControls, setShowControls] = useState(false);

  /* 🎹 Toggle via espace */
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        e.preventDefault();
        togglePlay();
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  });

  /* 🎬 Toggle Play/Pause */
  const togglePlay = async () => {
    const video = videoRef.current;
    if (!video) return;

    if (isPlaying) {
      video.pause();
      setIsPlaying(false);
    } else {
      try {
        await video.play();
        setIsPlaying(true);
      } catch (err) {
        console.warn("⚠️ Lecture bloquée :", err);
      }
    }
  };

  return (
    <div
      ref={wrapperRef}
      className={`relative w-full h-full group ${className || ""}`}
      onClick={togglePlay}
      onMouseEnter={() => setShowControls(true)}
      onMouseLeave={() => setShowControls(false)}
    >
      {/* === VIDEO === */}
      <VideoPlayer
        ref={videoRef as any}
        src={src}
        autoPlay
        muted
        loop={false}
        playsInline
        className="w-full h-full object-cover rounded-xl"
      />

      {/* === OVERLAY === */}
      <motion.div
        className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
      />

      {/* === ICONES PLAY/PAUSE === */}
      <AnimatePresence>
        {showControls && (
          <motion.div
            key={isPlaying ? "pause" : "play"}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 flex items-center justify-center text-white pointer-events-none"
          >
            {isPlaying ? (
              <svg width="70" height="70" viewBox="0 0 70 70" fill="none">
                <rect x="20" y="20" width="8" height="30" fill="white" />
                <rect x="42" y="20" width="8" height="30" fill="white" />
              </svg>
            ) : (
              <svg width="70" height="70" viewBox="0 0 70 70" fill="none">
                <path
                  d="M25 20L50 35L25 50V20Z"
                  fill="white"
                  stroke="white"
                  strokeWidth="2"
                />
              </svg>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
