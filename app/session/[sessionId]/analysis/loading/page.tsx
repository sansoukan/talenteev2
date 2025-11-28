"use client";

import { NovaAnalysisLoader } from "@/components/NovaAnalysisLoader";

export default function LoadingAnalysisPage({
  params,
}: {
  params: { sessionId: string };
}) {
  const sessionId = params.sessionId;

  if (!sessionId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0A0A0A]">
        <div className="text-center space-y-4">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-500/10 border border-red-500/20">
            <svg 
              className="w-8 h-8 text-red-400" 
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" 
              />
            </svg>
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-white/90">
              Error
            </h1>
            <p className="text-white/60 mt-2">
              Missing session identifier
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <NovaAnalysisLoader
      sessionId={sessionId}
      redirectToWhenReady={`/session/${sessionId}/analysis`}
    />
  );
}
