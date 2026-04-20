"use client";

import { MapPin, Plus } from "lucide-react";

export default function AdminPlacesPage() {
  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <MapPin className="w-6 h-6 text-blue-400" />
          Lieux
        </h1>
        <button className="inline-flex items-center gap-2 bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium px-4 py-2.5 rounded-lg transition">
          <Plus className="w-4 h-4" />
          Ajouter
        </button>
      </div>

      <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-800">
              <th className="text-left px-6 py-4 text-xs text-zinc-500 uppercase tracking-wider font-medium">
                Lieu
              </th>
              <th className="text-left px-6 py-4 text-xs text-zinc-500 uppercase tracking-wider font-medium">
                Catégorie
              </th>
              <th className="text-left px-6 py-4 text-xs text-zinc-500 uppercase tracking-wider font-medium">
                Ville
              </th>
              <th className="text-left px-6 py-4 text-xs text-zinc-500 uppercase tracking-wider font-medium">
                Note
              </th>
              <th className="text-right px-6 py-4 text-xs text-zinc-500 uppercase tracking-wider font-medium">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td colSpan={5} className="px-6 py-12 text-center text-zinc-500">
                <MapPin className="w-10 h-10 mx-auto mb-3 text-zinc-600" />
                Aucun lieu enregistré.
                <br />
                <span className="text-xs">
                  Cliquez sur &quot;Ajouter&quot; pour référencer un lieu.
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
