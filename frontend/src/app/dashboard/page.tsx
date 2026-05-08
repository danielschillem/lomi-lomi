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
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  const adminCards = adminStats
    ? [
        {
          label: "Utilisateurs",
          value: adminStats.users,
          icon: Users,
          color: "bg-blue-50 text-blue-600",
        },
        {
          label: "Produits (tous)",
          value: adminStats.products,
          icon: ShoppingBag,
          color: "bg-blue-50 text-blue-500",
        },
        {
          label: "Lieux (tous)",
          value: adminStats.places,
          icon: MapPin,
          color: "bg-blue-50 text-blue-600",
        },
        {
          label: "Messages",
          value: adminStats.messages,
          icon: MessageCircle,
          color: "bg-green-50 text-green-600",
        },
        {
          label: "Commandes (toutes)",
          value: adminStats.orders,
          icon: ClipboardList,
          color: "bg-yellow-50 text-yellow-600",
        },
        {
          label: "Revenus globaux",
          value: `${Math.round(adminStats.revenue)} FCFA`,
          icon: DollarSign,
          color: "bg-emerald-50 text-emerald-600",
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
          color: "bg-blue-50 text-blue-600",
        },
        {
          label: "Mes produits",
          value: ownerStats.products,
          icon: ShoppingBag,
          color: "bg-green-50 text-green-600",
        },
        {
          label: "Bien-être",
          value: ownerStats.wellness,
          icon: Heart,
          color: "bg-blue-50 text-blue-500",
        },
        {
          label: "Commandes",
          value: ownerStats.orders,
          icon: ClipboardList,
          color: "bg-orange-500/10 text-orange-400",
        },
        {
          label: "Revenus",
          value: `${Math.round(ownerStats.revenue)} FCFA`,
          icon: DollarSign,
          color: "bg-yellow-50 text-yellow-600",
        },
        {
          label: "Réservations bien-être",
          value: ownerStats.bookings,
          icon: BarChart3,
          color: "bg-blue-50 text-blue-600",
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
          <h2 className="mb-4 text-sm uppercase tracking-widest text-muted">
            Plateforme
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 mb-8">
            {adminCards.map((card) => (
              <div
                key={card.label}
                className="rounded-xl bg-white/90 border border-border p-5 transition hover:border-blue-400/30"
              >
                <div className="flex items-center gap-3">
                  <div className={`rounded-lg p-2 ${card.color}`}>
                    <card.icon size={20} />
                  </div>
                  <div>
                    <p className="text-sm text-muted">{card.label}</p>
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
            <h2 className="mb-4 text-sm uppercase tracking-widest text-muted">
              Mes contenus
            </h2>
          )}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {ownerCards.map((card) => (
              <div
                key={card.label}
                className="rounded-xl bg-white/90 border border-border p-5 transition hover:border-blue-400/30"
              >
                <div className="flex items-center gap-3">
                  <div className={`rounded-lg p-2 ${card.color}`}>
                    <card.icon size={20} />
                  </div>
                  <div>
                    <p className="text-sm text-muted">{card.label}</p>
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
