"use client";

import DashboardSidebar from "@/components/DashboardSidebar";
import DashboardHeader from "@/components/DashboardHeader";
import { getClientUser, signOutClient } from "@/lib/auth";
import { useEffect, useState } from "react";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [userEmail, setUserEmail] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const u = await getClientUser();
      if (u) setUserEmail(u.email ?? null);
    })();
  }, []);

  return (
    <div className="flex min-h-screen bg-bg text-text">
      {/* Sidebar gauche */}
      <DashboardSidebar userEmail={userEmail} onSignOut={signOutClient} />

      {/* Zone principale */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <DashboardHeader userEmail={userEmail} onSignOut={signOutClient} />

        {/* Contenu */}
        <main className="flex-1 p-6 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
