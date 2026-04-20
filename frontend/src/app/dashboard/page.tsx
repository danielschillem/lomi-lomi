"use client";

import { useEffect, useState } from "react";
import { ownerGetStats } from "@/lib/api";
import {
  MapPin,
  ShoppingBag,
  Heart,
  ClipboardList,
  DollarSign,
  Calendar,
  Users,
} from "lucide-react";

interface Stats {
  places: number;
  products: number;
  wellness: number;
  orders: number;
  revenue: number;
  bookings: number;
  reservations: number;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    ownerGetStats().then(setStats).catch(console.error);
  }, []);

  if (!stats) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-purple-600 border-t-transparent" />
      </div>
    );
  }

  const cards = [
    {
      label: "Lieux",
      value: stats.places,
      icon: MapPin,
      color: "bg-blue-50 text-blue-700",
    },
    {
      label: "Produits",
      value: stats.products,
      icon: ShoppingBag,
      color: "bg-green-50 text-green-700",
    },
    {
      label: "Wellness",
      value: stats.wellness,
      icon: Heart,
      color: "bg-pink-50 text-pink-700",
    },
    {
      label: "Commandes",
      value: stats.orders,
      icon: ClipboardList,
      color: "bg-orange-50 text-orange-700",
    },
    {
      label: "Revenus",
      value: `${stats.revenue.toFixed(2)} €`,
      icon: DollarSign,
      color: "bg-yellow-50 text-yellow-700",
    },
    {
      label: "Réservations bien-être",
      value: stats.bookings,
      icon: Users,
      color: "bg-purple-50 text-purple-700",
    },
    {
      label: "Réservations lieux",
      value: stats.reservations,
      icon: Calendar,
      color: "bg-indigo-50 text-indigo-700",
    },
  ];

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-gray-900">
        Vue d&apos;ensemble
      </h1>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {cards.map((card) => (
          <div
            key={card.label}
            className="rounded-xl bg-white p-5 shadow-sm transition hover:shadow-md"
          >
            <div className="flex items-center gap-3">
              <div className={`rounded-lg p-2 ${card.color}`}>
                <card.icon size={20} />
              </div>
              <div>
                <p className="text-sm text-gray-500">{card.label}</p>
                <p className="text-xl font-bold text-gray-900">{card.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
