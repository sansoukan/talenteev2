"use client";

import { supabase } from "./singletonSupabaseClient";
import type { User } from "@supabase/supabase-js";

/**
 * ======================================================
 * 🔑 Auth Helpers — Client Side
 * ------------------------------------------------------
 * Utilise l’instance persistante de Supabase.
 * Empêche les redirections prématurées avant
 * que la session ne soit restaurée.
 * ======================================================
 */

// ✅ Récupère la session active (plus fiable que getUser())
export async function getClientUser(): Promise<User | null> {
  try {
    const { data, error } = await supabase.auth.getSession();
    if (error) {
      console.warn("⚠️ getSession() error:", error.message);
      return null;
    }

    const user = data?.session?.user ?? null;
    console.log("👤 Utilisateur récupéré:", user?.email || "aucun");
    return user;
  } catch (err) {
    console.error("❌ Erreur getClientUser():", err);
    return null;
  }
}

// ✅ Déconnexion + redirection
export async function signOutClient() {
  try {
    await supabase.auth.signOut();
    console.log("🚪 Déconnexion réussie");
  } catch (err) {
    console.error("❌ Erreur signOut:", err);
  } finally {
    if (typeof window !== "undefined") {
      window.location.href = "/auth";
    }
  }
}
