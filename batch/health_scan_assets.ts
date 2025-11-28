// Node script : vérifie les URLs des assets (HEAD) et met à jour nova_assets.status ('ready' | 'error').
// Usage: ts-node batch/health_scan_assets.ts

import fetch from "node-fetch";
import { createClient } from "@supabase/supabase-js";

const { SUPABASE_URL, SUPABASE_SERVICE_ROLE } = process.env;
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE);

async function headOk(url: string) {
  try {
    const res = await fetch(url, { method: "HEAD" });
    return res.ok;
  } catch {
    return false;
  }
}

async function main() {
  const { data, error } = await supabase
    .from("nova_assets")
    .select("id,type,lang,url,status")
    .limit(20000);
  if (error) throw error;

  console.log(`🔍 Checking ${data?.length || 0} assets...`);

  // traiter par batchs de 20 en parallèle
  const batchSize = 20;
  for (let i = 0; i < (data?.length || 0); i += batchSize) {
    const chunk = (data ?? []).slice(i, i + batchSize);

    await Promise.allSettled(
      chunk.map(async (row) => {
        const ok = row.url ? await headOk(row.url) : false;
        const newStatus = ok ? "ready" : "error";
        if (newStatus !== row.status) {
          await supabase
            .from("nova_assets")
            .update({ status: newStatus })
            .eq("id", row.id)
            .eq("type", row.type)
            .eq("lang", row.lang);
          console.log(`✅ Updated ${row.id} [${row.type}/${row.lang}] -> ${newStatus}`);
        }
      })
    );
  }

  console.log("🎉 Scan terminé.");
}

main().catch((e) => {
  console.error("❌ Fatal error:", e);
  process.exit(1);
});
