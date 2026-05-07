"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
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
  SlidersHorizontal,
  Undo2,
  Navigation,
  Sparkles,
  Radar as RadarIcon,
  Star,
  Crown,
} from "lucide-react";
import {
  discover,
  getOrCreateConversation,
  likeUser,
  passUser,
  superLike,
  rewind,
  whoLikedMe,
  reportUser,
  blockUser,
  searchProfiles,
  getPreferences,
  updatePreferences,
} from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import Radar from "@/components/Radar";

interface Profile {
  id: number;
  username: string;
  bio: string;
  gender: string;
  city: string;
  avatar_url: string;
  is_verified: boolean;
  is_online: boolean;
  age: number;
  distance: number;
  interests: string;
  photos?: { id: number; url: string; position: number }[];
}

interface Preferences {
  min_age: number;
  max_age: number;
  max_distance: number;
  gender: string;
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
  const [photoIndex, setPhotoIndex] = useState(0);
  const [recycledMode, setRecycledMode] = useState(false);

  // Radar
  const [showRadar, setShowRadar] = useState(false);

  // Filters
  const [showFilters, setShowFilters] = useState(false);
  const [prefs, setPrefs] = useState<Preferences>({
    min_age: 18,
    max_age: 99,
    max_distance: 50,
    gender: "",
  });

  // Undo
  const [lastPassed, setLastPassed] = useState<{
    profile: Profile;
    index: number;
  } | null>(null);

  // Who liked me
  const [whoLikedTab, setWhoLikedTab] = useState(false);
  const [whoLikedData, setWhoLikedData] = useState<{
    count: number;
    profiles: Record<string, unknown>[];
    upgrade: boolean;
  } | null>(null);
  const [whoLikedLoading, setWhoLikedLoading] = useState(false);

  // Swipe
  const cardRef = useRef<HTMLDivElement>(null);
  const [dragX, setDragX] = useState(0);
  const [dragging, setDragging] = useState(false);
  const dragStart = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
      return;
    }
    if (user) {
      loadProfiles();
      loadPreferences();
    }
  }, [user, authLoading, router]);

  async function loadProfiles() {
    setLoading(true);
    try {
      const res = await discover();
      setProfiles(res.profiles as unknown as Profile[]);
      setRecycledMode(Boolean(res.recycled));
      setCurrentIndex(0);
      setLastPassed(null);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }

  async function loadPreferences() {
    try {
      const res = await getPreferences();
      const p = res as unknown as Preferences;
      setPrefs({
        min_age: p.min_age || 18,
        max_age: p.max_age || 99,
        max_distance: p.max_distance || 50,
        gender: p.gender || "",
      });
    } catch {
      // ignore
    }
  }

  async function savePreferences(newPrefs: Preferences) {
    setPrefs(newPrefs);
    try {
      await updatePreferences(newPrefs as unknown as Record<string, unknown>);
    } catch {
      // ignore
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

  const handlePass = useCallback(() => {
    const profile = profiles[currentIndex];
    if (!profile || action) return;
    setLastPassed({ profile, index: currentIndex });
    setAction("pass");
    passUser(profile.id).catch(() => {});
    setTimeout(() => {
      setAction(null);
      setPhotoIndex(0);
      setDragX(0);
      setCurrentIndex((i) => i + 1);
    }, 300);
  }, [profiles, currentIndex, action]);

  const handleLike = useCallback(async () => {
    const profile = profiles[currentIndex];
    if (!profile || action) return;
    setLastPassed(null);
    setAction("like");
    try {
      const res = await likeUser(profile.id);
      setTimeout(() => {
        setAction(null);
        setPhotoIndex(0);
        setDragX(0);
        if (res.is_match) {
          setMatched(profile);
        } else {
          setCurrentIndex((i) => i + 1);
        }
      }, 300);
    } catch {
      setAction(null);
      setDragX(0);
      setCurrentIndex((i) => i + 1);
    }
  }, [profiles, currentIndex, action]);

  const handleUndo = useCallback(() => {
    if (!lastPassed) return;
    // Re-insert profile at current index
    setProfiles((prev) => {
      const copy = [...prev];
      copy.splice(currentIndex, 0, lastPassed.profile);
      return copy;
    });
    setLastPassed(null);
    setPhotoIndex(0);
  }, [lastPassed, currentIndex]);

  // Keyboard shortcuts
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      )
        return;
      const current = profiles[currentIndex];
      if (!current || matched || showFilters) return;

      if (e.key === "ArrowLeft") {
        e.preventDefault();
        handlePass();
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        handleLike();
      } else if (e.key === "z" && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        handleUndo();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [
    profiles,
    currentIndex,
    matched,
    showFilters,
    handlePass,
    handleLike,
    handleUndo,
  ]);

  const handleSuperLike = useCallback(async () => {
    const profile = profiles[currentIndex];
    if (!profile || action) return;
    setLastPassed(null);
    setAction("like");
    try {
      await superLike(profile.id);
      setTimeout(() => {
        setAction(null);
        setPhotoIndex(0);
        setDragX(0);
        setCurrentIndex((i) => i + 1);
      }, 300);
    } catch {
      setAction(null);
    }
  }, [profiles, currentIndex, action]);

  async function handleRewind() {
    try {
      await rewind();
      // Reload profiles
      const data = await discover();
      setProfiles(data.profiles as unknown as Profile[]);
      setRecycledMode(Boolean(data.recycled));
      setCurrentIndex(0);
    } catch {
      // Premium required - redirect
      window.location.href = "/premium";
    }
  }

  async function loadWhoLikedMe() {
    setWhoLikedLoading(true);
    try {
      const data = await whoLikedMe();
      setWhoLikedData(data);
    } finally {
      setWhoLikedLoading(false);
    }
  }

  function toggleWhoLiked() {
    if (!whoLikedTab) {
      setWhoLikedTab(true);
      if (!whoLikedData) loadWhoLikedMe();
    } else {
      setWhoLikedTab(false);
    }
  }

  function closeMatch() {
    setMatched(null);
    setCurrentIndex((i) => i + 1);
  }

  async function sendHello() {
    if (!matched) return;
    const target = matched;
    setMatched(null);
    setCurrentIndex((i) => i + 1);
    try {
      const conv = (await getOrCreateConversation(target.id)) as {
        id: number;
      };
      router.push(`/messages/${conv.id}`);
    } catch {
      router.push("/messages");
    }
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

  // --- Swipe gesture handlers ---
  function onPointerDown(e: React.PointerEvent) {
    if (matched || showFilters) return;
    dragStart.current = { x: e.clientX, y: e.clientY };
    setDragging(true);
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!dragging || !dragStart.current) return;
    const dx = e.clientX - dragStart.current.x;
    setDragX(dx);
  }

  function onPointerUp() {
    if (!dragging) return;
    setDragging(false);
    dragStart.current = null;
    if (dragX > 100) {
      handleLike();
    } else if (dragX < -100) {
      handlePass();
    } else {
      setDragX(0);
    }
  }

  function parseInterests(raw: string): string[] {
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    } catch {
      // fallback: comma-separated
    }
    return raw
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  }

  // --- Skeleton loader ---
  if (authLoading || loading) {
    return (
      <div className="min-h-screen px-4 py-12">
        <div className="max-w-lg mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div className="h-5 w-16 bg-surface-2 rounded animate-pulse" />
            <div className="h-6 w-28 bg-surface-2 rounded animate-pulse" />
            <div className="h-5 w-5 bg-surface-2 rounded animate-pulse" />
          </div>
          <div className="bg-white/90 border border-border rounded-2xl overflow-hidden">
            <div className="h-80 bg-surface-2 animate-pulse" />
            <div className="p-6 space-y-3">
              <div className="flex items-center gap-3">
                <div className="h-6 w-32 bg-surface-2 rounded animate-pulse" />
                <div className="h-5 w-12 bg-surface-2 rounded-full animate-pulse" />
              </div>
              <div className="h-4 w-24 bg-surface-2 rounded animate-pulse" />
              <div className="h-4 w-full bg-surface-2 rounded animate-pulse" />
              <div className="h-4 w-3/4 bg-surface-2 rounded animate-pulse" />
              <div className="flex gap-2 pt-2">
                <div className="h-6 w-16 bg-surface-2 rounded-full animate-pulse" />
                <div className="h-6 w-20 bg-surface-2 rounded-full animate-pulse" />
                <div className="h-6 w-14 bg-surface-2 rounded-full animate-pulse" />
              </div>
            </div>
            <div className="flex items-center justify-center gap-6 p-6 pt-0">
              <div className="w-16 h-16 rounded-full bg-surface-2 animate-pulse" />
              <div className="w-20 h-20 rounded-full bg-surface-2 animate-pulse" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  const current = profiles[currentIndex];
  const done = currentIndex >= profiles.length;
  const swipeRotation = dragX * 0.1;
  const swipeOpacity = Math.max(0.4, 1 - Math.abs(dragX) / 400);

  return (
    <div className="min-h-screen px-4 py-12">
      <div className="max-w-lg mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm text-muted hover:text-foreground transition"
          >
            <ArrowLeft className="w-4 h-4" />
            Accueil
          </Link>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Heart className="w-5 h-5 text-pink-600" />
            Découverte
          </h1>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowRadar(!showRadar)}
              className={`p-1.5 rounded-lg transition ${showRadar ? "bg-green-600 text-white" : "text-muted hover:text-foreground"}`}
              title="Radar"
            >
              <RadarIcon className="w-5 h-5" />
            </button>
            <button
              onClick={toggleWhoLiked}
              className={`p-1.5 rounded-lg transition relative ${whoLikedTab ? "bg-pink-600 text-white" : "text-muted hover:text-foreground"}`}
              title="Qui m'a liké"
            >
              <Crown className="w-5 h-5" />
              {whoLikedData && whoLikedData.count > 0 && !whoLikedTab && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                  {whoLikedData.count > 9 ? "9+" : whoLikedData.count}
                </span>
              )}
            </button>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`p-1.5 rounded-lg transition ${showFilters ? "bg-violet-600 text-white" : "text-muted hover:text-foreground"}`}
              title="Filtres"
            >
              <SlidersHorizontal className="w-5 h-5" />
            </button>
            <button
              onClick={loadProfiles}
              className="text-muted hover:text-foreground transition"
              title="Rafraîchir"
            >
              <RefreshCw className="w-5 h-5" />
            </button>
          </div>
        </div>
        {recycledMode && !done && (
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-amber-300 bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700">
            <RefreshCw className="h-3.5 w-3.5" />
            Profils déjà vus
          </div>
        )}

        {/* Filters panel */}
        {whoLikedTab && (
          <div className="mb-6 bg-surface/80 border border-border rounded-2xl p-5 animate-in slide-in-from-top-2">
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <Crown className="w-4 h-4 text-yellow-400" />
              Qui m&apos;a liké
            </h3>
            {whoLikedLoading && (
              <p className="text-muted text-sm">Chargement...</p>
            )}
            {whoLikedData && whoLikedData.upgrade && (
              <div className="text-center py-4">
                <p className="text-muted text-sm mb-3">
                  {whoLikedData.count} personne(s) vous ont liké
                </p>
                <div className="flex gap-2 justify-center mb-4">
                  {whoLikedData.profiles.slice(0, 5).map((_, i) => (
                    <div
                      key={i}
                      className="w-12 h-12 rounded-full bg-gray-700 blur-sm"
                    />
                  ))}
                </div>
                <Link
                  href="/premium"
                  className="inline-flex items-center gap-2 bg-linear-to-r from-yellow-500 to-orange-500 text-white text-sm font-semibold px-4 py-2 rounded-full hover:opacity-90 transition"
                >
                  <Star className="w-4 h-4" /> Passer Premium pour voir
                </Link>
              </div>
            )}
            {whoLikedData && !whoLikedData.upgrade && (
              <div className="space-y-2">
                {whoLikedData.profiles.length === 0 && (
                  <p className="text-muted text-sm">
                    Personne encore - continuez à swiper !
                  </p>
                )}
                {whoLikedData.profiles.map((p, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-3 p-2 rounded-xl hover:bg-surface-2 transition cursor-pointer"
                    onClick={() => {
                      /* open profile */
                    }}
                  >
                    {p.avatar_url ? (
                      <Image
                        src={p.avatar_url as string}
                        alt={p.username as string}
                        width={40}
                        height={40}
                        className="w-10 h-10 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-violet-600 flex items-center justify-center text-white font-bold">
                        {(p.username as string)?.[0]?.toUpperCase()}
                      </div>
                    )}
                    <div>
                      <p className="text-sm font-medium">
                        {p.username as string}
                      </p>
                      <p className="text-xs text-muted">
                        {p.city as string} {p.type === "superlike" && ""}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Filters panel */}
        {showFilters && (
          <div className="mb-6 bg-surface/80 border border-border rounded-2xl p-5 space-y-5 animate-in slide-in-from-top-2">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <SlidersHorizontal className="w-4 h-4" />
              Préférences de découverte
            </h3>

            {/* Gender */}
            <div>
              <label className="text-xs text-muted mb-2 block">Genre</label>
              <div className="flex gap-2">
                {[
                  { value: "", label: "Tous" },
                  { value: "homme", label: "Homme" },
                  { value: "femme", label: "Femme" },
                  { value: "non-binaire", label: "Non-binaire" },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() =>
                      savePreferences({ ...prefs, gender: opt.value })
                    }
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                      prefs.gender === opt.value
                        ? "bg-violet-600 text-white"
                        : "bg-surface-2 text-muted hover:bg-gray-100"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Age range */}
            <div>
              <label className="text-xs text-muted mb-2 block">
                Âge : {prefs.min_age} - {prefs.max_age} ans
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min={18}
                  max={prefs.max_age}
                  value={prefs.min_age}
                  onChange={(e) =>
                    setPrefs((p) => ({
                      ...p,
                      min_age: parseInt(e.target.value),
                    }))
                  }
                  onMouseUp={() => savePreferences(prefs)}
                  onTouchEnd={() => savePreferences(prefs)}
                  className="flex-1 accent-violet-500"
                  title="Âge minimum"
                />
                <input
                  type="range"
                  min={prefs.min_age}
                  max={99}
                  value={prefs.max_age}
                  onChange={(e) =>
                    setPrefs((p) => ({
                      ...p,
                      max_age: parseInt(e.target.value),
                    }))
                  }
                  onMouseUp={() => savePreferences(prefs)}
                  onTouchEnd={() => savePreferences(prefs)}
                  className="flex-1 accent-pink-500"
                  title="Âge maximum"
                />
              </div>
            </div>

            {/* Distance */}
            <div>
              <label className="text-xs text-muted mb-2 block">
                Distance max : {prefs.max_distance} km
              </label>
              <input
                type="range"
                min={1}
                max={200}
                value={prefs.max_distance}
                onChange={(e) =>
                  setPrefs((p) => ({
                    ...p,
                    max_distance: parseInt(e.target.value),
                  }))
                }
                onMouseUp={() => savePreferences(prefs)}
                onTouchEnd={() => savePreferences(prefs)}
                className="w-full accent-violet-500"
                title="Distance maximale"
              />
            </div>

            <button
              onClick={() => {
                setShowFilters(false);
                loadProfiles();
              }}
              className="w-full bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold py-2.5 rounded-lg transition"
            >
              Appliquer et recharger
            </button>
          </div>
        )}

        {/* Radar */}
        {showRadar && <Radar className="mb-6 animate-in slide-in-from-top-2" />}

        {/* Search bar */}
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Rechercher par pseudo ou ville..."
            title="Rechercher des profils"
            className="w-full bg-white/90 border border-border rounded-xl pl-10 pr-4 py-2.5 text-sm text-foreground placeholder:text-gray-400 focus:outline-none focus:border-violet-400 transition"
          />
        </div>

        {/* Search results */}
        {searchQuery.trim().length >= 2 && (
          <div className="mb-6 space-y-2">
            {searching ? (
              <p className="text-sm text-muted text-center animate-pulse">
                Recherche...
              </p>
            ) : searchResults.length === 0 ? (
              <p className="text-sm text-muted text-center">Aucun résultat</p>
            ) : (
              searchResults.map((p) => (
                <a
                  key={p.id}
                  href={`/users/${p.id}`}
                  className="flex items-center gap-3 bg-white/90 border border-border hover:border-violet-400/30 rounded-xl p-3 transition"
                >
                  <div className="relative shrink-0">
                    <div className="w-10 h-10 rounded-full bg-surface-2 flex items-center justify-center overflow-hidden">
                      {p.avatar_url ? (
                        <Image
                          src={p.avatar_url}
                          alt={p.username}
                          width={40}
                          height={40}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <User className="w-5 h-5 text-muted" />
                      )}
                    </div>
                    {p.is_online && (
                      <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-white" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="font-semibold text-sm">{p.username}</span>
                    {p.city && (
                      <p className="text-xs text-muted flex items-center gap-1">
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
          <div className="fixed inset-0 z-50 bg-white/90 flex items-center justify-center px-4">
            <div className="bg-surface border border-violet-500/50 rounded-2xl p-8 text-center max-w-sm w-full animate-in zoom-in-95">
              <div className="flex items-center justify-center gap-4 mb-4">
                <div className="w-16 h-16 rounded-full bg-surface-2 border-2 border-violet-500 flex items-center justify-center overflow-hidden">
                  <User className="w-8 h-8 text-violet-600" />
                </div>
                <Heart className="w-8 h-8 text-pink-600 animate-pulse" />
                <div className="w-16 h-16 rounded-full bg-surface-2 border-2 border-pink-500 flex items-center justify-center overflow-hidden">
                  {matched.avatar_url ? (
                    <Image
                      src={matched.avatar_url}
                      alt={matched.username}
                      width={64}
                      height={64}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <User className="w-8 h-8 text-pink-500" />
                  )}
                </div>
              </div>
              <h2 className="text-2xl font-bold bg-linear-to-r from-violet-400 to-pink-500 bg-clip-text text-transparent mb-2">
                Match !
              </h2>
              <p className="text-muted text-sm mb-6">
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
                  onClick={closeMatch}
                  className="px-4 text-muted hover:text-foreground transition text-sm"
                >
                  Plus tard
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Profile Card */}
        {done ? (
          <div className="bg-white/90 border border-border rounded-2xl p-12 text-center">
            <User className="w-16 h-16 text-muted/60 mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">Plus de profils</h2>
            <p className="text-muted text-sm mb-6">
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
          <>
            {/* Swipe hint indicators */}
            <div className="relative">
              {dragX !== 0 && (
                <>
                  {dragX > 30 && (
                    <div
                      className="absolute top-6 left-6 z-30 bg-green-500/90 text-white px-4 py-1.5 rounded-full text-sm font-bold rotate-[-15deg] transition-opacity"
                      style={{ opacity: Math.min(1, dragX / 100) }}
                    >
                      LIKE
                    </div>
                  )}
                  {dragX < -30 && (
                    <div
                      className="absolute top-6 right-6 z-30 bg-red-500/90 text-white px-4 py-1.5 rounded-full text-sm font-bold rotate-15 transition-opacity"
                      style={{ opacity: Math.min(1, Math.abs(dragX) / 100) }}
                    >
                      PASS ✕
                    </div>
                  )}
                </>
              )}

              <div
                ref={cardRef}
                className={`bg-white/90 border border-border rounded-2xl overflow-hidden transition-all select-none touch-none ${
                  action === "like"
                    ? "border-pink-300 translate-x-[120%] rotate-12 opacity-0 duration-500"
                    : action === "pass"
                      ? "border-border -translate-x-[120%] -rotate-12 opacity-0 duration-500"
                      : dragging
                        ? "duration-0"
                        : "duration-300"
                }`}
                style={
                  !action
                    ? {
                        transform: `translateX(${dragX}px) rotate(${swipeRotation}deg)`,
                        opacity: swipeOpacity,
                      }
                    : undefined
                }
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                onPointerCancel={onPointerUp}
              >
                {/* Photo carousel */}
                <div className="relative h-80 bg-surface-2 flex items-center justify-center">
                  {(() => {
                    const allImages = [
                      ...(current.avatar_url ? [current.avatar_url] : []),
                      ...(current.photos?.map((p) => p.url) ?? []),
                    ];
                    const img = allImages[photoIndex] || null;
                    return (
                      <>
                        {img ? (
                          <Image
                            src={img}
                            alt={current.username}
                            width={1200}
                            height={600}
                            className="w-full h-full object-cover pointer-events-none"
                            draggable={false}
                          />
                        ) : (
                          <User className="w-24 h-24 text-muted/60" />
                        )}
                        {allImages.length > 1 && (
                          <>
                            <div className="absolute top-3 left-1/2 -translate-x-1/2 flex gap-1">
                              {allImages.map((_, i) => (
                                <div
                                  key={i}
                                  className={`h-1 rounded-full transition-all ${
                                    i === photoIndex
                                      ? "w-6 bg-white"
                                      : "w-3 bg-white/40"
                                  }`}
                                />
                              ))}
                            </div>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setPhotoIndex((i) =>
                                  i > 0 ? i - 1 : allImages.length - 1,
                                );
                              }}
                              className="absolute left-0 top-0 bottom-0 w-1/3 cursor-pointer z-10"
                              aria-label="Photo précédente"
                            />
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setPhotoIndex((i) =>
                                  i < allImages.length - 1 ? i + 1 : 0,
                                );
                              }}
                              className="absolute right-0 top-0 bottom-0 w-1/3 cursor-pointer z-10"
                              aria-label="Photo suivante"
                            />
                          </>
                        )}
                      </>
                    );
                  })()}
                  {current.is_online && (
                    <span className="absolute top-4 right-4 w-3 h-3 bg-green-500 rounded-full border-2 border-white" />
                  )}
                  {current.is_verified && (
                    <span className="absolute top-4 left-4 text-xs bg-green-50 text-green-600 border border-green-500/20 px-2 py-0.5 rounded-full">
                      Vérifié
                    </span>
                  )}
                </div>

                {/* Info */}
                <div className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <h2 className="text-xl font-bold">{current.username}</h2>
                      {current.age > 0 && (
                        <span className="text-lg text-muted">
                          {current.age}
                        </span>
                      )}
                    </div>
                    <div className="relative">
                      <button
                        onClick={() => setShowMenu(!showMenu)}
                        className="text-muted hover:text-foreground transition p-1"
                        title="Options"
                      >
                        <Flag className="w-4 h-4" />
                      </button>
                      {showMenu && (
                        <div className="absolute right-0 top-8 z-20 bg-surface-2 border border-border rounded-lg shadow-xl w-52 py-1">
                          <button
                            onClick={handleBlock}
                            className="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-gray-100 transition flex items-center gap-2"
                          >
                            <Ban className="w-4 h-4" /> Bloquer
                          </button>
                          <div className="border-t border-border my-1" />
                          <p className="px-4 py-1 text-xs text-muted">
                            Signaler :
                          </p>
                          {["spam", "fake", "harassment", "inappropriate"].map(
                            (r) => (
                              <button
                                key={r}
                                onClick={() => handleReport(r)}
                                className="w-full text-left px-4 py-1.5 text-sm text-foreground hover:bg-gray-100 transition capitalize"
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

                  {/* City + Distance */}
                  <div className="flex items-center gap-3 mt-1">
                    {current.city && (
                      <p className="text-muted text-sm flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5" />
                        {current.city}
                      </p>
                    )}
                    {current.distance >= 0 && (
                      <p className="text-muted text-sm flex items-center gap-1">
                        <Navigation className="w-3 h-3" />
                        {current.distance < 1
                          ? "< 1 km"
                          : `${current.distance} km`}
                      </p>
                    )}
                  </div>

                  {current.gender && (
                    <p className="text-muted text-xs capitalize mt-1">
                      {current.gender}
                    </p>
                  )}
                  {current.bio && (
                    <p className="text-foreground text-sm mt-3 leading-relaxed">
                      {current.bio}
                    </p>
                  )}

                  {/* Interests / Tags */}
                  {(() => {
                    const tags = parseInterests(current.interests);
                    if (tags.length === 0) return null;
                    return (
                      <div className="flex flex-wrap gap-1.5 mt-3">
                        {tags.map((tag) => (
                          <span
                            key={tag}
                            className="inline-flex items-center gap-1 text-xs bg-violet-50 text-violet-600 border border-violet-200 px-2.5 py-1 rounded-full"
                          >
                            <Sparkles className="w-3 h-3" />
                            {tag}
                          </span>
                        ))}
                      </div>
                    );
                  })()}
                </div>

                {/* Actions */}
                <div className="flex items-center justify-center gap-4 p-6 pt-0">
                  {/* Rewind (Premium) */}
                  <button
                    onClick={handleRewind}
                    className="w-10 h-10 rounded-full border border-orange-700/40 hover:border-orange-500 flex items-center justify-center transition"
                    title="Rewind (Premium)"
                  >
                    <Undo2 className="w-4 h-4 text-orange-400" />
                  </button>
                  <button
                    onClick={handlePass}
                    className="w-16 h-16 rounded-full border-2 border-border hover:border-gray-300 flex items-center justify-center transition active:scale-90"
                    title="Passer (←)"
                  >
                    <X className="w-7 h-7 text-muted" />
                  </button>
                  {/* Super Like */}
                  <button
                    onClick={handleSuperLike}
                    className="w-12 h-12 rounded-full bg-yellow-400/10 border-2 border-yellow-500/50 hover:bg-yellow-400/20 flex items-center justify-center transition active:scale-90"
                    title="Super Like "
                  >
                    <Star className="w-6 h-6 text-yellow-400" />
                  </button>
                  <button
                    onClick={handleLike}
                    className="w-20 h-20 rounded-full bg-linear-to-br from-violet-600 to-pink-600 hover:from-violet-700 hover:to-pink-700 flex items-center justify-center transition shadow-lg shadow-violet-200 active:scale-90"
                    title="J'aime (→)"
                  >
                    <Heart className="w-9 h-9 text-white" />
                  </button>
                </div>
              </div>
            </div>

            {/* Keyboard hint */}
            <p className="text-center text-muted/60 text-xs mt-4">
              ← Passer · → J&apos;aime · Ctrl+Z Annuler · Glisser pour swiper
            </p>
          </>
        )}
      </div>
    </div>
  );
}
