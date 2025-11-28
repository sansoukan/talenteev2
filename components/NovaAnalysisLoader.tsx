"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from 'next/navigation';

type NovaAnalysisLoaderProps = {
  sessionId: string;
  /** Optionnel : si fourni, on redirige ici quand l'analyse est prête */
  redirectToWhenReady?: string;
  /** Optionnel : callback si tu veux gérer la suite toi-même */
  onReady?: () => void;
};

export function NovaAnalysisLoader({
  sessionId,
  redirectToWhenReady,
  onReady,
}: NovaAnalysisLoaderProps) {
  const router = useRouter();
  const [elapsedMs, setElapsedMs] = useState(0);
  const [status, setStatus] = useState<"pending" | "ready" | "error">("pending");
  const [messageIndex, setMessageIndex] = useState(0);

  // Messages rotatifs style "consultant"
  const rotatingMessages = useMemo(
    () => [
      "Reading your transcript and detecting key patterns…",
      "Evaluating clarity, structure and confidence signals…",
      "Measuring stress and confidence curves over time…",
      "Rewriting your ideal pitch based on your answers…",
      "Extracting micro-habits to improve faster…",
    ],
    [],
  );

  // Texte adaptatif selon le temps réellement écoulé
  const primarySubtitle = useMemo(() => {
    const s = elapsedMs / 1000;
    if (s < 20) {
      return "This usually takes under a minute.";
    }
    if (s < 60) {
      return "Nova is running a deep analysis of your session.";
    }
    if (s < 120) {
      return "Deep behavioural analysis in progress. Longer sessions may take a bit more time.";
    }
    return "Nova is polishing your personalised report. High-precision scoring needs a few more seconds.";
  }, [elapsedMs]);

  // Progression "intelligente" (sans mentir sur le temps)
  const progress = useMemo(() => {
    const s = elapsedMs / 1000;

    if (status === "ready") return 100;

    if (s <= 20) {
      // 0–20s → 0–45%
      return Math.min(45, (s / 20) * 45);
    }
    if (s <= 60) {
      // 20–60s → 45–75%
      const ratio = (s - 20) / 40;
      return 45 + ratio * 30;
    }
    if (s <= 120) {
      // 60–120s → 75–92%
      const ratio = (s - 60) / 60;
      return 75 + ratio * 17;
    }
    // 120s+ → 92–97%
    return 92 + Math.min(5, (s - 120) / 10);
  }, [elapsedMs, status]);

  // Timer global (elapsed time)
  useEffect(() => {
    const startedAt = performance.now();
    const id = setInterval(() => {
      setElapsedMs(performance.now() - startedAt);
    }, 250);

    return () => clearInterval(id);
  }, []);

  // Rotation des messages secondaires
  useEffect(() => {
    const id = setInterval(() => {
      setMessageIndex((prev) => (prev + 1) % rotatingMessages.length);
    }, 7000);

    return () => clearInterval(id);
  }, [rotatingMessages.length]);

  // Polling du statut d'analyse (une fois toutes les 5s)
  useEffect(() => {
    let stopped = false;

    async function poll() {
      try {
        const res = await fetch(`/api/analysis/status?sessionId=${sessionId}`, {
          cache: "no-store",
        });
        if (!res.ok) throw new Error("Status HTTP " + res.status);

        const json = await res.json();

        if (json.status === "ready") {
          if (stopped) return;
          setStatus("ready");

          // Petit délai pour laisser la barre atteindre 100%
          setTimeout(() => {
            if (onReady) onReady();
            else if (redirectToWhenReady) {
              router.push(redirectToWhenReady);
            }
          }, 500);
        } else if (json.status === "error") {
          setStatus("error");
        } else {
          // pending → on continue à poller
          setTimeout(poll, 5000);
        }
      } catch (err) {
        console.error("NovaAnalysisLoader status poll error:", err);
        setStatus("error");
      }
    }

    poll();

    return () => {
      stopped = true;
    };
  }, [sessionId, redirectToWhenReady, onReady, router]);

  return (
    <div className="min-h-screen w-full bg-[#0A0A0A] text-white flex flex-col items-center justify-center px-6">
      <div className="relative mb-12">
        {/* Outer glow */}
        <div className="absolute inset-0 h-40 w-40 rounded-full bg-gradient-to-br from-blue-500/20 via-indigo-500/20 to-cyan-400/20 blur-3xl" />
        
        {/* Glassmorphic ring */}
        <div className="relative h-28 w-28 rounded-full bg-white/5 backdrop-blur-xl border border-white/10 flex items-center justify-center">
          {/* Inner animated orb */}
          <div className="h-16 w-16 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 animate-pulse shadow-lg shadow-blue-500/50" />
        </div>
      </div>

      <h1 className="text-4xl sm:text-5xl font-semibold tracking-tight mb-4 text-white text-center">
        Nova is analysing your performance
      </h1>

      <p className="text-lg sm:text-xl text-white/60 text-center max-w-2xl mb-3 font-light tracking-tight leading-relaxed">
        {primarySubtitle}
      </p>

      {status !== "error" ? (
        <p className="text-sm sm:text-base text-white/40 text-center max-w-2xl mb-16 font-light min-h-[24px] transition-opacity duration-300">
          {rotatingMessages[messageIndex]}
        </p>
      ) : (
        <p className="text-sm sm:text-base text-amber-400/90 text-center max-w-2xl mb-16 font-light">
          Nova encountered an issue while analysing. You can try again in a moment.
        </p>
      )}

      <div className="w-full max-w-2xl">
        {/* Progress track */}
        <div className="h-1.5 rounded-full bg-white/10 backdrop-blur-sm overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-blue-400 via-indigo-500 to-cyan-400 transition-all ease-out duration-500 shadow-lg shadow-blue-500/30"
            style={{ width: `${progress}%` }}
          />
        </div>
        
        <div className="flex justify-between items-center text-xs text-white/40 mt-3 font-light">
          <span>{Math.round(progress)}%</span>
          <span>
            {status === "ready"
              ? "Report ready"
              : status === "error"
              ? "Waiting to retry"
              : "Live analysis in progress"}
          </span>
        </div>
      </div>
    </div>
  );
}
