"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/src/lib/supabaseClient";
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
} from "recharts";

type SessionRow = {
  id: string;
  started_at: string | null;
  ended_at: string | null;
  duration: number | null;
  score: number | null;
  score_global: number | null;
  detailed_report: string | null;
  feedback_text: string | null;
  is_premium: boolean | null;
  lang: string | null;
  type: string | null;
  niveau: string | null;
  summary_json: {
    strengths?: string[];
    weaknesses?: string[];
    recommendations?: string[];
  } | null;
  axes_improvement: {
    axis: string;
    score: number;
    comment: string;
    recommendation: string;
    resource?: string | null;
  }[] | null;
  domain?: string | null;
  role_target?: string | null;
};

type MemoryRow = {
  id: string;
  question_id: string | null;
  reponse: string | null;
  feedback: string | null;
  score: number | null;
  tag: string | null;
  created_at: string;
  question?: {
    question_en: string | null;
    expected_answer_en: string | null;
    expected_answer_fr: string | null;
  } | null;
};

type EmotionsRow = {
  eye_contact: number | null;
  smiles: number | null;
  hesitations: number | null;
  tone: string | null;
  posture_score: number | null;
  stress?: number | null;
  confidence?: number | null;
  authenticity_score?: number | null;
};

type AnalysisRow = {
  cv: string | null;
  offer: string | null;
  result_text: string | null;
};

export default function NovaReport({ sessionId }: { sessionId?: string }) {
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<SessionRow | null>(null);
  const [memory, setMemory] = useState<MemoryRow[]>([]);
  const [emotions, setEmotions] = useState<EmotionsRow[]>([]);
  const [analysis, setAnalysis] = useState<AnalysisRow | null>(null);
  const [error, setError] = useState<string | null>(null);

  const dateFmt = (d?: string | null) => (d ? new Date(d).toLocaleString() : "—");

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);

        const sessionQuery = sessionId
          ? supabase
              .from("nova_sessions")
              .select("*, summary_json, axes_improvement, score_global")
              .eq("id", sessionId)
              .maybeSingle()
          : supabase
              .from("nova_sessions")
              .select("*, summary_json, axes_improvement, score_global")
              .order("started_at", { ascending: false })
              .limit(1)
              .maybeSingle();

        const { data: ses, error: sesErr } = await sessionQuery;
        if (sesErr) throw sesErr;
        if (!ses) throw new Error("No session found.");
        const currentSession = ses as SessionRow;
        setSession(currentSession);

        // Charger le reste en parallèle
        const [memRes, emoRes, anaRes] = await Promise.all([
          supabase
            .from("nova_memory")
            .select(`
              id,question_id,reponse,feedback,score,tag,created_at,
              question:question_id (question_en, expected_answer_en, expected_answer_fr)
            `)
            .eq("session_id", currentSession.id)
            .order("created_at", { ascending: true }),
          supabase
            .from("nova_emotions")
            .select(
              "eye_contact,smiles,hesitations,tone,posture_score,stress,confidence,authenticity_score"
            )
            .eq("session_id", currentSession.id),
          supabase
            .from("nova_analysis")
            .select("cv,offer,result_text")
            .eq("session_id", currentSession.id)
            .maybeSingle(),
        ]);

        if (memRes.error) throw memRes.error;
        if (emoRes.error) throw emoRes.error;
        if (anaRes.error) throw anaRes.error;

        setMemory((memRes.data as MemoryRow[]) ?? []);
        setEmotions((emoRes.data as EmotionsRow[]) ?? []);
        setAnalysis((anaRes.data as AnalysisRow) ?? null);
      } catch (e: any) {
        setError(e?.message ?? JSON.stringify(e));
      } finally {
        setLoading(false);
      }
    })();
  }, [sessionId]);

  // Agrégations simples
  const agg = useMemo(() => {
    const avg = (arr: number[]) => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0);
    const scores = memory.map((m) => m.score ?? 0);
    const avgScore = Math.round(avg(scores) * 100) / 100 || null;
    const hes = emotions.map((e) => e.hesitations ?? 0);
    const avgHes = Math.round(avg(hes) * 100) / 100 || null;
    const eye = emotions.map((e) => e.eye_contact ?? 0);
    const avgEye = Math.round(avg(eye) * 100) / 100 || null;
    return { avgScore, avgHes, avgEye };
  }, [memory, emotions]);

  // Axes comportementaux
  const axes = useMemo(() => {
    const avg = (arr: number[]) => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0);
    const eye = avg(emotions.map((e) => e.eye_contact ?? 0));
    const conf = avg(emotions.map((e) => e.confidence ?? 0));
    const hes = avg(emotions.map((e) => e.hesitations ?? 0));
    const stress = avg(emotions.map((e) => e.stress ?? 0));
    const post = avg(emotions.map((e) => e.posture_score ?? 0));
    const smiles = avg(emotions.map((e) => e.smiles ?? 0));
    const auth = avg(emotions.map((e) => e.authenticity_score ?? 0));
    const comm = Math.max(0, Math.min(100, Math.round((eye + conf - hes - stress + 400) / 8)));
    const lead = Math.max(0, Math.min(100, Math.round((post + smiles + auth - stress + 300) / 7.5)));
    const probScores = memory
      .filter((m) =>
        ["strategy", "analysis", "problem_solving"].includes((m.tag || "").toLowerCase())
      )
      .map((m) => m.score ?? 0);
    const avgProb = avg(probScores);
    const prob = Math.max(0, Math.min(100, Math.round(avgProb || comm)));
    const presence = Math.round((eye + conf + post + smiles + auth - stress - hes / 2 + 400) / 9);
    return { communication: comm, leadership: lead, problemSolving: prob, presence };
  }, [emotions, memory]);

  const verdict = useMemo(() => {
    const { communication, leadership, problemSolving } = axes;
    const lowest = Math.min(communication, leadership, problemSolving);
    if (lowest < 50)
      return "Potential detected, but clarity and structure need strengthening.";
    if (lowest < 70)
      return "Solid fundamentals. Work on tone and influence to raise impact.";
    return "Excellent balance between reasoning, posture and communication.";
  }, [axes]);

  const coachInsight =
    axes.communication < 60
      ? "Practice expressing your ideas in 3 short steps: situation, action, result."
      : axes.leadership < 60
      ? "Try to engage others by asking questions before giving your view."
      : axes.problemSolving < 60
      ? "Train your reasoning by explaining how you’d solve a real case aloud."
      : "Keep refining rhythm and tone — ready for advanced simulations.";

  const radarData = [
    { axis: "Communication", value: axes.communication },
    { axis: "Leadership", value: axes.leadership },
    { axis: "Problem Solving", value: axes.problemSolving },
  ];

  if (loading) return <div>⏳ Loading report…</div>;
  if (error) return <div style={{ color: "var(--danger)" }}>⚠️ {error}</div>;
  if (!session) return <div>No session found.</div>;

  const minutes =
    session.duration ??
    (session.started_at && session.ended_at
      ? Math.round(
          (new Date(session.ended_at).getTime() -
            new Date(session.started_at).getTime()) /
            60000
        )
      : 0);

  return (
    <div
      id="nova-report"
      style={{
        border: "1px solid var(--border)",
        borderRadius: 12,
        padding: 20,
        background: "var(--bg-card)",
        color: "var(--text)",
      }}
    >
      {/* Header */}
      <header
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginBottom: 16,
        }}
      >
        <div>
          <h2 style={{ margin: 0 }}>Nova Report – Session</h2>
          <div style={{ opacity: 0.8 }}>
            <div>
              Type/Level: {session.type ?? "—"} / {session.niveau ?? session.role_target ?? "—"}
            </div>
            <div>Language: {session.lang ?? "en"}</div>
            <div>Domain: {session.domain ?? "—"}</div>
          </div>
        </div>
        <div style={{ textAlign: "right", opacity: 0.8 }}>
          <div>Start: {dateFmt(session.started_at)}</div>
          <div>End: {dateFmt(session.ended_at)}</div>
          <div>Duration: {minutes} min</div>
        </div>
      </header>

      {/* Résumé Section */}
      {session.summary_json && (
        <section
          style={{
            border: "1px solid var(--border)",
            borderRadius: 8,
            padding: 12,
            marginBottom: 16,
            background: "var(--bg-soft)",
          }}
        >
          <h3 style={{ marginTop: 0 }}>🧾 Summary</h3>
          {session.summary_json.strengths && (
            <p>
              <strong>Strengths:</strong> {session.summary_json.strengths.join(", ")}
            </p>
          )}
          {session.summary_json.weaknesses && (
            <p>
              <strong>Weaknesses:</strong> {session.summary_json.weaknesses.join(", ")}
            </p>
          )}
          {session.summary_json.recommendations && (
            <p>
              <strong>Recommendations:</strong> {session.summary_json.recommendations.join(", ")}
            </p>
          )}
        </section>
      )}

      {/* Scores */}
      <section
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4,1fr)",
          gap: 12,
          marginBottom: 16,
        }}
      >
        {[
          ["Global Score", session.score_global],
          ["Average Q Score", agg.avgScore],
          ["Avg Hesitations", agg.avgHes],
          ["Avg Eye Contact", agg.avgEye],
        ].map(([label, value]) => (
          <div key={label} style={{ border: "1px solid var(--border)", borderRadius: 8, padding: 12 }}>
            <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{label}</div>
            <div style={{ fontSize: 22, fontWeight: 700 }}>{value ?? "—"}</div>
          </div>
        ))}
      </section>

      {/* Presence Index */}
      <section
        style={{
          border: "1px solid var(--border)",
          borderRadius: 8,
          padding: 12,
          marginBottom: 16,
          background: "var(--bg-soft)",
        }}
      >
        <h3 style={{ marginTop: 0 }}>✨ Nova Presence Index</h3>
        <div style={{ fontSize: 26, fontWeight: 700 }}>{axes.presence}/100</div>
        <p style={{ fontSize: 13, color: "var(--text-muted)" }}>
          Calculated from eye contact, confidence, posture, smiles and authenticity – adjusted for stress and hesitations.
        </p>
      </section>

      {/* Radar */}
      <section
        aria-label="Behavioral Radar"
        style={{
          border: "1px solid var(--border)",
          borderRadius: 8,
          padding: 12,
          marginBottom: 16,
          background: "var(--bg-soft)",
        }}
      >
        <h3 style={{ marginTop: 0 }}>🕸️ Behavioral Axes</h3>
        <div style={{ width: "100%", height: 320 }}>
          <ResponsiveContainer>
            <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
              <PolarGrid stroke="#555" />
              <PolarAngleAxis dataKey="axis" stroke="#999" />
              <PolarRadiusAxis domain={[0, 100]} stroke="#777" />
              <Radar
                name="Axes"
                dataKey="value"
                stroke="#3b82f6"
                fill="#3b82f6"
                fillOpacity={0.5}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* Verdict + Coach Insight */}
      <section
        style={{
          border: "1px solid var(--border)",
          borderRadius: 8,
          padding: 12,
          marginBottom: 16,
          background: "var(--bg-soft)",
        }}
      >
        <h3 style={{ marginTop: 0 }}>🧠 Nova’s Verdict</h3>
        <p>{verdict}</p>
        <h4 style={{ marginTop: 12 }}>💡 Nova Coach Insight</h4>
        <p>{coachInsight}</p>
      </section>

      {/* Signature */}
      <footer
        style={{
          textAlign: "center",
          marginTop: 24,
          paddingTop: 12,
          borderTop: "1px solid var(--border)",
          color: "var(--text-muted)",
          fontSize: 13,
        }}
      >
        Generated by <strong style={{ color: "var(--primary)" }}>Nova</strong> — your AI career coach.
      </footer>
    </div>
  );
}
