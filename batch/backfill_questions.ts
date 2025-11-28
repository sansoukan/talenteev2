// Node script : injecte un CSV dans la table nova_questions.
// Usage: ts-node batch/backfill_questions.ts ./nova_questions_rows-3.csv

import fs from "node:fs";
import { parse } from "csv-parse/sync";
import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "crypto";

const csvPath = process.argv[2];
if (!csvPath || !fs.existsSync(csvPath)) {
  console.error("Usage: ts-node backfill_questions.ts ./nova_questions_rows-3.csv");
  process.exit(1);
}

const { SUPABASE_URL, SUPABASE_SERVICE_ROLE } = process.env;
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE");
  process.exit(1);
}
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE);

type Row = {
  id?: string;
  niveau?: string;
  type: string;
  theme?: string;
  difficulty?: string;
  tags?: string;
  question_fr: string;
  question_en?: string;
  expected_structure?: string;
  is_premium?: string;
};

(async () => {
  const raw = fs.readFileSync(csvPath, "utf8");
  const recs: Row[] = parse(raw, { columns: true, skip_empty_lines: true });

  const batch = recs.map((r) => {
    const id = r.id || randomUUID();
    return {
      id,
      niveau: r.niveau || "1",
      type: r.type,
      theme: r.theme || null,
      difficulty: r.difficulty ? Number(r.difficulty) : null,
      tags: r.tags ? r.tags.split("|") : null,
      text: {
        fr: r.question_fr,
        en: r.question_en || null,
      },
      expected_structure: r.expected_structure || null,
      is_premium: r.is_premium === "true",
      is_active: true,
      version: "v1",
    };
  });

  // découpage en chunks
  const chunkSize = 500;
  for (let i = 0; i < batch.length; i += chunkSize) {
    const chunk = batch.slice(i, i + chunkSize);
    const { error } = await supabase
      .from("nova_questions")
      .upsert(chunk, { onConflict: "id" });

    if (error) {
      console.error("UPSERT error:", error.message);
      process.exit(1);
    }
    console.log(`Upsert OK: ${chunk.length} rows`);
  }
})();
