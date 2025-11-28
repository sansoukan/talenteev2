// Node script : vérifie que chaque question active a bien une vidéo associée.
// Usage: ts-node batch/check_questions_assets.ts

import { createClient } from "@supabase/supabase-js";

const { SUPABASE_URL, SUPABASE_SERVICE_ROLE } = process.env;
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE) {
  console.error("❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE);

async function main() {
  console.log("🔍 Vérification cohérence questions ↔ vidéos...");

  // 1. Charger toutes les questions actives
  const { data: questions, error: qErr } = await supabase
    .from("nova_questions")
    .select("id, niveau, type, text, is_active")
    .eq("is_active", true);

  if (qErr) throw qErr;
  if (!questions?.length) {
    console.log("⚠️ Aucune question active trouvée.");
    process.exit(0);
  }

  // 2. Charger tous les assets vidéo
  const { data: assets, error: aErr } = await supabase
    .from("nova_assets")
    .select("id, type, lang, status, url");

  if (aErr) throw aErr;

  // Indexer les assets par id+type+lang
  const assetMap = new Map<string, any>();
  (assets ?? []).forEach((a) => {
    assetMap.set(`${a.id}_${a.type}_${a.lang}`, a);
  });

  // 3. Vérifier chaque question
  const missing: any[] = [];
  const ok: any[] = [];

  for (const q of questions) {
    const langs = ["en"]; // ⚠️ MVP = anglais uniquement
    for (const lang of langs) {
      const key = `${q.id}_question_${lang}`;
      if (!assetMap.has(key)) {
        missing.push({
          id: q.id,
          niveau: q.niveau,
          type: q.type,
          lang,
          note: "Pas de vidéo question trouvée",
        });
      } else {
        const asset = assetMap.get(key);
        if (asset.status !== "ready") {
          missing.push({
            id: q.id,
            niveau: q.niveau,
            type: q.type,
            lang,
            note: `Asset trouvé mais status=${asset.status}`,
          });
        } else {
          ok.push({ id: q.id, lang });
        }
      }
    }
  }

  // 4. Résumé
  console.log(`✅ Questions avec vidéo prête : ${ok.length}`);
  console.log(`❌ Questions manquantes ou en erreur : ${missing.length}`);

  if (missing.length > 0) {
    console.log("---- Missing ----");
    missing.forEach((m) =>
      console.log(`${m.id} [N${m.niveau}] (${m.lang}) → ${m.note}`)
    );
  }

  console.log("🎉 Vérification terminée.");
}

main().catch((e) => {
  console.error("❌ Fatal error:", e);
  process.exit(1);
});
