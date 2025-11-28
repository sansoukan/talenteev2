"use client";

import { useState, useEffect } from "react";
import { getClientUser } from "@/lib/auth";
import FileDropzone from "@/components/FileDropzone";
import CVReportWrapper from "@/components/CVReportWrapper";
import CVImprovements from "@/components/CVImprovements";

function computeMatching(cvStrengths: string[], offerMustHave: string[]): number {
  if (!cvStrengths.length || !offerMustHave.length) return 0;
  const cvTokens = cvStrengths.map((s) => s.toLowerCase());
  const mustTokens = offerMustHave.map((s) => s.toLowerCase());
  let matches = 0;
  mustTokens.forEach((m) => {
    if (cvTokens.some((c) => c.includes(m) || m.includes(c))) {
      matches++;
    }
  });
  return Math.round((matches / mustTokens.length) * 100);
}

export default function ProfileOfferAnalyzer() {
  const [cvText, setCvText] = useState("");
  const [cvFile, setCvFile] = useState<File | null>(null);

  const [offerText, setOfferText] = useState("");
  const [offerFile, setOfferFile] = useState<File | null>(null);
  const [offerUrl, setOfferUrl] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [analysis, setAnalysis] = useState<any>(null);
  const [improvementsData, setImprovementsData] = useState<any>(null);
  const [offerAnalysis, setOfferAnalysis] = useState<any>(null);
  const [matchingScore, setMatchingScore] = useState<number | null>(null);

  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const u = await getClientUser();
      setUserId(u?.id ?? null);
    })();
  }, []);

  async function analyzeAll() {
    if (!userId) {
      setError("⚠️ User not logged in.");
      return;
    }
    if (!cvText.trim() && !cvFile) {
      setError("⚠️ Please provide at least a resume (text or file).");
      return;
    }

    setLoading(true);
    setError(null);
    setAnalysis(null);
    setImprovementsData(null);
    setOfferAnalysis(null);
    setMatchingScore(null);

    try {
      const fd = new FormData();
      if (cvFile) fd.append("file", cvFile);
      else fd.append("text", cvText);
      fd.append("user_id", userId!);
      if (offerText) fd.append("offer", offerText);

      const [resDiag, resImp, resOffer] = await Promise.all([
        fetch("/api/cv/analyze", { method: "POST", body: fd }),
        fetch("/api/cv/improve", { method: "POST", body: fd }),
        offerFile || offerText || offerUrl
          ? (() => {
              if (offerFile) {
                const f = new FormData();
                f.append("file", offerFile);
                return fetch("/api/analysis/offre", { method: "POST", body: f });
              }
              if (offerUrl) {
                return fetch("/api/analysis/offre", {
                  method: "POST",
                  body: JSON.stringify({ url: offerUrl }),
                  headers: { "Content-Type": "application/json" },
                });
              }
              if (offerText) {
                return fetch("/api/analysis/offre", {
                  method: "POST",
                  body: JSON.stringify({ text: offerText }),
                  headers: { "Content-Type": "application/json" },
                });
              }
            })()
          : Promise.resolve(null),
      ]);

      const jsonDiag = await resDiag.json();
      const jsonImp = await resImp.json();
      const jsonOffer = resOffer ? await resOffer.json() : null;

      if (!resDiag.ok) throw new Error(jsonDiag?.error || "Error during resume analysis");
      if (!resImp.ok) throw new Error(jsonImp?.error || "Error during resume improvement");

      setAnalysis(jsonDiag.analysis ?? null);
      setImprovementsData(jsonImp ?? null);

      if (jsonOffer) {
        setOfferAnalysis(jsonOffer.analysis);
        const cvStrengths = jsonDiag.analysis?.strengths ?? [];
        const mustHave = jsonOffer.analysis?.must_have ?? [];
        if (cvStrengths.length && mustHave.length) {
          setMatchingScore(computeMatching(cvStrengths, mustHave));
        }
      }
    } catch (e: any) {
      setError(e.message ?? "Unexpected error during analysis");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-bg-card border border-border rounded-lg p-6 space-y-6">
      <h2 className="text-lg font-bold">📂 Resume & Job Match</h2>

      {/* Resume */}
      <div className="space-y-3">
        <h3 className="font-semibold">📄 Resume</h3>
        <FileDropzone
          onFileSelected={(file) => {
            setCvFile(file);
            setCvText("");
          }}
          accept="application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        />
        <textarea
          placeholder="Paste your resume here (text only)…"
          value={cvText}
          onChange={(e) => {
            setCvText(e.target.value);
            setCvFile(null);
          }}
          className="w-full min-h-[120px] rounded-md border border-border bg-bg p-2 text-sm"
        />
      </div>

      {/* Job offer */}
      <div className="space-y-3">
        <h3 className="font-semibold">📑 Job Offer (optional)</h3>
        <FileDropzone
          onFileSelected={(file) => setOfferFile(file)}
          accept="application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
        />
        <textarea
          placeholder="Paste the job description here (text only)…"
          value={offerText}
          onChange={(e) => setOfferText(e.target.value)}
          className="w-full min-h-[100px] rounded-md border border-border bg-bg p-2 text-sm"
        />
        <input
          type="url"
          placeholder="Or paste the job description URL…"
          value={offerUrl}
          onChange={(e) => setOfferUrl(e.target.value)}
          className="w-full rounded-md border border-border bg-bg p-2 text-sm"
        />
      </div>

      {/* Button */}
      <button
        onClick={analyzeAll}
        disabled={loading}
        className="w-full px-4 py-2 rounded-lg bg-primary text-white font-semibold hover:opacity-90 disabled:opacity-50"
      >
        {loading ? "⏳ Analysis in progress…" : "Run analysis"}
      </button>

      {/* Results */}
      {analysis && <CVReportWrapper analysis={analysis} />}

      {/* CV Improvements */}
      {improvementsData && (
        <CVImprovements
          improvements={Array.isArray(improvementsData?.improvements) ? improvementsData.improvements : []}
          priority_tips={
            improvementsData?.priority_tips ?? {
              high: [],
              medium: [],
              nice_to_have: [],
            }
          }
          narrative_summary={improvementsData?.narrative_summary ?? ""}
        />
      )}

      {error && <p className="text-danger">⚠️ {error}</p>}

      <p className="text-xs text-text-muted">
        ℹ️ Nova never stores your documents, only the analysis results.
      </p>
    </div>
  );
}
