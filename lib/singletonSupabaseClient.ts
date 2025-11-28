"use client";

import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";

/**
 * ======================================================
 * 🌐 singletonSupabaseClient — Version 100% stable Next.js
 * ------------------------------------------------------
 *  • Restaure automatiquement la session
 *  • Lit correctement les cookies
 *  • Évite les multiples GoTrueClient
 *  • Compatible Stripe callback
 * ======================================================
 */

let supabaseBrowserClient: ReturnType<typeof createClientComponentClient> | null = null;

export function getSupabaseBrowserClient() {
  if (!supabaseBrowserClient) {
    supabaseBrowserClient = createClientComponentClient({
      supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL!,
      supabaseKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    });
  }
  return supabaseBrowserClient;
}

// 👇 C'est ce que toute ton app doit utiliser
export const supabase = getSupabaseBrowserClient();