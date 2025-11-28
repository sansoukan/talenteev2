"use client";

import React from "react";

type Scores = {
  hard_skills: number;
  soft_skills: number;
  leadership: number;
  business_impact: number;
  experience: number;
  education: number;
  languages: number;
};

type Strength = { point: string; explanation: string };
type Gap = { point: string; impact: string };
type Tip = { recommendation: string; why: string; how: string };

type Report = {
  intro?: string;
  strengths_section?: string;
  gaps_section?: string;
  recommendations_section?: string;
  conclusion?: string;
};

type Analysis = {
  role_detected?: string;
  match_percentage?: number;
  scores?: Scores;
  strengths?: Strength[] | string[];
  gaps?: Gap[] | string[];
  tips?: Tip[] | string[];
  report?: Report;
};

export default function CVReport({ analysis }: { analysis: Analysis }) {
  if (!analysis?.report) {
    return (
      <p className="text-sm text-gray-400">
        ⚠️ No analysis available. Please upload a resume and try again.
      </p>
    );
  }

  const {
    role_detected,
    match_percentage,
    scores,
    strengths = [],
    gaps = [],
    tips = [],
    report: { intro, strengths_section, gaps_section, recommendations_section, conclusion } = {},
  } = analysis;

  // Dynamic color for score bars
  const getScoreColor = (score: number | undefined) => {
    if (score === undefined) return "bg-gray-500";
    if (score >= 70) return "bg-green-500";
    if (score >= 40) return "bg-yellow-500";
    return "bg-red-500";
  };

  const renderScoreBar = (label: string, value: number) => (
    <div key={label}>
      <div className="flex justify-between text-xs text-gray-300 mb-1">
        <span>{label}</span>
        <span>{value}%</span>
      </div>
      <div className="w-full h-2 bg-gray-700 rounded">
        <div
          className={`h-2 rounded ${getScoreColor(value)}`}
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );

  return (
    <div className="space-y-6 p-6 rounded-lg border border-border bg-black/30">
      <h2 className="text-xl font-bold">📊 Resume Analysis Report</h2>

      {/* Detected role */}
      {role_detected && (
        <p className="text-sm text-gray-300">
          🔎 Detected role: <span className="font-semibold">{role_detected}</span>
        </p>
      )}

      {/* Global score */}
      {match_percentage !== undefined && (
        <div>
          <h3 className="font-semibold mb-1">🎯 Match with Job Offer</h3>
          <div className="w-full h-3 bg-gray-700 rounded overflow-hidden">
            <div
              className={`h-3 ${getScoreColor(match_percentage)}`}
              style={{ width: `${match_percentage}%` }}
            />
          </div>
          <p className="text-xs text-gray-300 mt-1">
            {match_percentage}% overall compatibility
          </p>
        </div>
      )}

      {/* Detailed scores */}
      {scores && (
        <div>
          <h3 className="font-semibold mb-2">📈 Detailed Scores</h3>
          <div className="space-y-2">
            {renderScoreBar("Hard skills", scores.hard_skills)}
            {renderScoreBar("Soft skills", scores.soft_skills)}
            {renderScoreBar("Leadership", scores.leadership)}
            {renderScoreBar("Business impact", scores.business_impact)}
            {renderScoreBar("Experience", scores.experience)}
            {renderScoreBar("Education", scores.education)}
            {renderScoreBar("Languages", scores.languages)}
          </div>
        </div>
      )}

      {/* Overview */}
      {intro && (
        <section>
          <h3 className="font-semibold text-primary">🔎 Overview</h3>
          <p className="text-sm leading-relaxed text-gray-200 mt-1">{intro}</p>
        </section>
      )}

      {/* Strengths */}
      {Array.isArray(strengths) && strengths.length > 0 ? (
        <section>
          <h3 className="font-semibold text-green-400">💪 Strengths</h3>
          <ul className="list-disc list-inside space-y-1 text-sm text-gray-200 mt-1">
            {(strengths as Strength[]).map((s, i) =>
              typeof s === "string" ? (
                <li key={i}>{s}</li>
              ) : (
                <li key={i}>
                  <span className="font-semibold">{s.point}:</span> {s.explanation}
                </li>
              )
            )}
          </ul>
        </section>
      ) : (
        strengths_section && (
          <section>
            <h3 className="font-semibold text-green-400">💪 Strengths</h3>
            <p className="text-sm leading-relaxed text-gray-200 mt-1">{strengths_section}</p>
          </section>
        )
      )}

      {/* Gaps */}
      {Array.isArray(gaps) && gaps.length > 0 ? (
        <section>
          <h3 className="font-semibold text-red-400">⚠️ Gaps</h3>
          <ul className="list-disc list-inside space-y-1 text-sm text-gray-200 mt-1">
            {(gaps as Gap[]).map((g, i) =>
              typeof g === "string" ? (
                <li key={i}>{g}</li>
              ) : (
                <li key={i}>
                  <span className="font-semibold">{g.point}:</span> {g.impact}
                </li>
              )
            )}
          </ul>
        </section>
      ) : (
        gaps_section && (
          <section>
            <h3 className="font-semibold text-red-400">⚠️ Gaps</h3>
            <p className="text-sm leading-relaxed text-gray-200 mt-1">{gaps_section}</p>
          </section>
        )
      )}

      {/* Recommendations */}
      {Array.isArray(tips) && tips.length > 0 && (
        <section>
          <h3 className="font-semibold text-yellow-300">✨ Recommendations</h3>
          <ul className="list-disc list-inside space-y-1 text-sm text-gray-200 mt-1">
            {(tips as Tip[]).map((t, i) =>
              typeof t === "string" ? (
                <li key={i}>{t}</li>
              ) : (
                <li key={i}>
                  <span className="font-semibold">{t.recommendation}</span> — {t.why}.{" "}
                  <em>{t.how}</em>
                </li>
              )
            )}
          </ul>
        </section>
      )}

      {/* Conclusion */}
      {conclusion && (
        <section>
          <h3 className="font-semibold text-blue-400">✅ Conclusion</h3>
          <p className="text-sm leading-relaxed text-gray-200 mt-1">{conclusion}</p>
        </section>
      )}
    </div>
  );
}
