"use client";

import { useState, useMemo, useRef } from "react";
import html2canvas from "html2canvas";
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { Download, BarChart3, PieChart as PieIcon, Activity } from "lucide-react";

type Annex = { title: string; value?: string | number };
type DataPoint = { label: string; value: number };
type DataBlock = {
  chart?: "line" | "bar" | "pie";
  data?: DataPoint[];
  filters?: string[];
};

type Props = {
  annexes?: Annex[];
  data?: DataBlock | null;
};

/**
 * DataPanel – Bloc interactif pour les études de cas
 * -------------------------------------------------
 * - Affiche les annexes & indicateurs
 * - Graphiques dynamiques Recharts
 * - Filtres (indicateur / période)
 * - Export PNG
 */
export default function DataPanel({ annexes = [], data }: Props) {
  const [selectedChart, setSelectedChart] = useState<"line" | "bar" | "pie">(data?.chart || "line");
  const [filter, setFilter] = useState<string | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);

  const COLORS = ["#36A2EB", "#4BC0C0", "#FFCE56", "#FF6384", "#9966FF", "#8BC34A"];

  // 🎯 Données filtrées
  const filteredData = useMemo(() => {
    if (!data?.data) return [];
    if (!filter) return data.data;
    return data.data.filter((d) => d.label.toLowerCase().includes(filter.toLowerCase()));
  }, [data, filter]);

  // 📦 Export en image PNG
  async function handleExport() {
    if (!panelRef.current) return;
    const canvas = await html2canvas(panelRef.current, { backgroundColor: "#111827" });
    const link = document.createElement("a");
    link.download = `nova_case_data_${Date.now()}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  }

  // 🧱 Placeholder si pas encore de cas
  if ((!annexes || annexes.length === 0) && (!data || !data.data || data.data.length === 0)) {
    return (
      <div className="border border-gray-700 bg-gray-900/60 rounded-2xl p-8 text-gray-400 text-center">
        <Activity className="w-10 h-10 mx-auto mb-3 text-gray-600" />
        <p>No interactive data available yet.</p>
        <p className="text-sm text-gray-500 mt-1">Once real case studies are added, you’ll see KPIs and graphs here.</p>
      </div>
    );
  }

  return (
    <div
      ref={panelRef}
      className="border border-gray-700 bg-gray-900/70 rounded-2xl p-6 shadow-lg"
    >
      {/* HEADER */}
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-xl font-semibold text-blue-400">📊 Case Data & Annexes</h3>
        <div className="flex items-center gap-3">
          <button
            onClick={handleExport}
            className="text-gray-300 hover:text-white text-sm flex items-center gap-1"
          >
            <Download size={14} /> Export
          </button>
        </div>
      </div>

      {/* ANNEXES */}
      {annexes && annexes.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {annexes.map((a, i) => (
            <div
              key={i}
              className="bg-gray-800/80 rounded-xl p-4 text-center border border-gray-700 hover:border-blue-500/40 transition"
            >
              <p className="text-gray-400 text-sm">{a.title}</p>
              <p className="text-lg font-bold text-white mt-1">
                {a.value ?? "—"}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* FILTRES */}
      {data?.data && (
        <div className="flex items-center justify-between mb-4">
          <div className="flex gap-2">
            <button
              onClick={() => setSelectedChart("line")}
              className={`px-3 py-2 rounded-lg text-sm flex items-center gap-1 ${
                selectedChart === "line"
                  ? "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                  : "bg-gray-800/70 text-gray-400 hover:text-white"
              }`}
            >
              <BarChart3 size={14} /> Line
            </button>
            <button
              onClick={() => setSelectedChart("bar")}
              className={`px-3 py-2 rounded-lg text-sm flex items-center gap-1 ${
                selectedChart === "bar"
                  ? "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                  : "bg-gray-800/70 text-gray-400 hover:text-white"
              }`}
            >
              <BarChart3 size={14} /> Bar
            </button>
            <button
              onClick={() => setSelectedChart("pie")}
              className={`px-3 py-2 rounded-lg text-sm flex items-center gap-1 ${
                selectedChart === "pie"
                  ? "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                  : "bg-gray-800/70 text-gray-400 hover:text-white"
              }`}
            >
              <PieIcon size={14} /> Pie
            </button>
          </div>

          {/* FILTRE PAR LABEL */}
          <input
            type="text"
            placeholder="Filter by label..."
            value={filter || ""}
            onChange={(e) => setFilter(e.target.value || null)}
            className="bg-gray-800/70 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-300 placeholder-gray-500 focus:outline-none focus:border-blue-500"
          />
        </div>
      )}

      {/* CHART */}
      <div className="w-full h-64">
        {selectedChart === "line" && (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={filteredData}>
              <XAxis dataKey="label" stroke="#777" />
              <YAxis stroke="#777" />
              <Tooltip contentStyle={{ backgroundColor: "#1e293b", border: "none" }} />
              <Line
                type="monotone"
                dataKey="value"
                stroke="#36A2EB"
                strokeWidth={3}
                dot={{ r: 3 }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}

        {selectedChart === "bar" && (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={filteredData}>
              <XAxis dataKey="label" stroke="#777" />
              <YAxis stroke="#777" />
              <Tooltip contentStyle={{ backgroundColor: "#1e293b", border: "none" }} />
              <Bar dataKey="value" fill="#4BC0C0" radius={[5, 5, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}

        {selectedChart === "pie" && (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={filteredData}
                dataKey="value"
                nameKey="label"
                outerRadius={90}
                innerRadius={50}
                label
              >
                {filteredData.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ backgroundColor: "#1e293b", border: "none" }} />
            </PieChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}