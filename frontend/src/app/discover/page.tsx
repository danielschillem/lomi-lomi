"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Heart,
  X,
  MapPin,
  ArrowLeft,
  User,
  RefreshCw,
  MessageCircle,
  Flag,
  Ban,
  Search,
} from "lucide-react";
import {
  discover,
  sendMessage,
  likeUser,
  passUser,
  reportUser,
  blockUser,
  searchProfiles,
} from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

interface Profile {
  id: number;
  username: string;
  bio: string;
  gender: string;
  city: string;
  avatar_url: string;
  is_verified: boolean;
  is_online: boolean;
}

export default function DiscoverPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [action, setAction] = useState<"like" | "pass" | null>(null);
  const [matched, setMatched] = useState<Profile | null>(null);
  const [showMenu, setShowMenu] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Profile[]>([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
      return;
    }
    if (user) loadProfiles();
  }, [user, authLoading, router]);

  async function loadProfiles() {
    setLoading(true);
    try {
      const res = await discover();
      setProfiles(res as unknown as Profile[]);
      setCurrentIndex(0);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }

  async function handleSearch(q: string) {
    setSearchQuery(q);
    if (q.trim().length < 2) {
      setSearchResults([]);
      return;
    }
    setSearching(true);
    try {
      const res = await searchProfiles(q.trim());
      setSearchResults(res as unknown as Profile[]);
    } catch {
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  }

  function handlePass() {
    setAction("pass");
    passUser().catch(() => {});
    setTimeout(() => {
      setAction(null);
      setCurrentIndex((i) => i + 1);
    }, 300);
  }

  async function handleLike() {
    const profile = profiles[currentIndex];
    setAction("like");
    try {
      const res = await likeUser(profile.id);
      setTimeout(() => {
        setAction(null);
        if (res.is_match) {
          setMatched(profile);
        } else {
          setCurrentIndex((i) => i + 1);
        }
      }, 300);
    } catch {
      setAction(null);
      setCurrentIndex((i) => i + 1);
    }
  }

  function closMatch() {
    setMatched(null);
    setCurrentIndex((i) => i + 1);
  }

  async function sendHello() {
    if (!matched) return;
    try {
      await sendMessage({
        receiver_id: matched.id,
        content: `Salut ${matched.username} ! Ravi de matcher avec toi.`,
      });
    } catch {
      // ignore
    }
    setMatched(null);
    setCurrentIndex((i) => i + 1);
  }

  async function handleReport(reason?: string) {
    const profile = profiles[currentIndex];
    const r = reason || reportReason;
    if (!profile || !r) return;
    try {
      await reportUser({ reported_id: profile.id, reason: r });
    } catch {
      // ignore
    }
    setShowMenu(false);
    setReportReason("");
    setCurrentIndex((i) => i + 1);
  }

  async function handleBlock() {
    const profile = profiles[currentIndex];
    if (!profile) return;
    try {
      await blockUser(profile.id);
    } catch {
      // ignore
    }
    setShowMenu(false);
    setCurrentIndex((i) => i + 1);
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-zinc-400">
          Chargement des profils...
        </div>
      </div>
    );
  }

  const current = profiles[currentIndex];
  const done = currentIndex >= profiles.length;

  return (
    <div className="min-h-screen px-4 py-12">
      <div className="max-w-lg mx-auto">
        {/* Header */}
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
            Découverte
          </h1>
          <button
            onClick={loadProfiles}
            className="text-zinc-400 hover:text-white transition"
            title="Rafraîchir"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
        </div>

        {/* Search bar */}
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Rechercher par pseudo ou ville..."
            title="Rechercher des profils"
            className="w-full bg-zinc-900/60 border border-zinc-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-violet-500 transition"
          />
        </div>

        {/* Search results */}
        {searchQuery.trim().length >= 2 && (
          <div className="mb-6 space-y-2">
            {searching ? (
              <p className="text-sm text-zinc-400 text-center animate-pulse">
                Recherche...
              </p>
            ) : searchResults.length === 0 ? (
              <p className="text-sm text-zinc-500 text-center">
                Aucun résultat
              </p>
            ) : (
              searchResults.map((p) => (
                <a
                  key={p.id}
                  href={`/users/${p.id}`}
                  className="flex items-center gap-3 bg-zinc-900/60 border border-zinc-800 hover:border-violet-500/30 rounded-xl p-3 transition"
                >
                  <div className="relative shrink-0">
                    <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center overflow-hidden">
                      {p.avatar_url ? (
                        <img
                          src={p.avatar_url}
                          alt={p.username}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <User className="w-5 h-5 text-zinc-500" />
                      )}
                    </div>
                    {p.is_online && (
                      <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-zinc-900" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="font-semibold text-sm">{p.username}</span>
                    {p.city && (
                      <p className="text-xs text-zinc-500 flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {p.city}
                      </p>
                    )}
                  </div>
                </a>
              ))
            )}
          </div>
        )}

        {/* Match overlay */}
        {matched && (
          <div className="fixed inset-0 z-50 bg-zinc-950/90 flex items-center justify-center px-4">
            <div className="bg-zinc-900 border border-violet-500/50 rounded-2xl p-8 text-center max-w-sm w-full">
              <div className="flex items-center justify-center gap-4 mb-4">
                <div className="w-16 h-16 rounded-full bg-zinc-800 border-2 border-violet-500 flex items-center justify-center">
                  <User className="w-8 h-8 text-violet-400" />
                </div>
                <Heart className="w-8 h-8 text-pink-500 animate-pulse" />
                <div className="w-16 h-16 rounded-full bg-zinc-800 border-2 border-pink-500 flex items-center justify-center">
                  <User className="w-8 h-8 text-pink-400" />
                </div>
              </div>
              <h2 className="text-2xl font-bold bg-linear-to-r from-violet-400 to-pink-500 bg-clip-text text-transparent mb-2">
                Match !
              </h2>
              <p className="text-zinc-400 text-sm mb-6">
                Vous et <span className="text-white">{matched.username}</span>{" "}
                avez matché !
              </p>
              <div className="flex gap-3">
                <button
                  onClick={sendHello}
                  className="flex-1 inline-flex items-center justify-center gap-2 bg-violet-600 hover:bg-violet-700 text-white font-semibold py-3 rounded-lg transition text-sm"
                >
                  <MessageCircle className="w-4 h-4" />
                  Envoyer un message
                </button>
                <button
                  onClick={closMatch}
                  className="px-4 text-zinc-400 hover:text-white transition text-sm"
                >
                  Plus tard
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Profile Card */}
        {done ? (
          <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-12 text-center">
            <User className="w-16 h-16 text-zinc-600 mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">Plus de profils</h2>
            <p className="text-zinc-400 text-sm mb-6">
              Revenez plus tard pour découvrir de nouveaux profils.
            </p>
            <button
              onClick={loadProfiles}
              className="inline-flex items-center gap-2 bg-violet-600 hover:bg-violet-700 text-white font-semibold px-6 py-3 rounded-lg transition text-sm"
            >
              <RefreshCw className="w-4 h-4" />
              Rafraîchir
            </button>
          </div>
        ) : (
          <div
            className={`bg-zinc-900/60 border border-zinc-800 rounded-2xl overflow-hidden transition-all duration-300 ${
              action === "like"
                ? "border-pink-500/50 translate-x-4 opacity-80"
                : action === "pass"
                  ? "border-zinc-600 -translate-x-4 opacity-80"
                  : ""
            }`}
          >
            {/* Avatar area */}
            <div className="relative h-72 bg-zinc-800 flex items-center justify-center">
              {current.avatar_url ? (
                <img
                  src={current.avatar_url}
                  alt={current.username}
                  className="w-full h-full object-cover"
                />
              ) : (
                <User className="w-24 h-24 text-zinc-600" />
              )}
              {current.is_online && (
                <span className="absolute top-4 right-4 w-3 h-3 bg-green-500 rounded-full border-2 border-zinc-900" />
              )}
              {current.is_verified && (
                <span className="absolute top-4 left-4 text-xs bg-green-500/10 text-green-400 border border-green-500/20 px-2 py-0.5 rounded-full">
                  Vérifié
                </span>
              )}
            </div>

            {/* Info */}
            <div className="p-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold">{current.username}</h2>
                <div className="relative">
                  <button
                    onClick={() => setShowMenu(!showMenu)}
                    className="text-zinc-500 hover:text-zinc-300 transition p-1"
                    title="Options"
                  >
                    <Flag className="w-4 h-4" />
                  </button>
                  {showMenu && (
                    <div className="absolute right-0 top-8 z-20 bg-zinc-800 border border-zinc-700 rounded-lg shadow-xl w-52 py-1">
                      <button
                        onClick={handleBlock}
                        className="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-zinc-700 transition flex items-center gap-2"
                      >
                        <Ban className="w-4 h-4" /> Bloquer
                      </button>
                      <div className="border-t border-zinc-700 my-1" />
                      <p className="px-4 py-1 text-xs text-zinc-500">
                        Signaler :
                      </p>
                      {["spam", "fake", "harassment", "inappropriate"].map(
                        (r) => (
                          <button
                            key={r}
                            onClick={() => handleReport(r)}
                            className="w-full text-left px-4 py-1.5 text-sm text-zinc-300 hover:bg-zinc-700 transition capitalize"
                          >
                            {r === "harassment"
                              ? "Harcèlement"
                              : r === "fake"
                                ? "Faux profil"
                                : r === "inappropriate"
                                  ? "Inapproprié"
                                  : "Spam"}
                          </button>
                        ),
                      )}
                    </div>
                  )}
                </div>
              </div>
              {current.city && (
                <p className="text-zinc-400 text-sm flex items-center gap-1 mt-1">
                  <MapPin className="w-3.5 h-3.5" />
                  {current.city}
                </p>
              )}
              {current.gender && (
                <p className="text-zinc-500 text-xs capitalize mt-1">
                  {current.gender}
                </p>
              )}
              {current.bio && (
                <p className="text-zinc-300 text-sm mt-3 leading-relaxed">
                  {current.bio}
                </p>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center justify-center gap-6 p-6 pt-0">
              <button
                onClick={handlePass}
                className="w-16 h-16 rounded-full border-2 border-zinc-700 hover:border-zinc-500 flex items-center justify-center transition"
                title="Passer"
              >
                <X className="w-7 h-7 text-zinc-400" />
              </button>
              <button
                onClick={handleLike}
                className="w-20 h-20 rounded-full bg-linear-to-br from-violet-600 to-pink-600 hover:from-violet-700 hover:to-pink-700 flex items-center justify-center transition shadow-lg shadow-violet-600/25"
                title="J'aime"
              >
                <Heart className="w-9 h-9 text-white" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
