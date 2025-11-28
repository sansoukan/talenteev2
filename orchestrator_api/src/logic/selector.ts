import { sb } from "../repo/supabase.js";

function mapNiveauToQuestionType(niveau: string, scenarioType: string): string[] {
  if (scenarioType === "interne") return ["internal"];
  if (niveau === "1") return ["screening"];
  if (niveau === "2") return ["fit"];
  return ["behavior","fit"]; // N3 : générique hors séquence cas
}

export async function pickNextQuestion(opts: {
  user_id: string; niveau: string; scenarioType: string; lang: string; excludeIds: Set<string>;
}) {
  if (!sb) return null;
  const types = mapNiveauToQuestionType(opts.niveau, opts.scenarioType);
  const { data, error } = await sb
    .from("nova_questions")
    .select("id, type, theme, tags, expected_structure, is_premium, is_active, last_used_at")
    .in("type", types)
    .eq("is_active", true)
    .limit(200);
  if (error || !data) return null;
  const pool = data.filter(q => !opts.excludeIds.has(q.id));
  if (!pool.length) return null;

  pool.sort((a, b) => {
    const aScore = a.last_used_at ? 1 : 0;
    const bScore = b.last_used_at ? 1 : 0;
    return aScore - bScore;
  });

  return pool[0];
}
