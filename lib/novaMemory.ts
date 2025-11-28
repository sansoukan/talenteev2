import { supabase } from "@/lib/supabaseClient";

export async function saveAnswer(sessionId: string, questionId: string, text: string) {
  return await supabase.from("nova_memory").insert({
    session_id: sessionId,
    question_id: questionId,
    reponse: text,
    created_at: new Date(),
  });
}

export async function getSessionHistory(sessionId: string) {
  const { data } = await supabase
    .from("nova_memory")
    .select("question_id, reponse, created_at")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: true });
  return data || [];
}

export async function computeScore(sessionId: string) {
  const { data } = await supabase
    .from("nova_memory")
    .select("score_auto")
    .eq("session_id", sessionId);
  if (!data?.length) return 0;
  const avg =
    data.reduce((a: number, b: any) => a + (b.score_auto || 0), 0) / data.length;
  return Math.round(avg * 100) / 100;
}
