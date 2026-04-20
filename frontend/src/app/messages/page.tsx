"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { MessageCircle, ArrowLeft, User, Circle } from "lucide-react";
import { getConversations } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { useWS } from "@/lib/ws-context";

interface ConvUser {
  id: number;
  username: string;
  avatar_url: string;
  is_online: boolean;
}

interface Conversation {
  id: number;
  user1_id: number;
  user2_id: number;
  user1: ConvUser;
  user2: ConvUser;
  updated_at: string;
  last_message?: string;
  unread_count?: number;
}

export default function ConversationsPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { subscribe } = useWS();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);

  function loadConversations() {
    getConversations()
      .then((res) => setConversations(res as unknown as Conversation[]))
      .catch(() => {})
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
      return;
    }
    if (user) {
      loadConversations();
    }
  }, [user, authLoading, router]);

  // WS: refresh list when a new message arrives
  useEffect(() => {
    if (!user) return;
    return subscribe((event) => {
      if (event.type === "message") {
        loadConversations();
        // Browser notification
        if (
          document.hidden &&
          typeof Notification !== "undefined" &&
          Notification.permission === "granted"
        ) {
          const sender = (event.data as Record<string, unknown>)?.sender as
            | Record<string, unknown>
            | undefined;
          const senderName = (sender?.username as string) || "Quelqu'un";
          new Notification(`${senderName} — Lomi Lomi`, {
            body:
              ((event.data as Record<string, unknown>)?.content as string) ||
              "Nouveau message",
            icon: "/icon-192.png",
          });
        }
      }
    });
  }, [user, subscribe]);

  // Request notification permission
  useEffect(() => {
    if (
      typeof Notification !== "undefined" &&
      Notification.permission === "default"
    ) {
      Notification.requestPermission();
    }
  }, []);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-zinc-400">Chargement...</div>
      </div>
    );
  }

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
            <MessageCircle className="w-5 h-5 text-violet-400" />
            Messages
          </h1>
          <div className="w-16" />
        </div>

        {conversations.length === 0 ? (
          <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-12 text-center">
            <MessageCircle className="w-16 h-16 text-zinc-600 mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">Aucune conversation</h2>
            <p className="text-zinc-400 text-sm mb-6">
              Commencez par découvrir des profils et matcher !
            </p>
            <Link
              href="/discover"
              className="inline-block bg-violet-600 hover:bg-violet-700 text-white font-semibold px-6 py-3 rounded-lg transition text-sm"
            >
              Découvrir des profils
            </Link>
          </div>
        ) : (
          <div className="space-y-2">
            {conversations.map((conv) => {
              const other =
                user && conv.user1_id === user.id ? conv.user2 : conv.user1;
              const hasUnread = (conv.unread_count ?? 0) > 0;
              return (
                <Link
                  key={conv.id}
                  href={`/messages/${conv.id}`}
                  className="flex items-center gap-4 bg-zinc-900/60 border border-zinc-800 hover:border-violet-500/30 rounded-xl p-4 transition"
                >
                  <div className="relative shrink-0">
                    <div className="w-12 h-12 rounded-full bg-zinc-800 flex items-center justify-center overflow-hidden">
                      {other?.avatar_url ? (
                        <img
                          src={other.avatar_url}
                          alt={other.username}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <User className="w-6 h-6 text-zinc-500" />
                      )}
                    </div>
                    {other?.is_online && (
                      <Circle className="absolute -bottom-0.5 -right-0.5 w-4 h-4 text-green-500 fill-green-500" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span
                        className={`font-semibold text-sm truncate ${hasUnread ? "text-white" : ""}`}
                      >
                        {other?.username || `Utilisateur #${conv.user2_id}`}
                      </span>
                      <span className="text-xs text-zinc-500 shrink-0 ml-2">
                        {new Date(conv.updated_at).toLocaleDateString("fr-FR")}
                      </span>
                    </div>
                    <div className="flex items-center justify-between mt-0.5">
                      <p
                        className={`text-xs truncate ${hasUnread ? "text-zinc-200 font-medium" : "text-zinc-400"}`}
                      >
                        {conv.last_message || "Commencez la conversation..."}
                      </p>
                      {hasUnread && (
                        <span className="shrink-0 ml-2 w-5 h-5 rounded-full bg-violet-600 text-white text-[10px] font-bold flex items-center justify-center">
                          {conv.unread_count}
                        </span>
                      )}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
