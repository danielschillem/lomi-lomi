"use client";

import { useState, useEffect } from "react";
import {
  Users,
  ShoppingBag,
  MapPin,
  TrendingUp,
  MessageCircle,
  ShoppingCart,
} from "lucide-react";
import { adminGetStats } from "@/lib/api";

interface Stats {
  users: number;
  products: number;
  places: number;
  messages: number;
  orders: number;
  revenue: number;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    adminGetStats()
      .then((res) => setStats(res as unknown as Stats))
      .catch(() => {});
  }, []);

  const cards = [
    {
      label: "Utilisateurs",
      value: stats?.users ?? "—",
      icon: Users,
      color: "text-violet-400",
    },
    {
      label: "Produits",
      value: stats?.products ?? "—",
      icon: ShoppingBag,
      color: "text-pink-400",
    },
    {
      label: "Lieux",
      value: stats?.places ?? "—",
      icon: MapPin,
      color: "text-blue-400",
    },
    {
      label: "Messages",
      value: stats?.messages ?? "—",
      icon: MessageCircle,
      color: "text-green-400",
    },
    {
      label: "Commandes",
      value: stats?.orders ?? "—",
      icon: ShoppingCart,
      color: "text-yellow-400",
    },
    {
      label: "Revenus",
      value: stats?.revenue != null ? `${stats.revenue.toFixed(2)} €` : "—",
      icon: TrendingUp,
      color: "text-emerald-400",
    },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold mb-8">Dashboard</h1>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
        {cards.map((s) => {
          const Icon = s.icon;
          return (
            <div
              key={s.label}
              className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-6"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs text-zinc-500 uppercase tracking-wider">
                  {s.label}
                </span>
                <Icon className={`w-5 h-5 ${s.color}`} />
              </div>
              <div className="text-3xl font-bold">{s.value}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
