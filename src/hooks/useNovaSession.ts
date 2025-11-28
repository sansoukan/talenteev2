import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export function useNovaSession(sessionId) {
  const [session, setSession] = useState(null);
  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("nova_sessions").select("*").eq("id", sessionId).single();
      setSession(data);
    })();
  }, [sessionId]);
  return session;
}
