"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

/**
 * NovaRadarChart — Visual feedback chart
 * ---------------------------------------
 * 🔹 Affiche les scores moyens d’une session (clarity, relevance, etc.)
 * 🔹 Couleurs Nova RH
 * 🔹 Données : vue SQL v_nova_feedback_radar
 */

export default function NovaRadarChart({ userId }: { userId: string }) {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;
    (async () => {
      setLoading(true);
      const { data: radarData, error } = await supabase
        .from("v_nova_feedback_radar")
        .select("*")
        .eq("user_id", userId)
        .order("global_avg", { ascending: false })
        .limit(1);

      if (error) {
        console.error("❌ Radar fetch error:", error);
        setLoading(false);
        return;
      }

      if (radarData && radarData.length > 0) {
        const row = radarData[0];
        const formatted = [
          { axis: "Relevance", score: row.relevance_avg || 0 },
          { axis: "Clarity", score: row.clarity_avg || 0 },
          { axis: "Structure", score: row.structure_avg || 0 },
          { axis: "Confidence", score: row.confidence_avg || 0 },
          { axis: "Depth", score: row.depth_avg || 0 },
        ];
        setData(formatted);
      }
      setLoading(false);
    })();
  }, [userId]);

  if (loading)
    return (
      <div className="text-gray-400 text-sm mt-6 text-center">
        Loading performance chart…
      </div>
    );

  if (data.length === 0)
    return (
      <div className="text-gray-500 text-sm mt-6 text-center">
        No analyzed data yet. Complete at least one simulation.
      </div>
    );

  return (
    <div className="bg-gray-900/50 rounded-2xl p-6 mt-6 shadow-lg border border-gray-700">
      <h2 className="text-lg font-semibold text-blue-400 mb-4 text-center">
        🧠 Nova Cognitive Radar
      </h2>

      <div style={{ width: "100%", height: 320 }}>
        <ResponsiveContainer>
          <RadarChart data={data}>
            <PolarGrid stroke="rgba(255,255,255,0.2)" />
            <PolarAngleAxis
              dataKey="axis"
              stroke="#ccc"
              tick={{ fill: "#bbb", fontSize: 12 }}
            />
            <PolarRadiusAxis domain={[0, 1]} tickCount={6} tick={{ fill: "#777" }} />
            <Radar
              dataKey="score"
              stroke="#3A7AFE"
              fill="#3A7AFE"
              fillOpacity={0.5}
              dot
            />
            <Tooltip
              formatter={(v: number) => `${(v * 100).toFixed(0)} / 100`}
              labelFormatter={(label) => `Skill: ${label}`}
              contentStyle={{
                background: "#1E1E2E",
                border: "1px solid #3A7AFE",
                borderRadius: "8px",
                color: "#fff",
              }}
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>

      <p className="text-center text-gray-400 text-xs mt-3 italic">
        Based on your last analyzed session.
      </p>
    </div>
  );
}