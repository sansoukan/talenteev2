import { supabase } from "@/lib/supabaseClient";

/**
 * 🔹 Charge tous les domaines et sous-domaines (vue Supabase)
 */
export async function fetchDomains() {
  const { data, error } = await supabase
    .from("nova_domain_hierarchy")
    .select("*")
    .order("domain_label", { ascending: true });

  if (error) {
    console.error("❌ Error loading domains:", error.message);
    return [];
  }

  return data || [];
}