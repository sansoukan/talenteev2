"use client";

import { useState, useMemo } from "react";

const DAILY_CHALLENGES = [
  "Pitch your background in 30 seconds.",
  "Summarize your last job in one sentence.",
  "Explain a failure and what you learned, in under 1 minute.",
  "Convince me you are the right fit, as if I were the CEO.",
  "Describe yourself using only 3 keywords.",
  "Tell me about a project you are proud of in 45 seconds.",
  "Explain how you handle stress during tight deadlines.",
];

export default function NovaChallenge({ userId }: { userId: string }) {
  const challenge = useMemo(() => {
    const seed = new Date().getFullYear() * 1000 + new Date().getDate();
    return DAILY_CHALLENGES[seed % DAILY_CHALLENGES.length];
  }, []);

  const [answer, setAnswer] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    if (!answer.trim() || loading) return;
    setLoading(true);
    setFeedback(null);

    try {
      const resp = await fetch("/api/challenge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: userId, answer, challenge }),
      });
      const json = await resp.json();
      setFeedback(json.feedback || "⚠️ No feedback received.");
    } catch {
      setFeedback("⚠️ Error contacting Nova.");
    } finally {
      setLoading(false);
    }
  }

  const wordCount = answer.trim().split(/\s+/).filter(Boolean).length;

  return (
    <div className="bg-bg-card border border-border rounded-lg p-6 space-y-4">
      <h3 className="text-base font-bold">🎯 Nova Challenge</h3>
      <p className="text-sm text-text-muted">{challenge}</p>

      <textarea
        value={answer}
        onChange={(e) => setAnswer(e.target.value)}
        placeholder="Write your answer here..."
        className="w-full min-h-[80px] rounded-md border border-border bg-bg p-2 text-sm text-text"
      />

      <div className="text-xs text-text-muted text-right">{wordCount} words</div>

      <button
        onClick={handleSubmit}
        disabled={loading || !answer.trim()}
        className="w-full px-4 py-2 rounded-lg bg-primary text-white font-semibold hover:opacity-90 disabled:opacity-50"
      >
        {loading ? "⏳ Checking..." : "Submit"}
      </button>

      {feedback && (
        <div className="p-3 rounded-md border border-border bg-black/20 text-sm">
          <strong>Nova’s feedback:</strong> {feedback}
        </div>
      )}
    </div>
  );
}
