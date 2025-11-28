"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import RecordingControl from "./RecordingControl";
import FeedbackPreview from "./FeedbackPreview";
import NovaFinalFeedback from "./NovaFinalFeedback";
import VideoPlayer from "./VideoPlayer";
import { pushMemory } from "@/lib/saveSessionToSupabase";
import { fetchNovaFeedback } from "@/lib/fetchNovaFeedback";

type Props = {
  session: any;
};

type CaseData = {
  id: string;
  theme: string;
  intro_en: string;
  video_intro_en?: string;
  question_1_en?: string;
  question_2_en?: string;
  question_3_en?: string;
  question_4_en?: string;
  question_5_en?: string;
};

export default function NovaCaseEngine({ session }: Props) {
  const [caseData, setCaseData] = useState<CaseData | null>(null);
  const [step, setStep] = useState<number>(0);
  const [feedback, setFeedback] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [assetUrl, setAssetUrl] = useState<string | null>(null);
  const [summary, setSummary] = useState<any | null>(null);

  /** 1️⃣ Chargement du cas d’étude depuis Supabase */
  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("nova_case_library")
        .select("*")
        .eq("is_active", true)
        .ilike("theme", session.domain)
        .limit(1)
        .maybeSingle();

      if (error) console.error("❌ Error loading case:", error.message);
      else if (data) {
        setCaseData(data);
        setAssetUrl(data.video_intro_en || null);
      }
      setLoading(false);
    })();
  }, [session]);

  /** Liste ordonnée des questions */
  const questions = caseData
    ? [
        caseData.question_1_en,
        caseData.question_2_en,
        caseData.question_3_en,
        caseData.question_4_en,
        caseData.question_5_en,
      ].filter(Boolean)
    : [];

  /** 2️⃣ Gestion des réponses */
  async function handleTranscript(text: string) {
    if (!caseData) return;
    const q = questions[step - 1];

    await pushMemory({
      user_id: session.user_id,
      session_id: session.id,
      question_id: `${caseData.id}_q${step}`,
      transcript: text,
      lang: "en",
    });

    const fb = await fetchNovaFeedback("en", "mid");
    setFeedback(fb.text || "");

    // Avance à la question suivante ou synthèse
    if (step < questions.length) {
      setStep((s) => s + 1);
    } else {
      generateSummary();
    }
  }

  /** 3️⃣ Synthèse finale */
  async function generateSummary() {
    const answers = await supabase
      .from("nova_memory")
      .select("transcript")
      .eq("session_id", session.id);

    const joined = (answers.data || [])
      .map((a) => a.transcript)
      .join("\n");

    const payload = {
      question: "Provide a global feedback summary for this case study.",
      answer: joined,
    };
    const res = await fetch("/api/gpt-feedback", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    const json = await res.json();
    setSummary(json.feedback || "Case study complete.");
  }

  if (loading)
    return (
      <div className="text-center text-gray-400 py-10">
        Loading case study…
      </div>
    );

  if (!caseData)
    return (
      <div className="text-center text-red-500 py-10">
        ❌ No case study found for your domain.
      </div>
    );

  return (
    <section className="p-6 bg-gray-900 text-white rounded-xl border border-gray-800">
      {/* INTRO */}
      {step === 0 && (
        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-blue-400">
            Case Study – {caseData.theme}
          </h2>
          {assetUrl ? (
            <VideoPlayer src={assetUrl} controls autoPlay />
          ) : (
            <p className="opacity-80">{caseData.intro_en}</p>
          )}
          <button
            onClick={() => setStep(1)}
            className="px-6 py-2 bg-blue-500 rounded-lg hover:bg-blue-600"
          >
            Start
          </button>
        </div>
      )}

      {/* QUESTIONS */}
      {step > 0 && !summary && (
        <div className="space-y-4">
          <h3 className="text-xl font-semibold">
            Question {step}/{questions.length}
          </h3>
          <p className="opacity-90">{questions[step - 1]}</p>

          <RecordingControl
            maxAnswerSec={180}
            onTranscript={handleTranscript}
            onTimeout={() => setFeedback("Time expired. Moving on...")}
          />

          {feedback && (
            <div className="mt-3">
              <FeedbackPreview text={feedback} />
            </div>
          )}
        </div>
      )}

      {/* SYNTHESIS */}
      {summary && (
        <NovaFinalFeedback
          sessionId={session.id}
          summary={summary}
          onClose={() => (window.location.href = "/dashboard")}
        />
      )}
    </section>
  );
}
