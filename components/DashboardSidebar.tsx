"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOutClient } from "@/lib/auth"; // ton utilitaire logout
import { cn } from "@/lib/utils";

const links = [
  { href: "/dashboard", label: "💬 Dashboard (AskNova)" },
  { href: "/dashboard/simulation", label: "🚀 Simulation" },
  { href: "/dashboard/sessions", label: "📂 Sessions" },
  { href: "/dashboard/cv-offer", label: "📑 CV + Offer Matching" },
  { href: "/dashboard/qa-history", label: "🗂 Q/A History" },
  { href: "/dashboard/suggested", label: "💡 Suggested Answers" },
  { href: "/dashboard/advice", label: "📋 Advice" },
  { href: "/dashboard/challenge", label: "🎯 Daily challenge" },
  { href: "/dashboard/reports", label: "📊 Reports & Feedback" },
  { href: "/dashboard/pro-content", label: "📚 Pro Content" },
  { href: "/dashboard/tips", label: "💡 Interview Tips" },
];

export default function DashboardSidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 min-h-screen bg-bg-card border-r border-border p-4 flex flex-col">
      {/* Logo */}
      <div className="text-xl font-bold mb-8 text-text">
        Nova<span className="text-primary">RH</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-2">
        {links.map((link) => {
          const active = pathname === link.href;
          return (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "block px-3 py-2 rounded-md text-sm font-medium transition-colors",
                active
                  ? "bg-primary text-white"
                  : "text-text-muted hover:bg-primary-light hover:text-white"
              )}
            >
              {link.label}
            </Link>
          );
        })}
      </nav>

      {/* Footer + Logout */}
      <div className="mt-auto space-y-4">
        <button
          onClick={signOutClient}
          className="w-full px-3 py-2 rounded-md text-sm font-medium bg-danger text-white hover:opacity-90 transition"
        >
          ⏻ Logout
        </button>
        <div className="text-xs text-text-muted">© {new Date().getFullYear()} Nova RH</div>
      </div>
    </aside>
  );
}
