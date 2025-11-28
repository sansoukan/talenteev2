"use client";
import { useState } from "react";
import { Play, Pause } from "lucide-react";

export default function VideoControls({ videoRef }: { videoRef: React.RefObject<HTMLVideoElement> }) {
  const [playing, setPlaying] = useState(true);

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current.play();
      setPlaying(true);
    } else {
      videoRef.current.pause();
      setPlaying(false);
    }
  };

  return (
    <button
      onClick={togglePlay}
      className="absolute bottom-6 left-6 p-3 bg-black/50 hover:bg-black/70 rounded-full text-white transition"
      title={playing ? "Pause video" : "Play video"}
    >
      {playing ? <Pause size={22} /> : <Play size={22} />}
    </button>
  );
}