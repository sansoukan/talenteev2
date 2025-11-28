"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function DashboardReports() {
  const [sessions, setSessions] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("nova_sessions")
        .select("id, type_entretien, created_at, score_global")
        .order("created_at", { ascending: false });
      setSessions(data || []);
    })();
  }, []);

  return (
    <main className="p-6">
      <h2 className="text-2xl font-bold mb-4">📑 Mes Rapports PDF</h2>
      <ul>
        {sessions.map((s) => (
          <li key={s.id} className="mb-2">
            <strong>{s.type_entretien}</strong> – {s.score_global ?? "—"} pts
            <a
              href={`/api/pdf?session_id=${s.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="ml-4 text-blue-400 underline"
            >
              Télécharger le rapport
            </a>
          </li>
        ))}
      </ul>
    </main>
  );
}
