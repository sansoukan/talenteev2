import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function t(key: string, lang: string = "en") {
  const { data } = await supabaseAdmin
    .from("nova_pdf_i18n")
    .select("value")
    .eq("key", key)
    .eq("lang", lang)
    .maybeSingle();

  if (data?.value) return data.value;

  // fallback to EN
  const { data: fallback } = await supabaseAdmin
    .from("nova_pdf_i18n")
    .select("value")
    .eq("key", key)
    .eq("lang", "en")
    .maybeSingle();

  return fallback?.value || key;
}