"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/singletonSupabaseClient";
import { getSystemVideo } from "@/lib/videoManager";
import { preloadSystemVideos } from "@/lib/preloadSystemVideos";
import { useNovaRealtimeVoice } from "@/hooks/useNovaRealtimeVoice";
import { NOVA_SESSION_CONFIG } from "@/config/novaSessionConfig";
import NovaTimer from "@/components/NovaTimer";
import RecordingControl, { RecordingControlRef } from "@/components/RecordingControl";
import { NovaPlaylistManager } from "@/lib/NovaPlaylistManager";
import { NovaIdleManager_Playlist } from "@/lib/NovaIdleManager_Playlist";
import NovaChatBox_TextOnly, { NovaChatBoxTextOnlyRef } from "@/components/NovaChatBox_TextOnly";
import { enableNovaTranscription } from "@/lib/voice-utils";

export default function NovaEngine_Playlist({ sessionId }: { sessionId: string }) {
  const router = useRouter();
  const recordingRef = useRef<RecordingControlRef>(null);
  const chatRef = useRef<NovaChatBoxTextOnlyRef>(null);
  const playlist = useRef(new NovaPlaylistManager()).current;
  const idleMgrRef = useRef<NovaIdleManager_Playlist | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const [session, setSession] = useState<any>(null);
  const [questions, setQuestions] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [videoSrc, setVideoSrc] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [videoPaused, setVideoPaused] = useState(false);
  const [audioUnlocked, setAudioUnlocked] = useState(false);
  const [lastFollowupText, setLastFollowupText] = useState<string | null>(null);
  const [hovered, setHovered] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);

  const novaVoice = useNovaRealtimeVoice(session?.lang || "en");
  const durationSecSafe = useMemo(
    () => session?.duration_target ?? NOVA_SESSION_CONFIG.durationSec,
    [session]
  );

  /* ======================================================
   🔹 Préchargement des vidéos système
   ====================================================== */
  useEffect(() => {
    (async () => {
      console.log("📦 Préchargement des vidéos système...");
      await preloadSystemVideos("en");
      console.log("✅ Préchargement terminé");
    })();
  }, []);

  /* ======================================================
   🔹 Chargement session + questions
   ====================================================== */
  useEffect(() => {
    (async () => {
      console.log("📡 Chargement de la session et des questions...");
      const res = await fetch(`/api/engine/questions/${sessionId}`);
      const json = await res.json();
      if (!res.ok || !json?.id) {
        alert("❌ Session not found");
        router.push("/dashboard");
        return;
      }
      console.log("✅ Session chargée:", json.id);
      console.log("📊 Nombre de questions:", json.questions?.length || 0);
      setSession(json);
      setQuestions(json.questions || []);
    })();
  }, [sessionId]);

  /* ======================================================
   🔹 Playlist Manager
   ====================================================== */
  useEffect(() => {
    playlist.subscribe((next) => {
      if (!next) {
        console.log("⏸ Playlist vide — attente de clips.");
        return;
      }
      console.log("🎬 Lecture du prochain clip:", next);
      setVideoSrc(next);
    });
  }, [playlist]);

  /* ======================================================
   🔹 Start simulation
   ====================================================== */
  const handleStart = async () => {
    console.log("▶ handleStart triggered");
    if (!session) return;

    const lang = session?.lang || "en";
    const intro1 = await getSystemVideo("intro_en_1", lang);
    const intro2 = await getSystemVideo("intro_en_2", lang);
    const q1 =
      questions[0]?.video_url_en ||
      "https://qpnalviccuopdwfscoli.supabase.co/storage/v1/object/public/videos/system/question_missing.mp4";

    console.log("🎥 intro1:", intro1);
    console.log("🎥 intro2:", intro2);
    console.log("🎥 q1:", q1);

    playlist.add(intro1, intro2, q1);
    setIsPlaying(true);
    setVideoPaused(false);
    setHasStarted(true);
    enableNovaTranscription();
    recordingRef.current?.startRecording();

    const v = videoRef.current;
    if (v) {
      v.muted = true;
      await v.play().catch((err) => console.warn("🔇 Autoplay blocked:", err));
    }
  };

  /* ======================================================
   🔹 Clip terminé → suivant
   ====================================================== */
  const handleEnded = () => {
    console.log("⏹ Clip terminé:", videoSrc);
    playlist.next();
  };

  /* ======================================================
   🔹 Idle Manager
   ====================================================== */
  useEffect(() => {
    if (!session) return;
    idleMgrRef.current = new NovaIdleManager_Playlist({
      lang: session.lang || "en",
      playlist,
      onNextQuestion: async () => {
        const next = questions[currentIndex + 1]?.video_url_en || null;
        console.log("➡️ Passage à la question suivante:", next);
        if (next) {
          setCurrentIndex((i) => i + 1);
          playlist.add(next);
        } else {
          console.log("🏁 Fin des questions → ajout des vidéos de clôture");
          const end1 = await getSystemVideo("nova_end_interview_en", session.lang || "en");
          const end2 = await getSystemVideo("nova_feedback_final", session.lang || "en");
          playlist.add(end1, end2);
        }
      },
      getFollowupText: async () => lastFollowupText,
    });
    console.log("🧠 IdleManager initialisé");
  }, [session, questions, currentIndex, playlist, lastFollowupText]);

  /* ======================================================
   🔹 Chat Nova
   ====================================================== */
  async function handleUserChatMessage(message: string) {
    console.log("💬 User message:", message);
    try {
      const lastQuestion = chatRef.current?.getLastQuestion() || null;
      const res = await fetch("/api/nova-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userMessage: message, lastQuestion }),
      });
      const data = await res.json();
      console.log("🧠 Nova response:", data);
      chatRef.current?.addMessage("nova", data.reply || "I'm here to help!");
    } catch (err) {
      console.error("❌ nova-chat error:", err);
      chatRef.current?.addMessage("nova", "Sorry, I couldn’t process your message.");
    }
  }

  /* ======================================================
   🖼 Render principal
   ====================================================== */
  return (
    <main className="flex h-screen w-screen bg-[#0F111A] text-white overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-12 bg-[#1C1E2A] flex items-center justify-between px-6 border-b border-gray-800 z-10">
        <span className="text-sm font-medium text-gray-300">Nova Stream — Playlist Mode</span>
        <span className="text-xs text-gray-400">{isPlaying ? "Streaming..." : "Ready"}</span>
      </div>

      <div className="flex flex-1 pt-12 overflow-hidden">
        <div
          className="flex-1 flex flex-col items-center justify-center bg-gradient-to-b from-[#1b2030] to-[#0f111a] relative border-r border-gray-800"
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
        >
          <div className="relative w-[90%] aspect-video rounded-xl overflow-hidden border border-gray-700 shadow-[0_0_40px_rgba(80,120,255,0.2)]">
            {videoSrc ? (
              <video
                ref={videoRef}
                src={videoSrc}
                autoPlay
                playsInline
                preload="auto"
                muted={!audioUnlocked}
                onEnded={handleEnded}
                onCanPlay={() => {
                  const v = videoRef.current;
                  if (!v) return;
                  v.play().catch(() => {});
                  console.log("🎥 AutoPlay relancé:", videoSrc);
                }}
                className="w-full h-full object-cover rounded-xl"
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center text-gray-400">
                Click ▶ to start
              </div>
            )}

            {/* ▶ START */}
            {!hasStarted && (
              <button
                onClick={async (e) => {
                  e.stopPropagation();
                  await handleStart();
                }}
                className="absolute inset-0 flex items-center justify-center m-auto w-20 h-20 rounded-full
                           bg-gradient-to-b from-gray-700 via-gray-800 to-gray-900 hover:from-gray-600 hover:via-gray-700 hover:to-gray-800
                           active:scale-95 text-white text-5xl font-extrabold opacity-90 hover:opacity-100 border border-white/30
                           shadow-[0_0_60px_rgba(255,255,255,0.15)] transition-all duration-300 ease-out cursor-pointer animate-[pulse_2s_ease-in-out_infinite]"
              >
                ▶
              </button>
            )}

            {/* ❚❚ PAUSE */}
            {isPlaying && hovered && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  const v = videoRef.current;
                  if (!v) return;
                  v.pause();
                  setVideoPaused(true);
                  setHasStarted(false);
                }}
                className="absolute inset-0 flex items-center justify-center m-auto w-20 h-20 rounded-full
                           bg-gradient-to-b from-gray-700 via-gray-800 to-gray-900 text-white text-5xl font-extrabold border border-white/30
                           shadow-[0_0_60px_rgba(255,255,255,0.15)] opacity-0 hover:opacity-100 transition-opacity duration-500 ease-in-out cursor-pointer"
              >
                ❚❚
              </button>
            )}

            {/* 🔊 AUDIO */}
            {!audioUnlocked && isPlaying && (
              <button
                onClick={async () => {
                  const v = videoRef.current;
                  if (!v) return;
                  v.muted = false;
                  await v.play().catch(() => {});
                  setAudioUnlocked(true);
                }}
                className="absolute bottom-6 left-1/2 -translate-x-1/2 px-8 py-2 rounded-full bg-gradient-to-b from-gray-700 via-gray-800 to-gray-900
                           hover:from-gray-600 hover:via-gray-700 hover:to-gray-800 border border-white/30 text-white font-semibold text-sm
                           shadow-[0_0_40px_rgba(255,255,255,0.15)] transition-all duration-300 ease-out cursor-pointer"
              >
                🔊 Enable sound
              </button>
            )}
          </div>

          <div className="absolute bottom-6 right-8">
            <NovaTimer
              totalMinutes={durationSecSafe / 60}
              onHardStop={async () => {
                console.log("⏹ Fin de session par timer");
                const lang = session?.lang || "en";
                const end1 = await getSystemVideo("nova_end_interview_en", lang);
                const end2 = await getSystemVideo("nova_feedback_final", lang);
                playlist.add(end1, end2);
              }}
            />
          </div>
        </div>

        {/* CHAT + MICRO */}
        <div className="w-[340px] bg-[#0F111A] border-l border-gray-800 flex flex-col">
          <div className="flex-1 overflow-hidden">
            <NovaChatBox_TextOnly ref={chatRef} onUserMessage={handleUserChatMessage} />
          </div>
          <div className="p-3 border-t border-gray-700">
            <RecordingControl
              ref={recordingRef}
              sessionId={sessionId}
              userId={session?.user_id}
              onTranscript={() => {}}
              onSilence={() => idleMgrRef.current?.handleSilence()}
              onSpeaking={() => idleMgrRef.current?.onUserSpeaking()}
            />
          </div>
        </div>
      </div>
    </main>
  );
}