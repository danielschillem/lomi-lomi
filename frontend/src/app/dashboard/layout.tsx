"use client";

import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import Link from "next/link";
import {
  LayoutDashboard,
  MapPin,
  ShoppingBag,
  ClipboardList,
  Heart,
  Calendar,
} from "lucide-react";

const navItems = [
  { href: "/dashboard", label: "Vue d'ensemble", icon: LayoutDashboard },
  { href: "/dashboard/places", label: "Mes lieux", icon: MapPin },
  { href: "/dashboard/products", label: "Mes produits", icon: ShoppingBag },
  { href: "/dashboard/orders", label: "Commandes", icon: ClipboardList },
  { href: "/dashboard/wellness", label: "Bien-être", icon: Heart },
  { href: "/dashboard/reservations", label: "Réservations", icon: Calendar },
];

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (
      !loading &&
      (!user || (user.role !== "owner" && user.role !== "admin"))
    ) {
      router.replace("/");
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-purple-600 border-t-transparent" />
      </div>
    );
  }

  if (!user || (user.role !== "owner" && user.role !== "admin")) return null;

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="hidden w-64 bg-white shadow-sm lg:block">
        <div className="p-6">
          <h2 className="text-xl font-bold text-purple-700">🏪 Dashboard</h2>
          <p className="mt-1 text-sm text-gray-500">{user.username}</p>
        </div>
        <nav className="space-y-1 px-3 pb-6">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-gray-700 transition hover:bg-purple-50 hover:text-purple-700"
            >
              <item.icon size={18} />
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>

      {/* Mobile nav */}
      <div className="fixed bottom-0 left-0 right-0 z-50 border-t bg-white lg:hidden">
        <nav className="flex justify-around py-2">
          {navItems.slice(0, 5).map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex flex-col items-center gap-1 text-xs text-gray-600 hover:text-purple-700"
            >
              <item.icon size={18} />
              <span className="truncate">{item.label.split(" ").pop()}</span>
            </Link>
          ))}
        </nav>
      </div>

      {/* Main content */}
      <main className="flex-1 p-4 pb-20 lg:p-8 lg:pb-8">{children}</main>
    </div>
  );
}
