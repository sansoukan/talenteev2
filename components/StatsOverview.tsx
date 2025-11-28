"use client";

import { Card, CardContent } from "@/components/ui/card";

export default function StatsOverview() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <Card>
        <CardContent className="p-6">
          <p className="text-sm text-gray-500">Total simulations</p>
          <p className="text-2xl font-bold">12</p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <p className="text-sm text-gray-500">Score moyen</p>
          <p className="text-2xl font-bold text-green-600">78%</p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <p className="text-sm text-gray-500">Dernière simulation</p>
          <p className="text-2xl font-bold">21/09/2025</p>
        </CardContent>
      </Card>
    </div>
  );
}
