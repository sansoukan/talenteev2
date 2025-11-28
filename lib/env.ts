// /src/lib/env.ts
// Charge & valide les variables d'environnement côté serveur.
// Utilisé par toutes les routes server-only.

const required = (key: string, optional = false) => {
  const v = process.env[key];
  if (!optional && (!v || v.trim() === "")) {
    throw new Error(`[ENV] Missing ${key}`);
  }
  return v!;
};

export const ENV = {
  SUPABASE_URL:            required("SUPABASE_URL"),
  SUPABASE_ANON_KEY:       required("SUPABASE_ANON_KEY"),
  SUPABASE_SERVICE_ROLE:   required("SUPABASE_SERVICE_ROLE"),
  STRIPE_SECRET_KEY:       required("STRIPE_SECRET_KEY"),
  STRIPE_PRICE_ID_N2:      required("STRIPE_PRICE_ID_N2", true),
  STRIPE_PRICE_ID_N3:      required("STRIPE_PRICE_ID_N3", true),
  STRIPE_WEBHOOK_SECRET:   required("STRIPE_WEBHOOK_SECRET"),
  ORIGIN:                  required("NEXT_PUBLIC_APP_ORIGIN"),
  STT_PROVIDER:            process.env.STT_PROVIDER || "none", // "deepgram" | "openai" | "none"
  DEEPGRAM_API_KEY:        process.env.DEEPGRAM_API_KEY || "",
  OPENAI_API_KEY:          process.env.OPENAI_API_KEY || "",
};
