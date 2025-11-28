"use client";

import { LogOut } from "lucide-react";

export default function DashboardHeader({
  userEmail,
  onSignOut,
}: {
  userEmail: string | null;
  onSignOut: () => void;
}) {
  return (
    <header className="flex justify-between items-center px-6 py-4 bg-bg border-b border-border shadow-sm">
      {/* À gauche : titre */}
      <div>
        <h1 className="text-xl font-bold">Dashboard</h1>
        {userEmail && (
          <p className="text-sm text-text-muted">{userEmail}</p>
        )}
      </div>

      {/* À droite : bouton logout */}
      <button
        onClick={onSignOut}
        className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-border text-text hover:bg-danger/80 hover:text-white transition"
      >
        <LogOut className="w-4 h-4" />
        Déconnexion
      </button>
    </header>
  );
}
