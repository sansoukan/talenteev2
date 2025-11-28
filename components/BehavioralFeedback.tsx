// ✅ /src/components/BehavioralFeedback.tsx
"use client";

import { useEffect, useState } from "react";

export default function BehavioralFeedback({ sessionId }: { sessionId: string }) {
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    fetch(`/api/emotions?session_id=${sessionId}`)
      .then((res) => res.json())
      .then(setData);
  }, [sessionId]);

  if (!data) return <p className="text-sm text-gray-400">Analyse en cours...</p>;

  return (
    <div className="p-4 bg-gray-900 rounded-2xl shadow-md">
      <h3 className="text-lg font-semibold mb-2">Analyse comportementale</h3>
      <p className="text-sm text-gray-300">Émotion dominante : <strong>{data.emotion}</strong></p>
      <p className="text-sm text-gray-300">Confiance : {Math.round(data.confidence * 100)}%</p>
      <p className="text-sm text-gray-300">Posture / stabilité : {Math.round(data.posture_score * 100)}%</p>
    </div>
  );
}