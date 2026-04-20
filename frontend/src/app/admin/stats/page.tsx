"use client";

import { BarChart3, TrendingUp, Users, ShoppingCart } from "lucide-react";

export default function AdminStatsPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold flex items-center gap-2 mb-8">
        <BarChart3 className="w-6 h-6 text-emerald-400" />
        Statistiques
      </h1>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-8">
          <div className="flex items-center gap-3 mb-4">
            <Users className="w-5 h-5 text-violet-400" />
            <h2 className="font-semibold">Inscriptions</h2>
          </div>
          <div className="h-48 flex items-center justify-center text-zinc-600 text-sm">
            Graphique disponible après les premières inscriptions
          </div>
        </div>

        <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-8">
          <div className="flex items-center gap-3 mb-4">
            <TrendingUp className="w-5 h-5 text-green-400" />
            <h2 className="font-semibold">Revenus</h2>
          </div>
          <div className="h-48 flex items-center justify-center text-zinc-600 text-sm">
            Graphique disponible après les premières commandes
          </div>
        </div>

        <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-8">
          <div className="flex items-center gap-3 mb-4">
            <ShoppingCart className="w-5 h-5 text-pink-400" />
            <h2 className="font-semibold">Commandes</h2>
          </div>
          <div className="h-48 flex items-center justify-center text-zinc-600 text-sm">
            Graphique disponible après les premières commandes
          </div>
        </div>

        <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-8">
          <div className="flex items-center gap-3 mb-4">
            <BarChart3 className="w-5 h-5 text-yellow-400" />
            <h2 className="font-semibold">Activité</h2>
          </div>
          <div className="h-48 flex items-center justify-center text-zinc-600 text-sm">
            Graphique disponible une fois l&apos;activité enregistrée
          </div>
        </div>
      </div>
    </div>
  );
}
