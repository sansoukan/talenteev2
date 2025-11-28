"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function SessionList() {
  const sessions = [
    { date: "18/09/2025", type: "Niveau 2", score: "80%", status: "Terminé" },
    { date: "15/09/2025", type: "Niveau 1", score: "72%", status: "Terminé" },
    { date: "10/09/2025", type: "Entretien annuel", score: "85%", status: "Terminé" },
  ];

  return (
    <div className="bg-white rounded-lg shadow">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Score</TableHead>
            <TableHead>Statut</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sessions.map((s, i) => (
            <TableRow key={i}>
              <TableCell>{s.date}</TableCell>
              <TableCell>{s.type}</TableCell>
              <TableCell className="text-green-600 font-semibold">{s.score}</TableCell>
              <TableCell>{s.status}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
