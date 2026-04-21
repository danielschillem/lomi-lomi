"use client";

import { useAuth } from "@/lib/auth-context";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import Link from "next/link";
import {
  LayoutDashboard,
  MapPin,
  ShoppingBag,
  ClipboardList,
  Heart,
  Calendar,
  Users,
  AlertTriangle,
  BarChart3,
  ArrowLeft,
} from "lucide-react";

const ownerNav = [
  { href: "/dashboard", label: "Vue d'ensemble", icon: LayoutDashboard },
  { href: "/dashboard/places", label: "Lieux", icon: MapPin },
  { href: "/dashboard/products", label: "Produits", icon: ShoppingBag },
  { href: "/dashboard/orders", label: "Commandes", icon: ClipboardList },
  { href: "/dashboard/wellness", label: "Bien-être", icon: Heart },
  { href: "/dashboard/reservations", label: "Réservations", icon: Calendar },
];

const adminNav = [
  { href: "/dashboard/users", label: "Utilisateurs", icon: Users },
  { href: "/dashboard/reports", label: "Signalements", icon: AlertTriangle },
  { href: "/dashboard/stats", label: "Statistiques", icon: BarChart3 },
];

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

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
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-violet-600 border-t-transparent" />
      </div>
    );
  }

  if (!user || (user.role !== "owner" && user.role !== "admin")) return null;

  const isAdmin = user.role === "admin";
  const navItems = isAdmin ? [...ownerNav, ...adminNav] : ownerNav;

  return (
    <div className="flex min-h-screen bg-zinc-950">
      {/* Sidebar */}
      <aside className="hidden w-64 shrink-0 flex-col bg-zinc-900 border-r border-zinc-800 lg:flex">
        <div className="p-6 border-b border-zinc-800">
          <Link href="/" className="text-lg font-bold">
            <span className="text-violet-500">Lomi</span>{" "}
            <span className="text-pink-500">Lomi</span>
          </Link>
          <p className="mt-1 text-sm text-zinc-400">
            {isAdmin ? "Administration" : user.username}
          </p>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {ownerNav.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition ${
                  active
                    ? "bg-violet-500/10 text-violet-400 font-medium"
                    : "text-zinc-400 hover:text-white hover:bg-zinc-800"
                }`}
              >
                <item.icon className="w-4 h-4" />
                {item.label}
              </Link>
            );
          })}

          {isAdmin && (
            <>
              <div className="pt-4 pb-1 px-3">
                <p className="text-[10px] uppercase tracking-widest text-zinc-600">
                  Admin
                </p>
              </div>
              {adminNav.map((item) => {
                const active = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition ${
                      active
                        ? "bg-violet-500/10 text-violet-400 font-medium"
                        : "text-zinc-400 hover:text-white hover:bg-zinc-800"
                    }`}
                  >
                    <item.icon className="w-4 h-4" />
                    {item.label}
                  </Link>
                );
              })}
            </>
          )}
        </nav>

        <div className="p-4 border-t border-zinc-800">
          <Link
            href="/"
            className="flex items-center gap-2 text-xs text-zinc-500 hover:text-white transition"
          >
            <ArrowLeft className="w-3 h-3" />
            Retour au site
          </Link>
        </div>
      </aside>

      {/* Mobile bottom nav */}
      <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-zinc-800 bg-zinc-900/95 backdrop-blur-md lg:hidden">
        <nav className="flex justify-around py-2">
          {navItems.slice(0, 5).map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center gap-1 text-xs ${
                  active ? "text-violet-400" : "text-zinc-400"
                }`}
              >
                <item.icon size={18} />
                <span className="truncate">{item.label.split(" ").pop()}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Main content */}
      <main className="flex-1 p-4 pb-20 lg:p-8 lg:pb-8 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
