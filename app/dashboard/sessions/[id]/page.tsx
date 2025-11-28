"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";

export default function SessionDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const sessionId = params.id;

  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [audio, setAudio] = useState<HTMLAudioElement | null>(null);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("nova_sessions")
        .select(`
          id,
          created_at,
          domain,
          sub_domain,
          type_entretien,
          score_global,
          final_feedback_text,
          final_feedback_summary,
          final_feedback_axes,
          final_feedback_audio,
          clarity_overall,
          structure_overall,
          communication_overall,
          confidence_overall,
          behavior_summary,
          detailed_report
        `)
        .eq("id", sessionId)
        .maybeSingle();

      if (error) console.error("❌ Error loading session:", error);
      setSession(data);
      setLoading(false);

      if (data?.final_feedback_audio) {
        const audioObj = new Audio(`data:audio/mp3;base64,${data.final_feedback_audio}`);
        setAudio(audioObj);
      }
    })();
  }, [sessionId]);

  if (loading) {
    return (
      <main className="h-screen flex items-center justify-center bg-black text-white">
        <p className="text-gray-400 animate-pulse text-lg">Loading session…</p>
      </main>
    );
  }

  if (!session) {
    return (
      <main className="h-screen flex items-center justify-center bg-black text-white">
        <p className="text-red-400">Session not found.</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-black text-white px-8 py-10">
      {/* HEADER */}
      <div className="mb-10">
        <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-blue-400 to-purple-300 bg-clip-text text-transparent">
          Session Overview
        </h1>
        <p className="text-gray-500 text-sm mt-1">
          {new Date(session.created_at).toLocaleString()}
        </p>
      </div>

      {/* CARD */}
      <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-gray-900/60 to-black/40 backdrop-blur-xl shadow-xl p-8 space-y-10">

        {/* SESSION INFO */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm text-gray-400">
          <p>
            <span className="text-gray-500">Type: </span>
            <span className="text-white">{session.type_entretien?.replace("_", " ")}</span>
          </p>

          <p>
            <span className="text-gray-500">Domain: </span>
            <span className="text-white">
              {session.domain} {session.sub_domain && `· ${session.sub_domain}`}
            </span>
          </p>

          <p>
            <span className="text-gray-500">Score: </span>
            <span className="text-blue-400 font-semibold">
              {session.score_global ?? "—"}
            </span>
          </p>
        </div>

        <hr className="border-white/10" />

        {/* SUMMARY */}
        <section>
          <h2 className="text-xl font-semibold mb-2">Summary</h2>
          <p className="text-gray-300">{session.final_feedback_summary}</p>
        </section>

        {/* FULL FEEDBACK */}
        <section>
          <h2 className="text-xl font-semibold mb-2">Detailed Feedback</h2>
          <p className="text-gray-300 whitespace-pre-line leading-relaxed">
            {session.final_feedback_text}
          </p>
        </section>

        {/* AUDIO */}
        {audio && (
          <section className="mt-4">
            <button
              onClick={() => audio.play()}
              className="px-4 py-2 bg-white/10 border border-white/10 rounded-lg hover:bg-white/20 transition text-sm"
            >
              ▶️ Play Audio Feedback
            </button>
          </section>
        )}

        {/* AXES */}
        {Array.isArray(session.final_feedback_axes) && (
          <section>
            <h2 className="text-xl font-semibold mb-3">Key Improvement Axes</h2>
            <ul className="list-disc list-inside space-y-2 text-gray-300">
              {session.final_feedback_axes.map((axis: string, i: number) => (
                <li key={i}>{axis}</li>
              ))}
            </ul>
          </section>
        )}

        {/* BEHAVIOR SUMMARY */}
        {session.behavior_summary && (
          <section>
            <h2 className="text-xl font-semibold mb-3">Behavioral Analysis</h2>
            <p className="text-gray-300 whitespace-pre-line">
              {session.behavior_summary}
            </p>
          </section>
        )}

        {/* EXTENDED REPORT */}
        {session.detailed_report && (
          <section>
            <h2 className="text-xl font-semibold mb-3">Extended Report</h2>
            <p className="text-gray-300 whitespace-pre-line">
              {session.detailed_report}
            </p>
          </section>
        )}

        {/* BUTTONS */}
        <div className="flex gap-4 pt-6">
          <button
            onClick={() => router.push("/dashboard/sessions")}
            className="px-4 py-2 bg-white/10 border border-white/10 rounded-lg hover:bg-white/20 transition"
          >
            ← Back to Sessions
          </button>

          <button
            onClick={() => window.open(`/api/report/pdf?session_id=${sessionId}`, "_blank")}
            className="px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg hover:opacity-90 transition"
          >
            📄 Download PDF Report
          </button>
        </div>
      </div>
    </main>
  );
}