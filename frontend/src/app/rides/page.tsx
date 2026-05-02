"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Car,
  MapPin,
  Navigation,
  Clock,
  Loader2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
} from "lucide-react";
import { requestVTCRide, getMyVTCRides } from "@/lib/api";

interface VTCRide {
  id: number;
  status: string;
  pickup_address: string;
  dropoff_address: string;
  pickup_lat: number;
  pickup_lng: number;
  dropoff_lat: number;
  dropoff_lng: number;
  note?: string;
  created_at: string;
  driver?: { id: number; username: string; avatar_url?: string };
  estimated_price?: number;
}

const statusLabels: Record<
  string,
  { label: string; color: string; icon: typeof Clock }
> = {
  requested: {
    label: "En attente",
    color: "text-amber-600 bg-amber-50",
    icon: Clock,
  },
  accepted: {
    label: "Acceptée",
    color: "text-blue-600 bg-blue-50",
    icon: CheckCircle2,
  },
  in_progress: {
    label: "En cours",
    color: "text-violet-600 bg-violet-50",
    icon: Navigation,
  },
  completed: {
    label: "Terminée",
    color: "text-green-600 bg-green-50",
    icon: CheckCircle2,
  },
  canceled: {
    label: "Annulée",
    color: "text-red-600 bg-red-50",
    icon: XCircle,
  },
};

export default function RidesPage() {
  const [rides, setRides] = useState<VTCRide[]>([]);
  const [loading, setLoading] = useState(true);
  const [requesting, setRequesting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [position, setPosition] = useState<{ lat: number; lng: number } | null>(
    null,
  );

  const [form, setForm] = useState({
    pickup_address: "",
    dropoff_address: "",
    dropoff_lat: "",
    dropoff_lng: "",
    note: "",
  });

  const loadRides = useCallback(async () => {
    try {
      const data = await getMyVTCRides();
      setRides(data as unknown as VTCRide[]);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, []);

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
    loadRides();
  }, [loadRides]);

  const handleRequest = async () => {
    if (!position) return;
    setRequesting(true);
    try {
      await requestVTCRide({
        passenger_id: 0, // server uses JWT userID
        pickup_lat: position.lat,
        pickup_lng: position.lng,
        pickup_address: form.pickup_address || "Ma position",
        dropoff_lat: parseFloat(form.dropoff_lat) || 0,
        dropoff_lng: parseFloat(form.dropoff_lng) || 0,
        dropoff_address: form.dropoff_address,
        note: form.note || undefined,
      });
      setForm({
        pickup_address: "",
        dropoff_address: "",
        dropoff_lat: "",
        dropoff_lng: "",
        note: "",
      });
      setShowForm(false);
      await loadRides();
    } catch {
      /* ignore */
    } finally {
      setRequesting(false);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="bg-surface/80 backdrop-blur-md border-b border-border px-4 py-4 sticky top-0 z-20">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="text-muted hover:text-foreground transition"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <h1 className="text-lg font-bold flex items-center gap-2">
              <Car className="w-5 h-5 text-violet-600" />
              VTC &amp; Courses
            </h1>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="px-4 py-2 rounded-xl bg-violet-600 text-white text-sm font-medium hover:bg-violet-700 transition"
          >
            {showForm ? "Fermer" : "Réserver"}
          </button>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* New ride form */}
        {showForm && (
          <div className="bg-surface rounded-2xl p-5 border border-border space-y-4 animate-in fade-in slide-in-from-top-2">
            <h2 className="font-semibold text-foreground flex items-center gap-2">
              <Navigation className="w-4 h-4 text-pink-500" />
              Nouvelle course
            </h2>

            {position && (
              <div className="text-xs flex items-center gap-1 bg-green-50 text-green-700 px-3 py-1.5 rounded-lg">
                <MapPin className="w-3 h-3" />
                Position GPS détectée
              </div>
            )}

            <label className="block">
              <span className="text-sm text-muted">Adresse de départ</span>
              <input
                type="text"
                value={form.pickup_address}
                onChange={(e) =>
                  setForm({ ...form, pickup_address: e.target.value })
                }
                placeholder="Ma position actuelle"
                className="mt-1 w-full px-3 py-2 bg-white border border-border rounded-xl text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-violet-500/50"
              />
            </label>

            <label className="block">
              <span className="text-sm text-muted">
                Adresse de destination *
              </span>
              <input
                type="text"
                value={form.dropoff_address}
                onChange={(e) =>
                  setForm({ ...form, dropoff_address: e.target.value })
                }
                placeholder="Ex: Aéroport, centre-ville…"
                className="mt-1 w-full px-3 py-2 bg-white border border-border rounded-xl text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-violet-500/50"
              />
            </label>

            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="text-sm text-muted">Latitude dest.</span>
                <input
                  type="number"
                  step="any"
                  value={form.dropoff_lat}
                  onChange={(e) =>
                    setForm({ ...form, dropoff_lat: e.target.value })
                  }
                  placeholder="5.3364"
                  className="mt-1 w-full px-3 py-2 bg-white border border-border rounded-xl text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-violet-500/50"
                />
              </label>
              <label className="block">
                <span className="text-sm text-muted">Longitude dest.</span>
                <input
                  type="number"
                  step="any"
                  value={form.dropoff_lng}
                  onChange={(e) =>
                    setForm({ ...form, dropoff_lng: e.target.value })
                  }
                  placeholder="-4.0267"
                  className="mt-1 w-full px-3 py-2 bg-white border border-border rounded-xl text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-violet-500/50"
                />
              </label>
            </div>

            <label className="block">
              <span className="text-sm text-muted">Note (optionnel)</span>
              <input
                type="text"
                value={form.note}
                onChange={(e) => setForm({ ...form, note: e.target.value })}
                placeholder="Ex: 2 bagages"
                className="mt-1 w-full px-3 py-2 bg-white border border-border rounded-xl text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-violet-500/50"
              />
            </label>

            <button
              onClick={handleRequest}
              disabled={!position || !form.dropoff_address || requesting}
              className="w-full py-2.5 rounded-xl bg-violet-600 text-white font-medium text-sm disabled:opacity-50 hover:bg-violet-700 transition flex items-center justify-center gap-2"
            >
              {requesting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Car className="w-4 h-4" />
              )}
              Demander une course
            </button>
          </div>
        )}

        {/* Rides list */}
        <section className="space-y-3">
          <h2 className="font-semibold text-foreground">Mes courses</h2>

          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted" />
            </div>
          ) : rides.length === 0 ? (
            <div className="text-center py-12 space-y-3">
              <Car className="w-12 h-12 text-muted mx-auto" />
              <p className="text-muted text-sm">Aucune course pour le moment</p>
              <button
                onClick={() => setShowForm(true)}
                className="text-sm text-violet-600 font-medium hover:underline"
              >
                Réserver ma première course
              </button>
            </div>
          ) : (
            rides.map((ride) => {
              const st = statusLabels[ride.status] || {
                label: ride.status,
                color: "text-gray-600 bg-gray-50",
                icon: AlertTriangle,
              };
              const Icon = st.icon;
              return (
                <div
                  key={ride.id}
                  className="bg-surface rounded-xl p-4 border border-border space-y-3"
                >
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-foreground">
                        {ride.pickup_address}
                      </p>
                      <p className="text-xs text-muted">
                        → {ride.dropoff_address}
                      </p>
                    </div>
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${st.color}`}
                    >
                      <Icon className="w-3 h-3" />
                      {st.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {new Date(ride.created_at).toLocaleDateString("fr-FR", {
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                    {ride.driver && (
                      <span className="flex items-center gap-1">
                        <Car className="w-3 h-3" />
                        {ride.driver.username}
                      </span>
                    )}
                  </div>
                  {ride.note && (
                    <p className="text-xs text-muted bg-white px-3 py-1.5 rounded-lg">
                      {ride.note}
                    </p>
                  )}
                </div>
              );
            })
          )}
        </section>
      </main>
    </div>
  );
}
