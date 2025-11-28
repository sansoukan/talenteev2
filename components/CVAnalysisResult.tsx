"use client";

import React from "react";

type Props = {
  analysis: any;
};

export default function CVAnalysisResult({ analysis }: Props) {
  if (!analysis) {
    return <p className="text-sm text-gray-400">⚠️ No analysis data found.</p>;
  }

  return (
    <div className="p-6 rounded-lg border border-border bg-black/30 space-y-4">
      <h2 className="text-xl font-bold">📄 Resume Analysis Report</h2>

      {/* Role detected */}
      {analysis.role_detected && (
        <p>
          <span className="font-semibold">Detected role:</span>{" "}
          {analysis.role_detected}
        </p>
      )}

      {/* Match percentage */}
      {analysis.match_percentage !== undefined && (
        <p>
          <span className="font-semibold">Match with job offer:</span>{" "}
          {analysis.match_percentage}%
        </p>
      )}

      {/* Strengths */}
      {analysis.strengths && analysis.strengths.length > 0 && (
        <section>
          <h3 className="font-semibold text-green-400">💪 Strengths</h3>
          <ul className="list-disc list-inside space-y-1 text-sm">
            {analysis.strengths.map((s: any, idx: number) => (
              <li key={idx}>
                {typeof s === "string" ? (
                  s
                ) : (
                  <>
                    <span className="font-semibold">{s.point || s.advice}</span>
                    {s.explanation && (
                      <p className="text-xs text-gray-400 ml-4">
                        {s.explanation}
                      </p>
                    )}
                  </>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Gaps */}
      {analysis.gaps && analysis.gaps.length > 0 && (
        <section>
          <h3 className="font-semibold text-red-400">⚠️ Gaps</h3>
          <ul className="list-disc list-inside space-y-1 text-sm">
            {analysis.gaps.map((g: any, idx: number) => (
              <li key={idx}>
                {typeof g === "string" ? (
                  g
                ) : (
                  <>
                    <span className="font-semibold">{g.point || g.advice}</span>
                    {g.explanation && (
                      <p className="text-xs text-gray-400 ml-4">
                        {g.explanation}
                      </p>
                    )}
                  </>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Tips */}
      {analysis.tips && analysis.tips.length > 0 && (
        <section>
          <h3 className="font-semibold text-yellow-300">✨ Tips</h3>
          <ul className="list-disc list-inside space-y-1 text-sm">
            {analysis.tips.map((t: any, idx: number) => (
              <li key={idx}>
                {typeof t === "string" ? (
                  t
                ) : (
                  <>
                    <span className="font-semibold">
                      {t.advice || t.recommendation}
                    </span>
                    {t.explanation && (
                      <p className="text-xs text-gray-400 ml-4">
                        {t.explanation}
                      </p>
                    )}
                  </>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}