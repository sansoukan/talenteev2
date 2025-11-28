"use client";

import Hls from "hls.js";
import { useEffect, useRef, useState } from "react";

type Props = {
  src: string;
  autoPlay?: boolean;
  controls?: boolean;
  style?: React.CSSProperties;
  className?: string;
};

export default function HlsVideo({
  src,
  autoPlay = true,
  controls = true,
  style,
  className,
}: Props) {
  const ref = useRef<HTMLVideoElement | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const video = ref.current;
    if (!video) return;

    const attach = async () => {
      setLoading(true);

      // Safari support natif
      if (video.canPlayType("application/vnd.apple.mpegurl")) {
        video.src = src;
        if (autoPlay) {
          await video.play().catch(() => {});
        }
        setLoading(false);
        return;
      }

      // Hls.js
      if (Hls.isSupported()) {
        const hls = new Hls({ enableWorker: true });
        hls.loadSource(src);
        hls.attachMedia(video);
        hls.on(Hls.Events.MANIFEST_PARSED, async () => {
          if (autoPlay) {
            await video.play().catch(() => {});
          }
          setLoading(false);
        });
        return () => {
          hls.destroy();
        };
      } else {
        // fallback
        video.src = src;
        if (autoPlay) {
          await video.play().catch(() => {});
        }
        setLoading(false);
      }
    };

    attach();
  }, [src, autoPlay]);

  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        background: "var(--bg-card)",
        border: "1px solid var(--border)",
        borderRadius: 8,
        overflow: "hidden",
        ...style,
      }}
      className={className}
    >
      {loading && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "var(--text-muted)",
            fontSize: "0.9rem",
          }}
        >
          ⏳ Chargement vidéo…
        </div>
      )}
      <video
        ref={ref}
        controls={controls}
        playsInline
        style={{
          display: loading ? "none" : "block",
          width: "100%",
          maxHeight: 360,
        }}
      />
    </div>
  );
}
