"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Heart,
  ArrowLeft,
  User,
  MessageCircle,
  Trash2,
  MapPin,
  BadgeCheck,
} from "lucide-react";
import { getMatches, unmatch, getOrCreateConversation } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

interface MatchUser {
  id: number;
  username: string;
  avatar_url: string;
  city: string;
  is_online: boolean;
  is_verified: boolean;
}

interface Match {
  id: number;
  user1_id: number;
  user2_id: number;
  user1: MatchUser;
  user2: MatchUser;
  created_at: string;
}

export default function MatchesPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [removing, setRemoving] = useState<number | null>(null);
  const [messaging, setMessaging] = useState<number | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
      return;
    }
    if (user) {
      getMatches()
        .then((res) => setMatches(res as unknown as Match[]))
        .catch(() => {})
        .finally(() => setLoading(false));
    }
  }, [user, authLoading, router]);

  async function handleUnmatch(matchId: number) {
    if (!confirm("Supprimer ce match ? Cette action est irréversible.")) return;
    setRemoving(matchId);
    try {
      await unmatch(matchId);
      setMatches((prev) => prev.filter((m) => m.id !== matchId));
    } catch {
      // ignore
    } finally {
      setRemoving(null);
    }
  }

  function getOtherUser(match: Match): MatchUser {
    return match.user1_id === user?.id ? match.user2 : match.user1;
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-zinc-400">Chargement...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen px-4 py-12 pb-24">
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
            <Heart className="w-5 h-5 text-pink-500" />
            Mes matches ({matches.length})
          </h1>
          <div className="w-16" />
        </div>

        {matches.length === 0 ? (
          <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-12 text-center">
            <Heart className="w-16 h-16 text-zinc-600 mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">Aucun match</h2>
            <p className="text-zinc-400 text-sm mb-6">
              Explorez des profils et likez pour matcher !
            </p>
            <Link
              href="/discover"
              className="inline-block bg-violet-600 hover:bg-violet-700 text-white font-semibold px-6 py-3 rounded-lg transition text-sm"
            >
              Découvrir des profils
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {matches.map((match) => {
              const other = getOtherUser(match);
              return (
                <div
                  key={match.id}
                  className="bg-zinc-900/60 border border-zinc-800 rounded-2xl overflow-hidden hover:border-violet-500/30 transition"
                >
                  <Link href={`/users/${other.id}`}>
                    <div className="relative h-36 bg-zinc-800 flex items-center justify-center">
                      {other.avatar_url ? (
                        <img
                          src={other.avatar_url}
                          alt={other.username}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <User className="w-12 h-12 text-zinc-600" />
                      )}
                      {other.is_online && (
                        <span className="absolute top-2 right-2 w-3 h-3 bg-green-500 rounded-full border-2 border-zinc-900" />
                      )}
                    </div>
                  </Link>
                  <div className="p-3">
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className="font-semibold text-sm truncate">
                        {other.username}
                      </span>
                      {other.is_verified && (
                        <BadgeCheck className="w-3.5 h-3.5 text-violet-400 shrink-0" />
                      )}
                    </div>
                    {other.city && (
                      <p className="text-[11px] text-zinc-500 flex items-center gap-1 mb-2">
                        <MapPin className="w-3 h-3" />
                        {other.city}
                      </p>
                    )}
                    <p className="text-[10px] text-zinc-600 mb-2">
                      Match le{" "}
                      {new Date(match.created_at).toLocaleDateString("fr-FR")}
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={async () => {
                          setMessaging(other.id);
                          try {
                            const conv = (await getOrCreateConversation(
                              other.id,
                            )) as { id: number };
                            router.push(`/messages/${conv.id}`);
                          } catch {
                            /* ignore */
                          }
                          setMessaging(null);
                        }}
                        disabled={messaging === other.id}
                        className="flex-1 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white text-xs font-semibold py-1.5 rounded-lg transition flex items-center justify-center gap-1"
                      >
                        <MessageCircle className="w-3 h-3" />
                        {messaging === other.id ? "..." : "Message"}
                      </button>
                      <button
                        onClick={() => handleUnmatch(match.id)}
                        disabled={removing === match.id}
                        className="px-2.5 py-1.5 border border-zinc-700 hover:border-red-600 text-zinc-400 hover:text-red-400 rounded-lg transition disabled:opacity-50"
                        title="Supprimer le match"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
