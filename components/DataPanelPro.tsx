"use client";

import { useState, useMemo, useRef } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  BarChart,
  Bar,
} from "recharts";
import { Download, BarChart3, TrendingUp, Filter } from "lucide-react";
import html2canvas from "html2canvas";

interface DataPanelProProps {
  dataBlock?: Record<string, any>;
}

/**
 * DataPanelPro — Advanced Case Data Visualization
 * -----------------------------------------------
 * - Graphiques dynamiques
 * - Filtres par indicateur et par année
 * - Export PNG
 */
export default function DataPanelPro({ dataBlock = {} }: DataPanelProProps) {
  const [selectedMetric, setSelectedMetric] = useState<string | null>(null);
  const [selectedYear, setSelectedYear] = useState<string | null>(null);
  const chartRef = useRef<HTMLDivElement | null>(null);

  const metrics = Object.keys(dataBlock || {});
  const hasData = metrics.length > 0;

  const chartData = useMemo(() => {
    const result: any[] = [];
    if (!dataBlock) return result;

    for (const [metric, values] of Object.entries(dataBlock)) {
      if (typeof values === "object" && !Array.isArray(values)) {
        for (const [year, val] of Object.entries(values)) {
          result.push({ metric, year, value: Number(val) });
        }
      } else if (typeof values === "number") {
        result.push({ metric, year: "—", value: values });
      }
    }

    let filtered = result;
    if (selectedMetric)
      filtered = filtered.filter((r) => r.metric === selectedMetric);
    if (selectedYear)
      filtered = filtered.filter((r) => r.year === selectedYear);
    return filtered;
  }, [dataBlock, selectedMetric, selectedYear]);

  // 📈 Liste des années disponibles
  const availableYears = useMemo(() => {
    const years = new Set<string>();
    for (const v of chartData) if (v.year && v.year !== "—") years.add(v.year);
    return Array.from(years).sort();
  }, [chartData]);

  async function exportAsPNG() {
    if (!chartRef.current) return;
    const canvas = await html2canvas(chartRef.current, { backgroundColor: "#111" });
    const link = document.createElement("a");
    link.download = `nova_case_data_${Date.now()}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  }

  if (!hasData) {
    return (
      <div className="mt-6 bg-gray-900/70 border border-gray-700 rounded-xl p-4 text-gray-400 text-sm text-center">
        📊 Aucun bloc de données disponible pour ce cas.
      </div>
    );
  }

  return (
    <div className="mt-6 bg-gray-900/70 border border-gray-700 rounded-xl p-5" ref={chartRef}>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <h3 className="text-lg font-semibold text-blue-400 flex items-center gap-2">
          <BarChart3 size={20} className="text-blue-400" />
          Données & Indicateurs Avancés
        </h3>

        <div className="flex items-center gap-3">
          <button
            onClick={exportAsPNG}
            className="bg-blue-500/10 border border-blue-500 text-blue-300 text-sm px-3 py-1.5 rounded-md hover:bg-blue-500/20 transition"
          >
            <Download size={14} className="inline mr-1" />
            Export PNG
          </button>
        </div>
      </div>

      {/* Filtres */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div className="flex items-center gap-2 text-sm text-gray-300">
          <Filter size={14} />
          <span>Indicateur :</span>
        </div>
        <select
          className="bg-gray-800 text-gray-100 border border-gray-700 rounded-md px-2 py-1 text-sm"
          value={selectedMetric || ""}
          onChange={(e) => setSelectedMetric(e.target.value || null)}
        >
          <option value="">Tous</option>
          {metrics.map((m) => (
            <option key={m} value={m}>
              {formatTitle(m)}
            </option>
          ))}
        </select>

        {availableYears.length > 1 && (
          <>
            <div className="flex items-center gap-2 text-sm text-gray-300 ml-4">
              <Filter size={14} />
              <span>Année :</span>
            </div>
            <select
              className="bg-gray-800 text-gray-100 border border-gray-700 rounded-md px-2 py-1 text-sm"
              value={selectedYear || ""}
              onChange={(e) => setSelectedYear(e.target.value || null)}
            >
              <option value="">Toutes</option>
              {availableYears.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </>
        )}
      </div>

      {/* Graphique principal */}
      <div className="w-full h-[320px]">
        <ResponsiveContainer width="100%" height="100%">
          {availableYears.length > 1 ? (
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#333" />
              <XAxis dataKey="year" stroke="#999" />
              <YAxis stroke="#999" />
              <Tooltip
                contentStyle={{
                  background: "#1e1e1e",
                  border: "1px solid #333",
                  color: "#fff",
                }}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="value"
                stroke="#3b82f6"
                strokeWidth={2.5}
                dot={{ fill: "#3b82f6" }}
              />
            </LineChart>
          ) : (
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#333" />
              <XAxis dataKey="metric" stroke="#999" tickFormatter={formatTitle} />
              <YAxis stroke="#999" />
              <Tooltip
                contentStyle={{
                  background: "#1e1e1e",
                  border: "1px solid #333",
                  color: "#fff",
                }}
              />
              <Bar dataKey="value" fill="#3b82f6" radius={[6, 6, 0, 0]} />
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>

      {/* Mini Trendlines */}
      <TrendlinePanel dataBlock={dataBlock} />
    </div>
  );
}

/* ----------------------------------------------------------
   📈 Trendlines (mini-graphiques sous forme de lignes)
---------------------------------------------------------- */
function TrendlinePanel({ dataBlock }: { dataBlock: Record<string, any> }) {
  const series = Object.entries(dataBlock)
    .filter(([_, v]) => typeof v === "object" && !Array.isArray(v))
    .map(([label, values]) => ({
      label,
      data: Object.entries(values).map(([k, v]) => ({
        name: k,
        value: Number(v),
      })),
    }));

  if (series.length === 0) return null;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6 mt-8">
      {series.map((serie, i) => (
        <div
          key={i}
          className="bg-gray-800/50 rounded-lg p-3 border border-gray-700 hover:bg-gray-800 transition"
        >
          <p className="text-sm text-gray-300 mb-2">{formatTitle(serie.label)}</p>
          <ResponsiveContainer width="100%" height={80}>
            <LineChart data={serie.data}>
              <Line
                type="monotone"
                dataKey="value"
                stroke="#3b82f6"
                strokeWidth={2}
                dot={false}
                isAnimationActive
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      ))}
    </div>
  );
}

/* ----------------------------------------------------------
   🧠 Helpers
---------------------------------------------------------- */
function formatTitle(key: string): string {
  return key.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
}