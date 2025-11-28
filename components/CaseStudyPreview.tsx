"use client";

import { motion } from "framer-motion";

export default function CaseStudyPreview({ data }: { data: any }) {
  if (!data) return <div className="text-gray-400">No case available.</div>;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="bg-gray-900/70 border border-white/10 rounded-2xl p-6 shadow-xl text-white space-y-6"
    >
      {/* Cover */}
      {data.image_cover_url && (
        <img
          src={data.image_cover_url}
          alt={data.title}
          className="w-full h-64 object-cover rounded-xl shadow-md mb-4"
        />
      )}

      <h2 className="text-2xl font-bold text-blue-400">{data.title}</h2>
      <p className="text-gray-300 italic">{data.intro}</p>

      <div className="text-sm text-gray-400 space-y-1">
        <p>🎯 <strong>Theme:</strong> {data.theme}</p>
        <p>💼 <strong>Level:</strong> {data.career_level}</p>
        <p>📂 <strong>Domain:</strong> {data.domain}</p>
        {data.sub_domain && <p>🔎 <strong>Sub-Domain:</strong> {data.sub_domain}</p>}
      </div>

      {/* Context / Data */}
      {data.data_block && (
        <div className="mt-4 bg-gray-800/50 rounded-lg p-4 border border-gray-700">
          <h4 className="text-blue-400 font-semibold mb-2">📊 Key Data</h4>
          <pre className="text-sm text-gray-300 whitespace-pre-wrap">
            {JSON.stringify(data.data_block, null, 2)}
          </pre>
        </div>
      )}

      {/* Prompt */}
      <div className="mt-6">
        <h4 className="text-blue-400 font-semibold mb-2">🧠 Problem Statement</h4>
        <p className="text-gray-200">{data.prompt_en || data.prompt_fr}</p>
      </div>

      {/* Annexes */}
      {data.annex_urls?.length > 0 && (
        <div className="mt-6">
          <h4 className="text-blue-400 font-semibold mb-2">📎 Annexes</h4>
          <ul className="list-disc pl-6 space-y-1 text-sm text-gray-400">
            {data.annex_urls.map((url: string, idx: number) => (
              <li key={idx}>
                <a href={url} target="_blank" className="underline text-blue-400 hover:text-white">
                  Annex {idx + 1}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}
    </motion.div>
  );
}