import "dotenv/config";
import { createClient } from "@supabase/supabase-js";

// ⚠️ Utilise la clé service_role (jamais exposée côté client)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function deleteAllUsers() {
  // 1. Récupérer tous les utilisateurs
  const { data, error } = await supabase.auth.admin.listUsers();

  if (error) {
    console.error("❌ Erreur récupération users:", error);
    return;
  }

  const users = data?.users || [];
  console.log(`🔎 ${users.length} utilisateurs trouvés dans auth.users`);

  for (const u of users) {
    // 2. Supprimer le profil associé
    const { error: profileError } = await supabase
      .from("profiles")
      .delete()
      .eq("id", u.id);

    if (profileError) {
      console.error(`❌ Erreur suppression profil ${u.id}:`, profileError);
    } else {
      console.log(`🗑️ Profil supprimé: ${u.id}`);
    }

    // 3. Supprimer l’utilisateur
    const { error: userError } = await supabase.auth.admin.deleteUser(u.id);

    if (userError) {
      console.error(`❌ Erreur suppression user ${u.id}:`, userError);
    } else {
      console.log(`✅ Utilisateur supprimé: ${u.id}`);
    }
  }

  console.log("✨ Suppression terminée !");
}

deleteAllUsers();
