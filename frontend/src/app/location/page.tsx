"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  MapPin,
  Navigation,
  StopCircle,
  Clock,
  Users,
  Loader2,
  Radio,
} from "lucide-react";
import {
  startLocationShare,
  stopLocationShare,
  getActiveLocationShares,
  updateLocationShare,
} from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

interface LocationShare {
  id: number;
  sender_id: number;
  receiver_id: number;
  latitude: number;
  longitude: number;
  is_active: boolean;
  expires_at: string;
  sender?: { id: number; username: string; avatar_url?: string };
  receiver?: { id: number; username: string; avatar_url?: string };
}

export default function LocationPage() {
  const { user } = useAuth();
  const [shares, setShares] = useState<LocationShare[]>([]);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [receiverId, setReceiverId] = useState("");
  const [duration, setDuration] = useState(30);
  const [position, setPosition] = useState<{ lat: number; lng: number } | null>(
    null,
  );
  const watchRef = useRef<number | null>(null);

  const loadShares = useCallback(async () => {
    try {
      const data = await getActiveLocationShares();
      setShares(Array.isArray(data) ? data : []);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, []);

  // Get user position
  useEffect(() => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) =>
          setPosition({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => {},
        { enableHighAccuracy: true, timeout: 10000 },
      );
    }
  }, []);

  useEffect(() => {
    loadShares();
  }, [loadShares]);

  // Auto-update active shares with real position
  useEffect(() => {
    const myActiveShares = shares.filter(
      (s) => s.sender_id === user?.id && s.is_active,
    );
    if (myActiveShares.length === 0) {
      if (watchRef.current !== null) {
        navigator.geolocation.clearWatch(watchRef.current);
        watchRef.current = null;
      }
      return;
    }

    if (watchRef.current !== null) return; // Already watching

    watchRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setPosition({ lat: latitude, lng: longitude });
        myActiveShares.forEach((s) => {
          updateLocationShare(s.id, { latitude, longitude }).catch(() => {});
        });
      },
      () => {},
      { enableHighAccuracy: true },
    );

    return () => {
      if (watchRef.current !== null) {
        navigator.geolocation.clearWatch(watchRef.current);
        watchRef.current = null;
      }
    };
  }, [shares, user?.id]);

  const handleStart = async () => {
    if (!position || !receiverId) return;
    setStarting(true);
    try {
      await startLocationShare({
        receiver_id: parseInt(receiverId, 10),
        latitude: position.lat,
        longitude: position.lng,
        duration,
      });
      setReceiverId("");
      await loadShares();
    } catch {
      /* ignore */
    } finally {
      setStarting(false);
    }
  };

  const handleStop = async (shareId: number) => {
    try {
      await stopLocationShare(shareId);
      await loadShares();
    } catch {
      /* ignore */
    }
  };

  const myShares = shares.filter((s) => s.sender_id === user?.id);
  const sharedWithMe = shares.filter((s) => s.receiver_id === user?.id);

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="bg-surface/80 backdrop-blur-md border-b border-border px-4 py-4 sticky top-0 z-20">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <Link
            href="/"
            className="text-muted hover:text-foreground transition"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-lg font-bold flex items-center gap-2">
            <Navigation className="w-5 h-5 text-violet-600" />
            Partage de position
          </h1>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Current position */}
        <div className="bg-surface rounded-2xl p-4 border border-border">
          <div className="flex items-center gap-2 text-sm text-muted mb-2">
            <MapPin className="w-4 h-4" />
            Votre position
          </div>
          {position ? (
            <p className="text-sm font-mono text-foreground">
              {position.lat.toFixed(6)}, {position.lng.toFixed(6)}
            </p>
          ) : (
            <p className="text-sm text-muted">Localisation en cours…</p>
          )}
        </div>

        {/* Start new share */}
        <div className="bg-surface rounded-2xl p-5 border border-border space-y-4">
          <h2 className="font-semibold text-foreground flex items-center gap-2">
            <Radio className="w-4 h-4 text-pink-500" />
            Démarrer un partage
          </h2>
          <div className="space-y-3">
            <label className="block">
              <span className="text-sm text-muted">ID du destinataire</span>
              <input
                type="number"
                value={receiverId}
                onChange={(e) => setReceiverId(e.target.value)}
                placeholder="Ex: 42"
                className="mt-1 w-full px-3 py-2 bg-white border border-border rounded-xl text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-violet-500/50"
              />
            </label>
            <label className="block">
              <span className="text-sm text-muted">Durée (minutes)</span>
              <select
                value={duration}
                onChange={(e) => setDuration(parseInt(e.target.value))}
                className="mt-1 w-full px-3 py-2 bg-white border border-border rounded-xl text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-violet-500/50"
              >
                <option value={15}>15 min</option>
                <option value={30}>30 min</option>
                <option value={60}>1 heure</option>
                <option value={120}>2 heures</option>
                <option value={480}>8 heures</option>
              </select>
            </label>
            <button
              onClick={handleStart}
              disabled={!position || !receiverId || starting}
              className="w-full py-2.5 rounded-xl bg-violet-600 text-white font-medium text-sm disabled:opacity-50 hover:bg-violet-700 transition flex items-center justify-center gap-2"
            >
              {starting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Navigation className="w-4 h-4" />
              )}
              Partager ma position
            </button>
          </div>
        </div>

        {/* My active shares */}
        <section className="space-y-3">
          <h2 className="font-semibold text-foreground flex items-center gap-2">
            <Users className="w-4 h-4 text-violet-600" />
            Mes partages actifs ({myShares.length})
          </h2>
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted" />
            </div>
          ) : myShares.length === 0 ? (
            <p className="text-sm text-muted bg-surface rounded-xl p-4 text-center">
              Aucun partage actif
            </p>
          ) : (
            myShares.map((share) => (
              <div
                key={share.id}
                className="bg-surface rounded-xl p-4 border border-border flex items-center justify-between"
              >
                <div>
                  <p className="text-sm font-medium text-foreground">
                    Partagé avec{" "}
                    {share.receiver?.username || `#${share.receiver_id}`}
                  </p>
                  <p className="text-xs text-muted flex items-center gap-1 mt-1">
                    <Clock className="w-3 h-3" />
                    Expire :{" "}
                    {new Date(share.expires_at).toLocaleTimeString("fr-FR")}
                  </p>
                </div>
                <button
                  onClick={() => handleStop(share.id)}
                  className="px-3 py-1.5 rounded-lg bg-red-500/10 text-red-600 text-xs font-medium hover:bg-red-500/20 transition flex items-center gap-1"
                >
                  <StopCircle className="w-3.5 h-3.5" />
                  Arrêter
                </button>
              </div>
            ))
          )}
        </section>

        {/* Shares with me */}
        <section className="space-y-3">
          <h2 className="font-semibold text-foreground flex items-center gap-2">
            <MapPin className="w-4 h-4 text-pink-500" />
            Partagés avec moi ({sharedWithMe.length})
          </h2>
          {sharedWithMe.length === 0 ? (
            <p className="text-sm text-muted bg-surface rounded-xl p-4 text-center">
              Personne ne partage sa position avec vous
            </p>
          ) : (
            sharedWithMe.map((share) => (
              <div
                key={share.id}
                className="bg-surface rounded-xl p-4 border border-border"
              >
                <p className="text-sm font-medium text-foreground">
                  {share.sender?.username || `Utilisateur #${share.sender_id}`}
                </p>
                <p className="text-xs text-muted mt-1 font-mono">
                  {share.latitude.toFixed(6)}, {share.longitude.toFixed(6)}
                </p>
                <p className="text-xs text-muted flex items-center gap-1 mt-1">
                  <Clock className="w-3 h-3" />
                  Expire :{" "}
                  {new Date(share.expires_at).toLocaleTimeString("fr-FR")}
                </p>
              </div>
            ))
          )}
        </section>
      </main>
    </div>
  );
}
