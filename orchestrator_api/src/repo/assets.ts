import { sb } from "./supabase.js";

export async function getReadyAssetUrlByRef(
  refId: string, lang: string,
  type: "question"|"feedback"|"relance"|"listening"|"intro"
) {
  if (!sb) return null;
  const { data, error } = await sb
    .from("nova_assets")
    .select("url,status,lang,type")
    .eq("lang", lang)
    .eq("type", type)
    .ilike("url", `%${refId}%`)
    .limit(1)
    .maybeSingle();
  if (error) { console.error("[assets] query error", error); return null; }
  if (!data || data.status !== "ready") return null;
  return data.url as string;
}
