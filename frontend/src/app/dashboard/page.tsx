"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { adminGetStats, ownerGetStats } from "@/lib/api";
import {
  MapPin,
  ShoppingBag,
  Heart,
  ClipboardList,
  DollarSign,
  Calendar,
  Users,
  MessageCircle,
  Sparkles,
  BarChart3,
} from "lucide-react";

interface AdminStats {
  users: number;
  products: number;
  places: number;
  messages: number;
  orders: number;
  revenue: number;
  wellness_providers: number;
  wellness_bookings: number;
}

interface OwnerStats {
  places: number;
  products: number;
  wellness: number;
  orders: number;
  revenue: number;
  bookings: number;
  reservations: number;
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [adminStats, setAdminStats] = useState<AdminStats | null>(null);
  const [ownerStats, setOwnerStats] = useState<OwnerStats | null>(null);
  const isAdmin = user?.role === "admin";

  useEffect(() => {
    if (isAdmin) {
      adminGetStats()
        .then((res) => setAdminStats(res as unknown as AdminStats))
        .catch(() => {});
    }
    ownerGetStats().then(setOwnerStats).catch(console.error);
  }, [isAdmin]);

  const loading = isAdmin ? !adminStats && !ownerStats : !ownerStats;

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-violet-600 border-t-transparent" />
      </div>
    );
  }

  const adminCards = adminStats
    ? [
        {
          label: "Utilisateurs",
          value: adminStats.users,
          icon: Users,
          color: "bg-violet-500/10 text-violet-400",
        },
        {
          label: "Produits (tous)",
          value: adminStats.products,
          icon: ShoppingBag,
          color: "bg-pink-500/10 text-pink-400",
        },
        {
          label: "Lieux (tous)",
          value: adminStats.places,
          icon: MapPin,
          color: "bg-blue-500/10 text-blue-400",
        },
        {
          label: "Messages",
          value: adminStats.messages,
          icon: MessageCircle,
          color: "bg-green-500/10 text-green-400",
        },
        {
          label: "Commandes (toutes)",
          value: adminStats.orders,
          icon: ClipboardList,
          color: "bg-yellow-500/10 text-yellow-400",
        },
        {
          label: "Revenus globaux",
          value: `${adminStats.revenue.toFixed(2)} €`,
          icon: DollarSign,
          color: "bg-emerald-500/10 text-emerald-400",
        },
        {
          label: "Prestataires bien-être",
          value: adminStats.wellness_providers,
          icon: Sparkles,
          color: "bg-teal-500/10 text-teal-400",
        },
        {
          label: "Réservations bien-être",
          value: adminStats.wellness_bookings,
          icon: Calendar,
          color: "bg-cyan-500/10 text-cyan-400",
        },
      ]
    : [];

  const ownerCards = ownerStats
    ? [
        {
          label: "Mes lieux",
          value: ownerStats.places,
          icon: MapPin,
          color: "bg-blue-500/10 text-blue-400",
        },
        {
          label: "Mes produits",
          value: ownerStats.products,
          icon: ShoppingBag,
          color: "bg-green-500/10 text-green-400",
        },
        {
          label: "Bien-être",
          value: ownerStats.wellness,
          icon: Heart,
          color: "bg-pink-500/10 text-pink-400",
        },
        {
          label: "Commandes",
          value: ownerStats.orders,
          icon: ClipboardList,
          color: "bg-orange-500/10 text-orange-400",
        },
        {
          label: "Revenus",
          value: `${ownerStats.revenue.toFixed(2)} €`,
          icon: DollarSign,
          color: "bg-yellow-500/10 text-yellow-400",
        },
        {
          label: "Réservations bien-être",
          value: ownerStats.bookings,
          icon: BarChart3,
          color: "bg-violet-500/10 text-violet-400",
        },
        {
          label: "Réservations lieux",
          value: ownerStats.reservations,
          icon: Calendar,
          color: "bg-indigo-500/10 text-indigo-400",
        },
      ]
    : [];

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-white">
        Vue d&apos;ensemble
      </h1>

      {isAdmin && adminCards.length > 0 && (
        <>
          <h2 className="mb-4 text-sm uppercase tracking-widest text-zinc-500">
            Plateforme
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 mb-8">
            {adminCards.map((card) => (
              <div
                key={card.label}
                className="rounded-xl bg-zinc-900/60 border border-zinc-800 p-5 transition hover:border-violet-500/30"
              >
                <div className="flex items-center gap-3">
                  <div className={`rounded-lg p-2 ${card.color}`}>
                    <card.icon size={20} />
                  </div>
                  <div>
                    <p className="text-sm text-zinc-400">{card.label}</p>
                    <p className="text-xl font-bold text-white">{card.value}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {ownerCards.length > 0 && (
        <>
          {isAdmin && (
            <h2 className="mb-4 text-sm uppercase tracking-widest text-zinc-500">
              Mes contenus
            </h2>
          )}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {ownerCards.map((card) => (
              <div
                key={card.label}
                className="rounded-xl bg-zinc-900/60 border border-zinc-800 p-5 transition hover:border-violet-500/30"
              >
                <div className="flex items-center gap-3">
                  <div className={`rounded-lg p-2 ${card.color}`}>
                    <card.icon size={20} />
                  </div>
                  <div>
                    <p className="text-sm text-zinc-400">{card.label}</p>
                    <p className="text-xl font-bold text-white">{card.value}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
