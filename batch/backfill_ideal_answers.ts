import "dotenv/config"; // 👈 charge .env / .env.local automatiquement
import { createClient } from "@supabase/supabase-js";
import OpenAI from "openai";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const openaiKey = process.env.OPENAI_API_KEY!;

if (!supabaseUrl || !supabaseKey) {
  throw new Error("❌ Supabase credentials missing. Vérifie .env ou tes variables d'environnement.");
}
if (!openaiKey) {
  throw new Error("❌ OPENAI_API_KEY manquant dans .env");
}

const supabase = createClient(supabaseUrl, supabaseKey);
const openai = new OpenAI({ apiKey: openaiKey });

/**
 * Génère une réponse idéale structurée en fonction de la langue
 */
async function generateIdealAnswer(question: string, lang: string) {
  const prompt = `Rédige une réponse idéale en ${lang} à la question suivante : "${question}".
- Réponse générique (pas de nom d’entreprise).
- Structure claire, par exemple STAR (Situation, Tâche, Action, Résultat).
- 5 à 7 phrases maximum, ton professionnel et fluide.`;

  const resp = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{ role: "user", content: prompt }],
    temperature: 0.5,
    max_tokens: 300,
  });

  return resp.choices[0].message?.content?.trim() ?? "";
}

async function backfill() {
  console.log("🔎 Recherche des questions sans ideal_answer...");

  const { data: questions, error } = await supabase
    .from("nova_questions")
    .select("id, question_fr, question_en, question_es, ideal_answer")
    .or("ideal_answer.is.null,ideal_answer.eq.{}") // vide ou null
    .limit(50);

  if (error) throw error;

  for (const q of questions ?? []) {
    const current = q.ideal_answer || {};
    const update: Record<string, string> = {};

    if (!current.fr && q.question_fr) {
      update.fr = await generateIdealAnswer(q.question_fr, "français");
    }
    if (!current.en && q.question_en) {
      update.en = await generateIdealAnswer(q.question_en, "anglais");
    }
    if (!current.es && q.question_es) {
      update.es = await generateIdealAnswer(q.question_es, "espagnol");
    }

    if (Object.keys(update).length > 0) {
      const newIdeal = { ...current, ...update };
      await supabase
        .from("nova_questions")
        .update({ ideal_answer: newIdeal })
        .eq("id", q.id);

      console.log(`✅ MAJ question ${q.id}`, update);
    }
  }
}

backfill().catch((e) => {
  console.error("❌ Erreur batch:", e);
  process.exit(1);
});
