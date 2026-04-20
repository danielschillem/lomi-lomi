"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Bell,
  ArrowLeft,
  Heart,
  MessageCircle,
  ShoppingBag,
  Check,
  Trash2,
} from "lucide-react";
import {
  getNotifications,
  markNotificationsRead,
  deleteNotification,
} from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

interface Notification {
  id: number;
  type: string;
  title: string;
  body: string;
  is_read: boolean;
  created_at: string;
}

export default function NotificationsPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [notifs, setNotifs] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
      return;
    }
    if (user) loadNotifs();
  }, [user, authLoading, router]);

  async function loadNotifs() {
    setLoading(true);
    try {
      const res = await getNotifications();
      setNotifs(res as unknown as Notification[]);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }

  async function handleMarkAllRead() {
    try {
      await markNotificationsRead();
      setNotifs((prev) => prev.map((n) => ({ ...n, is_read: true })));
    } catch {
      // ignore
    }
  }

  async function handleDelete(id: number) {
    try {
      await deleteNotification(id);
      setNotifs((prev) => prev.filter((n) => n.id !== id));
    } catch {
      // ignore
    }
  }

  function iconFor(type: string) {
    switch (type) {
      case "match":
        return <Heart className="w-5 h-5 text-pink-500" />;
      case "message":
        return <MessageCircle className="w-5 h-5 text-violet-400" />;
      case "order":
        return <ShoppingBag className="w-5 h-5 text-green-400" />;
      default:
        return <Bell className="w-5 h-5 text-zinc-400" />;
    }
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-zinc-400">Chargement...</div>
      </div>
    );
  }

  const unread = notifs.filter((n) => !n.is_read).length;

  return (
    <div className="min-h-screen px-4 py-12">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-white transition"
          >
            <ArrowLeft className="w-4 h-4" />
            Accueil
          </Link>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Bell className="w-5 h-5 text-violet-400" />
            Notifications
            {unread > 0 && (
              <span className="text-xs bg-pink-600 text-white px-2 py-0.5 rounded-full">
                {unread}
              </span>
            )}
          </h1>
          {unread > 0 && (
            <button
              onClick={handleMarkAllRead}
              className="text-xs text-violet-400 hover:text-violet-300 transition flex items-center gap-1"
            >
              <Check className="w-3.5 h-3.5" />
              Tout lire
            </button>
          )}
        </div>

        {notifs.length === 0 ? (
          <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-12 text-center">
            <Bell className="w-12 h-12 text-zinc-600 mx-auto mb-4" />
            <p className="text-zinc-400">Aucune notification</p>
          </div>
        ) : (
          <div className="space-y-2">
            {notifs.map((n) => (
              <div
                key={n.id}
                className={`flex items-start gap-4 p-4 rounded-xl border transition ${
                  n.is_read
                    ? "bg-zinc-900/40 border-zinc-800"
                    : "bg-zinc-900/80 border-violet-500/30"
                }`}
              >
                <div className="mt-0.5">{iconFor(n.type)}</div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm">{n.title}</p>
                  <p className="text-zinc-400 text-sm mt-0.5">{n.body}</p>
                  <p className="text-zinc-600 text-xs mt-1">
                    {new Date(n.created_at).toLocaleString("fr-FR")}
                  </p>
                </div>
                <button
                  onClick={() => handleDelete(n.id)}
                  className="text-zinc-600 hover:text-red-400 transition"
                  title="Supprimer"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
