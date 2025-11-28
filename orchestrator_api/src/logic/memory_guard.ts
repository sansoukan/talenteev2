import { sb } from "../repo/supabase.js";

export async function getRecentlyAskedQuestionIds(user_id: string, session_id?: string): Promise<Set<string>> {
  if (!sb) return new Set();
  const { data, error } = await sb
    .from("nova_memory")
    .select("question_id")
    .eq("user_id", user_id)
    .order("created_at", { ascending: false })
    .limit(200);
  if (error || !data) return new Set();
  return new Set(data.filter(r => r.question_id).map(r => r.question_id as string));
}
