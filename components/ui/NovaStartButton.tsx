"use client"

import React from "react";

interface NovaStartButtonProps {
  onClick?: () => void;
}

export function NovaStartButton({ onClick }: NovaStartButtonProps) {
  return (
    <button
      onClick={onClick}
      className="
        relative px-8 py-3 rounded-full text-sm font-semibold
        bg-white/10 hover:bg-white/20 text-white backdrop-blur-md
        border border-white/20 shadow-lg transition-all duration-300
        flex items-center gap-2 active:scale-95
      "
    >
      <span className="relative flex h-3 w-3">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
        <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
      </span>
      Start Simulation
    </button>
  );
}