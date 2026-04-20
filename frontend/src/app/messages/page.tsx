"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { MessageCircle, ArrowLeft, User, Circle } from "lucide-react";
import { getConversations } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8888/ws";

interface Conversation {
  id: number;
  user1_id: number;
  user2_id: number;
  updated_at: string;
  other_user?: { username: string; avatar_url: string; is_online: boolean };
  last_message?: string;
}

export default function ConversationsPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const wsRef = useRef<WebSocket | null>(null);

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
    const ws = new WebSocket(`${WS_URL}/${user.id}`);
    wsRef.current = ws;

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === "message") {
          loadConversations();
          // Browser notification
          if (
            document.hidden &&
            typeof Notification !== "undefined" &&
            Notification.permission === "granted"
          ) {
            const sender = data.data?.sender?.username || "Quelqu'un";
            new Notification(`${sender} — Lomi Lomi`, {
              body: data.data?.content || "Nouveau message",
              icon: "/icon-192.png",
            });
          }
        }
      } catch {
        // ignore
      }
    };

    return () => {
      ws.close();
      wsRef.current = null;
    };
  }, [user]);

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
              const other = conv.other_user;
              return (
                <Link
                  key={conv.id}
                  href={`/messages/${conv.id}`}
                  className="flex items-center gap-4 bg-zinc-900/60 border border-zinc-800 hover:border-violet-500/30 rounded-xl p-4 transition"
                >
                  <div className="relative shrink-0">
                    <div className="w-12 h-12 rounded-full bg-zinc-800 flex items-center justify-center">
                      <User className="w-6 h-6 text-zinc-500" />
                    </div>
                    {other?.is_online && (
                      <Circle className="absolute -bottom-0.5 -right-0.5 w-4 h-4 text-green-500 fill-green-500" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-sm truncate">
                        {other?.username || `Utilisateur #${conv.user2_id}`}
                      </span>
                      <span className="text-xs text-zinc-500 shrink-0 ml-2">
                        {new Date(conv.updated_at).toLocaleDateString("fr-FR")}
                      </span>
                    </div>
                    <p className="text-zinc-400 text-xs truncate mt-0.5">
                      {conv.last_message || "Commencez la conversation..."}
                    </p>
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
