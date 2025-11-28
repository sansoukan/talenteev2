import { supabase } from "./auth";

/**
 * Resolve the URL of an asset marked as "ready" from a ref id (ex: question_id),
 * the type (question|relance|feedback|listening) and the language.
 */
export async function fetchAssetUrlByRef(
  refId: string,
  type: "question" | "relance" | "feedback" | "listening",
  lang = "en"
): Promise<string | null> {
  if (!refId) return null;

  const { data, error } = await supabase
    .from("nova_assets")
    .select("url,status,lang,type")
    .eq("lang", lang)
    .eq("type", type)
    .ilike("url", `%${refId}%`)
    .limit(1)
    .maybeSingle();

  if (error || !data) {
    console.warn("[fetchAssetUrlByRef] asset not found", { refId, type, lang, error });
    return null;
  }
  return data.status === "ready" ? (data.url as string) : null;
}
