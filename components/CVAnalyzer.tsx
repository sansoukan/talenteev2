"use client";

import React from "react";

type AnalysisResult = {
  role_detected?: string;
  match_percentage?: number;
  strengths?: any[];
  gaps?: any[];
};

export default function CVAnalyzer({ result }: { result: AnalysisResult }) {
  if (!result) {
    return <p className="text-sm text-gray-400">⚠️ No analysis available.</p>;
  }

  return (
    <div className="p-4 rounded-md border border-border bg-black/20 space-y-3">
      <h3 className="font-semibold">📊 Resume Quick Analysis</h3>

      {result.role_detected && (
        <p>
          <span className="font-semibold">Detected role:</span>{" "}
          {result.role_detected}
        </p>
      )}

      {result.match_percentage !== undefined && (
        <p>
          <span className="font-semibold">Match:</span>{" "}
          {result.match_percentage}%
        </p>
      )}

      {/* Strengths */}
      {result.strengths && result.strengths.length > 0 && (
        <div>
          <h4 className="text-green-400 font-semibold">💪 Strengths</h4>
          <ul className="list-disc list-inside text-sm space-y-1">
            {result.strengths.map((s: any, idx: number) => (
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
        </div>
      )}

      {/* Gaps */}
      {result.gaps && result.gaps.length > 0 && (
        <div>
          <h4 className="text-red-400 font-semibold">⚠️ Gaps</h4>
          <ul className="list-disc list-inside text-sm space-y-1">
            {result.gaps.map((g: any, idx: number) => (
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
        </div>
      )}
    </div>
  );
}
