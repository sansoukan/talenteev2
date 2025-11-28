/**
 * Client-side helpers to call our Next.js API routes.
 * All writes go through /api/* (service role secured).
 */

type CreateSessionInput = {
  user_id: string;
  type: string;
  niveau: string;
  lang: string;
};

export async function createSession(input: CreateSessionInput): Promise<{ id: string | null }> {
  const res = await fetch("/api/sessions", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error || "createSession failed");
  return { id: json?.id ?? null };
}

export async function closeSession(id: string): Promise<void> {
  const res = await fetch("/api/sessions", {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ id }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error || "closeSession failed");
}

/** Save a user answer */
export async function pushMemory(payload: {
  user_id: string;
  session_id: string;
  question_id?: string | null;
  transcript: string;
  lang?: string;
  feedback?: string;
  score?: number;
}): Promise<void> {
  const res = await fetch("/api/memoire", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error || "pushMemory failed");
}

/** Log a relance (silence/timeout) without fetching relance video */
export async function traceRelance(payload: {
  user_id: string;
  session_id: string;
  question_id?: string | null;
  reason: "silence" | "timeout" | "other";
}): Promise<void> {
  const res = await fetch("/api/relance/log", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error || "traceRelance failed");
}

/** Insert "emotions" metrics */
export async function pushEmotions(payload: {
  user_id: string;
  session_id: string;
  question_id?: string | null;
  eye_contact?: number;
  smiles?: number;
  hesitations?: number;
  tone?: string;
  posture_score?: number;
}): Promise<void> {
  const res = await fetch("/api/emotions", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error || "pushEmotions failed");
}

/** Trigger a Stripe Checkout (returns the payment URL) */
export async function startCheckout(app_session_id: string, option = "single"): Promise<string | null> {
  const res = await fetch("/api/checkout", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ app_session_id, user_id: localStorage.getItem("nova_user_id"), option }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error || "checkout failed");
  return json?.url ?? null;
}
