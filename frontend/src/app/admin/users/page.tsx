"use client";

import { useState } from "react";
import { Users, Search, ShieldCheck, Ban, MoreVertical } from "lucide-react";

export default function AdminUsersPage() {
  const [search, setSearch] = useState("");

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Users className="w-6 h-6 text-violet-400" />
          Utilisateurs
        </h1>
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher par pseudo ou email..."
          className="w-full bg-zinc-900/60 border border-zinc-800 rounded-lg pl-10 pr-4 py-3 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-violet-500 transition"
        />
      </div>

      {/* Table */}
      <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-800">
              <th className="text-left px-6 py-4 text-xs text-zinc-500 uppercase tracking-wider font-medium">
                Utilisateur
              </th>
              <th className="text-left px-6 py-4 text-xs text-zinc-500 uppercase tracking-wider font-medium">
                Email
              </th>
              <th className="text-left px-6 py-4 text-xs text-zinc-500 uppercase tracking-wider font-medium">
                Statut
              </th>
              <th className="text-right px-6 py-4 text-xs text-zinc-500 uppercase tracking-wider font-medium">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td colSpan={4} className="px-6 py-12 text-center text-zinc-500">
                <Users className="w-10 h-10 mx-auto mb-3 text-zinc-600" />
                Aucun utilisateur pour le moment.
                <br />
                <span className="text-xs">
                  Les utilisateurs apparaîtront ici après leur inscription.
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-6 mt-4 text-xs text-zinc-500">
        <span className="flex items-center gap-1">
          <ShieldCheck className="w-3 h-3 text-green-400" /> Vérifié
        </span>
        <span className="flex items-center gap-1">
          <Ban className="w-3 h-3 text-red-400" /> Banni
        </span>
        <span className="flex items-center gap-1">
          <MoreVertical className="w-3 h-3" /> Actions
        </span>
      </div>
    </div>
  );
}
