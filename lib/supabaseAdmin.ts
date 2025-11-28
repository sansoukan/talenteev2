// À utiliser UNIQUEMENT côté serveur (routes /api/*)
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!url || !serviceKey) {
  console.warn("[supabaseAdmin] URL/service key manquantes (routes API peuvent échouer).");
}

export const supabaseAdmin = createClient(url, serviceKey, {
  auth: { persistSession: false }
});
