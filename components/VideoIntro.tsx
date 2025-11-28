"use client";

import { useEffect, useState } from "react";
import VideoPlayer from "./VideoPlayer";

type Props = {
  src?: string;             // facultatif, sinon fetch /api/nova-intro
  autoPlay?: boolean;
  onEnded?: () => void;
};

export default function VideoIntro({ src, autoPlay = true, onEnded }: Props) {
  const [url, setUrl] = useState<string | null>(src ?? null);
  const [loading, setLoading] = useState<boolean>(!src);

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (src) return;
      try {
        setLoading(true);
        const res = await fetch("/api/nova-intro", { cache: "no-store" });
        const j = await res.json();
        if (!mounted) return;
        setUrl(j?.url ?? null);
      } catch {
        if (mounted) setUrl(null);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [src]);

  if (loading) return <div>Chargement de l’introduction…</div>;
  if (!url) return <div style={{ opacity: 0.7 }}>Introduction non disponible.</div>;

  return (
    <div>
      <VideoPlayer
        src={url}
        autoPlay={autoPlay}
        controls
        onReady={() => { /* hook si besoin */ }}
      />
      {/* Certaines versions de VideoPlayer ne remontent pas l'ended → on garde un listener natif en plus */}
      <video
        style={{ display: "none" }}
        onEnded={onEnded}
      />
    </div>
  );
}
