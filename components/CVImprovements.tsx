"use client";

import React from "react";

type Improvement = {
  advice: string;
  explanation: string;
  priority: "high" | "medium" | "nice_to_have";
};

type PriorityTips = {
  high: (string | { recommendation: string })[];
  medium: (string | { recommendation: string })[];
  nice_to_have: (string | { recommendation: string })[];
};

type Props = {
  improvements: Improvement[];
  priority_tips: PriorityTips;
  narrative_summary?: string;
};

export default function CVImprovements({
  improvements,
  priority_tips,
  narrative_summary,
}: Props) {
  const safeImprovements: Improvement[] = Array.isArray(improvements)
    ? improvements
    : [];

  return (
    <div className="space-y-6 p-6 rounded-lg border border-border bg-black/30">
      <h2 className="text-xl font-bold">✨ CV Improvement Tips</h2>

      {/* Narrative summary */}
      {narrative_summary && (
        <section>
          <h3 className="font-semibold text-primary">🔎 Overall Feedback</h3>
          <p className="text-sm leading-relaxed text-gray-200 mt-1">
            {narrative_summary}
          </p>
        </section>
      )}

      {/* Detailed improvements */}
      {safeImprovements.length > 0 && (
        <section>
          <h3 className="font-semibold text-yellow-300">📋 Detailed Advice</h3>
          <ul className="list-disc list-inside space-y-2 text-sm text-gray-200 mt-2">
            {safeImprovements.map((imp, i) => (
              <li key={i}>
                <span
                  className={`font-semibold ${
                    imp.priority === "high"
                      ? "text-red-400"
                      : imp.priority === "medium"
                      ? "text-yellow-400"
                      : "text-green-400"
                  }`}
                >
                  {imp.advice}
                </span>
                {imp.explanation && (
                  <p className="text-gray-300 text-xs mt-1 ml-4">
                    {imp.explanation}
                  </p>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Priority tips */}
      <section>
        <h3 className="font-semibold text-blue-400">🏷️ Priority by Category</h3>
        <div className="space-y-3 mt-2 text-sm">
          {priority_tips.high.length > 0 && (
            <div>
              <h4 className="text-red-400 font-bold">High Priority</h4>
              <ul className="list-disc list-inside ml-4">
                {priority_tips.high.map((tip: any, i: number) => (
                  <li key={i}>
                    {typeof tip === "string" ? tip : tip.recommendation}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {priority_tips.medium.length > 0 && (
            <div>
              <h4 className="text-yellow-400 font-bold">Medium Priority</h4>
              <ul className="list-disc list-inside ml-4">
                {priority_tips.medium.map((tip: any, i: number) => (
                  <li key={i}>
                    {typeof tip === "string" ? tip : tip.recommendation}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {priority_tips.nice_to_have.length > 0 && (
            <div>
              <h4 className="text-green-400 font-bold">Nice to Have</h4>
              <ul className="list-disc list-inside ml-4">
                {priority_tips.nice_to_have.map((tip: any, i: number) => (
                  <li key={i}>
                    {typeof tip === "string" ? tip : tip.recommendation}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
