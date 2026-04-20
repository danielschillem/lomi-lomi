"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Heart,
  MessageCircle,
  Bell,
  User,
  ShoppingBag,
  MapPin,
} from "lucide-react";
import { getUnreadCount } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8888/ws";

export default function Navbar() {
  const pathname = usePathname();
  const { user } = useAuth();
  const [unreadNotifs, setUnreadNotifs] = useState(0);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (!user) return;
    // Fetch unread notification count
    getUnreadCount()
      .then((res) => setUnreadNotifs(res.count))
      .catch(() => {});
  }, [pathname, user]);

  // WS: update badges in real-time
  useEffect(() => {
    if (!user) return;
    const ws = new WebSocket(`${WS_URL}/${user.id}`);
    wsRef.current = ws;

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === "message") {
          if (!pathname.startsWith("/messages")) {
            setUnreadMessages((c) => c + 1);
          }
        }
        if (data.type === "notification" || data.type === "match") {
          setUnreadNotifs((c) => c + 1);
        }
      } catch {
        // ignore
      }
    };

    return () => {
      ws.close();
      wsRef.current = null;
    };
  }, [user, pathname]);

  // Reset message badge when visiting messages
  useEffect(() => {
    if (pathname.startsWith("/messages")) {
      setUnreadMessages(0);
    }
  }, [pathname]);

  // Hide navbar on login/register or when not authenticated
  if (!user || pathname === "/login" || pathname === "/register") return null;

  const links = [
    { href: "/discover", icon: Heart, label: "Découvrir" },
    {
      href: "/messages",
      icon: MessageCircle,
      label: "Messages",
      badge: unreadMessages,
    },
    {
      href: "/notifications",
      icon: Bell,
      label: "Notifs",
      badge: unreadNotifs,
    },
    { href: "/boutique", icon: ShoppingBag, label: "Boutique" },
    { href: "/carte", icon: MapPin, label: "Carte" },
    { href: "/profile", icon: User, label: "Profil" },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-zinc-900/95 backdrop-blur-md border-t border-zinc-800">
      <div className="max-w-lg mx-auto flex items-center justify-around py-2">
        {links.map((link) => {
          const Icon = link.icon;
          const active =
            pathname === link.href || pathname.startsWith(link.href + "/");
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`relative flex flex-col items-center gap-0.5 px-2 py-1 transition ${
                active ? "text-violet-400" : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[10px]">{link.label}</span>
              {link.badge && link.badge > 0 ? (
                <span className="absolute -top-1 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center text-[10px] font-bold bg-pink-500 text-white rounded-full px-1">
                  {link.badge > 99 ? "99+" : link.badge}
                </span>
              ) : null}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
