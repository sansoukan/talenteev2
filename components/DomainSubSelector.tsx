"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/lib/supabaseClient";

type Subdomain = { value: string; label: string };

export default function DomainSubSelector({
  domain,
  userSegment, // "elite" | "operational"
  onSelect,
}: {
  domain: string | null;
  userSegment: string;
  onSelect: (val: string) => void;
}) {
  const [subdomains, setSubdomains] = useState<Subdomain[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!domain) return;

    async function loadSubdomains() {
      setLoading(true);

      const { data, error } = await supabase
        .from("nova_domain_hierarchy")
        .select("elite_subdomains, operational_subdomains")
        .eq("domain", domain)
        .single();

      if (error) {
        console.error("❌ Error loading subdomains:", error.message);
        setSubdomains([]);
        setLoading(false);
        return;
      }

      // Filtrage segment
      const list =
        userSegment === "elite"
          ? (data.elite_subdomains || [])
          : (data.operational_subdomains || []);

      // Normalisation du format
      const normalized = list.map((item: any) => ({
        value: item.value,
        label: item.label,
      }));

      setSubdomains(normalized);
      setLoading(false);
    }

    loadSubdomains();
  }, [domain, userSegment]);

  if (!domain) return null;

  if (loading)
    return (
      <div className="text-gray-400 animate-pulse text-sm">
        Loading specializations…
      </div>
    );

  // UI dynamique
  const title =
    userSegment === "elite"
      ? "Choose your specialization"
      : "Select your position";

  const skipLabel =
    userSegment === "elite"
      ? "Skip specialization →"
      : "Skip (choose later) →";

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="flex flex-col items-center gap-6 w-full"
    >
      <h2 className="text-2xl font-semibold text-white">{title}</h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {subdomains.map((sub) => (
          <button
            key={sub.value}
            onClick={() => onSelect(sub.value)}
            className="w-64 py-4 bg-white/5 border border-white/10 
                       rounded-2xl text-white font-medium hover:bg-white/10 
                       hover:border-white/20 transition-all"
          >
            {sub.label}
          </button>
        ))}
      </div>

      <button
        onClick={() => onSelect("")}
        className="text-blue-400 underline text-sm hover:text-blue-300 transition-all"
      >
        {skipLabel}
      </button>
    </motion.div>
  );
}
