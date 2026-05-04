"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import {
  Truck,
  Package,
  MapPin,
  CheckCircle2,
  ChevronRight,
  RefreshCcw,
  ArrowLeft,
  Navigation,
} from "lucide-react";
import {
  getAvailableDeliveries,
  getMyDeliveries,
  acceptDelivery,
  updateDeliveryStatus,
  updateDeliveryLocation,
  DeliveryTracking,
  DeliveryStatus,
} from "@/lib/api";

/* ---- Labels des statuts ---- */
const STATUS_LABEL: Record<DeliveryStatus, string> = {
  pending: "En attente",
  accepted: "Acceptée",
  picking_up: "En route vers le vendeur",
  picked_up: "Colis récupéré",
  delivering: "En route vers le client",
  delivered: "Livré",
  canceled: "Annulée",
};

const STATUS_COLOR: Record<DeliveryStatus, string> = {
  pending: "bg-amber-50 text-amber-700",
  accepted: "bg-blue-50 text-blue-700",
  picking_up: "bg-violet-50 text-violet-700",
  picked_up: "bg-indigo-50 text-indigo-700",
  delivering: "bg-orange-50 text-orange-700",
  delivered: "bg-green-50 text-green-700",
  canceled: "bg-gray-100 text-gray-500",
};

/* Transitions autorisées (même ordre que le backend) */
const NEXT_STATUS: Partial<
  Record<DeliveryStatus, { status: DeliveryStatus; label: string }>
> = {
  accepted: { status: "picking_up", label: "Je pars récupérer le colis" },
  picking_up: { status: "picked_up", label: "Colis récupéré" },
  picked_up: { status: "delivering", label: "Je pars livrer le client" },
  delivering: { status: "delivered", label: "Livraison effectuée ✓" },
};

/* ---- Carte miniature ---- */
function MiniMap({ lat, lng }: { lat: number; lng: number }) {
  if (!lat || !lng) return null;
  const src = `https://www.openstreetmap.org/export/embed.html?bbox=${lng - 0.015},${lat - 0.015},${lng + 0.015},${lat + 0.015}&layer=mapnik&marker=${lat},${lng}`;
  return (
    <div className="h-40 rounded-xl overflow-hidden border border-gray-200 mt-2">
      <iframe
        title="carte"
        src={src}
        className="w-full h-full"
        loading="lazy"
      />
    </div>
  );
}

/* ---- Carte de mission disponible ---- */
function AvailableCard({
  d,
  onAccept,
}: {
  d: DeliveryTracking;
  onAccept: (id: number) => Promise<void>;
}) {
  const [loading, setLoading] = useState(false);

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-gray-400">
            Mission #{d.id}
          </span>
          <span
            className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLOR[d.status]}`}
          >
            {STATUS_LABEL[d.status]}
          </span>
        </div>

        <div className="space-y-2">
          <div className="flex gap-2 items-start">
            <Package className="w-4 h-4 text-orange-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs text-gray-400">Enlèvement</p>
              <p className="text-sm text-gray-800">{d.pickup_address || "–"}</p>
            </div>
          </div>
          <div className="flex gap-2 items-start">
            <MapPin className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs text-gray-400">Livraison</p>
              <p className="text-sm text-gray-800">
                {d.dropoff_address || "–"}
              </p>
            </div>
          </div>
          {d.note && (
            <p className="text-xs text-gray-500 italic bg-gray-50 px-3 py-2 rounded-xl">
              {d.note}
            </p>
          )}
        </div>
      </div>

      <div className="border-t border-gray-50 px-4 py-3">
        <button
          onClick={async () => {
            setLoading(true);
            try {
              await onAccept(d.id);
            } finally {
              setLoading(false);
            }
          }}
          disabled={loading}
          className="w-full bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium py-2.5 rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {loading ? (
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <>
              <Truck className="w-4 h-4" />
              Accepter la mission
            </>
          )}
        </button>
      </div>
    </div>
  );
}

/* ---- Carte de mission active ---- */
function ActiveCard({
  d,
  onStatusUpdate,
  isSendingLocation,
}: {
  d: DeliveryTracking;
  onStatusUpdate: (id: number, s: DeliveryStatus) => Promise<void>;
  isSendingLocation: boolean;
}) {
  const [loading, setLoading] = useState(false);
  const next = NEXT_STATUS[d.status];

  return (
    <div className="bg-white rounded-2xl border border-violet-100 shadow-sm overflow-hidden">
      <div className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-gray-400">
            Mission #{d.id} · Commande #{d.order_id}
          </span>
          <span
            className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLOR[d.status]}`}
          >
            {STATUS_LABEL[d.status]}
          </span>
        </div>

        <div className="space-y-2">
          <div className="flex gap-2 items-start">
            <Package className="w-4 h-4 text-orange-400 shrink-0 mt-0.5" />
            <p className="text-sm text-gray-800">{d.pickup_address || "–"}</p>
          </div>
          <div className="flex gap-2 items-start">
            <MapPin className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
            <p className="text-sm text-gray-800">{d.dropoff_address || "–"}</p>
          </div>
        </div>

        {/* Position en temps réel du livreur */}
        {(d.delivery_person_lat !== 0 || d.delivery_person_lng !== 0) && (
          <MiniMap lat={d.delivery_person_lat} lng={d.delivery_person_lng} />
        )}

        {isSendingLocation && (
          <div className="flex items-center gap-2 text-xs text-violet-600">
            <Navigation className="w-3 h-3 animate-pulse" />
            Partage GPS actif
          </div>
        )}
      </div>

      {next && (
        <div className="border-t border-gray-50 px-4 py-3">
          <button
            onClick={async () => {
              setLoading(true);
              try {
                await onStatusUpdate(d.id, next.status);
              } finally {
                setLoading(false);
              }
            }}
            disabled={loading}
            className="w-full bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium py-2.5 rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <ChevronRight className="w-4 h-4" />
                {next.label}
              </>
            )}
          </button>
        </div>
      )}

      {d.status === "delivered" && (
        <div className="border-t border-gray-50 px-4 py-3">
          <div className="flex items-center gap-2 text-green-600 text-sm font-medium">
            <CheckCircle2 className="w-4 h-4" />
            Mission terminée !
          </div>
        </div>
      )}
    </div>
  );
}

/* ---- Page principale ---- */
export default function LivreurDashboard() {
  const [tab, setTab] = useState<"available" | "mine">("available");
  const [available, setAvailable] = useState<DeliveryTracking[]>([]);
  const [mine, setMine] = useState<DeliveryTracking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const locationIntervalRef = useRef<ReturnType<typeof setInterval> | null>(
    null,
  );
  const [sendingLocationFor, setSendingLocationFor] = useState<number | null>(
    null,
  );

  /* Charger les données */
  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [avail, myList] = await Promise.all([
        getAvailableDeliveries(),
        getMyDeliveries(),
      ]);
      setAvailable(avail);
      setMine(myList);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Erreur de chargement");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  /* Démarrer/arrêter le partage GPS pour les missions actives */
  useEffect(() => {
    const activeDelivery = mine.find(
      (d) =>
        d.status !== "delivered" &&
        d.status !== "canceled" &&
        d.status !== "pending",
    );

    if (activeDelivery) {
      setSendingLocationFor(activeDelivery.id);

      if (!locationIntervalRef.current) {
        locationIntervalRef.current = setInterval(() => {
          if (!navigator.geolocation) return;
          navigator.geolocation.getCurrentPosition((pos) => {
            updateDeliveryLocation(
              activeDelivery.id,
              pos.coords.latitude,
              pos.coords.longitude,
            ).catch(() => {});
          });
        }, 5000); // toutes les 5 secondes
      }
    } else {
      setSendingLocationFor(null);
      if (locationIntervalRef.current) {
        clearInterval(locationIntervalRef.current);
        locationIntervalRef.current = null;
      }
    }

    return () => {
      if (locationIntervalRef.current) {
        clearInterval(locationIntervalRef.current);
        locationIntervalRef.current = null;
      }
    };
  }, [mine]);

  /* Accepter une mission */
  const handleAccept = async (deliveryId: number) => {
    await acceptDelivery(deliveryId);
    await loadData();
    setTab("mine");
  };

  /* Changer de statut */
  const handleStatusUpdate = async (
    deliveryId: number,
    status: DeliveryStatus,
  ) => {
    await updateDeliveryStatus(deliveryId, status);
    setMine((prev) =>
      prev.map((d) => (d.id === deliveryId ? { ...d, status } : d)),
    );
    if (status === "delivered") {
      await loadData();
    }
  };

  const activeMissions = mine.filter(
    (d) => d.status !== "delivered" && d.status !== "canceled",
  );
  const historyMissions = mine.filter(
    (d) => d.status === "delivered" || d.status === "canceled",
  );

  return (
    <div className="min-h-screen bg-gray-50 pb-10">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-lg mx-auto px-4 py-4 flex items-center gap-3">
          <Link
            href="/dashboard"
            className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </Link>
          <div className="flex-1">
            <h1 className="font-semibold text-gray-900">Espace livreur</h1>
            {sendingLocationFor && (
              <p className="text-xs text-violet-600 flex items-center gap-1">
                <Navigation className="w-3 h-3 animate-pulse" />
                GPS actif · Mission #{sendingLocationFor}
              </p>
            )}
          </div>
          <button
            onClick={loadData}
            aria-label="Actualiser"
            className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
          >
            <RefreshCcw className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Onglets */}
        <div className="max-w-lg mx-auto px-4 pb-3 flex gap-2">
          <button
            onClick={() => setTab("available")}
            className={`flex-1 py-2 rounded-xl text-sm font-medium transition-colors ${
              tab === "available"
                ? "bg-violet-600 text-white"
                : "bg-gray-100 text-gray-500 hover:bg-gray-200"
            }`}
          >
            Disponibles
            {available.length > 0 && (
              <span className="ml-1.5 inline-flex items-center justify-center w-4 h-4 rounded-full bg-white text-violet-600 text-xs font-bold">
                {available.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setTab("mine")}
            className={`flex-1 py-2 rounded-xl text-sm font-medium transition-colors ${
              tab === "mine"
                ? "bg-violet-600 text-white"
                : "bg-gray-100 text-gray-500 hover:bg-gray-200"
            }`}
          >
            Mes missions
            {activeMissions.length > 0 && (
              <span className="ml-1.5 inline-flex items-center justify-center w-4 h-4 rounded-full bg-white text-violet-600 text-xs font-bold">
                {activeMissions.length}
              </span>
            )}
          </button>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 pt-5 space-y-4">
        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-4 border-violet-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-red-700 text-sm">
            {error}
          </div>
        )}

        {!loading && tab === "available" && (
          <>
            {available.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3 text-gray-400">
                <Package className="w-12 h-12 text-gray-200" />
                <p className="text-sm">
                  Aucune mission disponible pour l&apos;instant
                </p>
              </div>
            ) : (
              available.map((d) => (
                <AvailableCard key={d.id} d={d} onAccept={handleAccept} />
              ))
            )}
          </>
        )}

        {!loading && tab === "mine" && (
          <>
            {activeMissions.length > 0 && (
              <div className="space-y-4">
                <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
                  Missions actives
                </h2>
                {activeMissions.map((d) => (
                  <ActiveCard
                    key={d.id}
                    d={d}
                    onStatusUpdate={handleStatusUpdate}
                    isSendingLocation={sendingLocationFor === d.id}
                  />
                ))}
              </div>
            )}

            {historyMissions.length > 0 && (
              <div className="space-y-3 mt-6">
                <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
                  Historique
                </h2>
                {historyMissions.map((d) => (
                  <div
                    key={d.id}
                    className="bg-white rounded-2xl border border-gray-100 p-4 flex items-center justify-between"
                  >
                    <div>
                      <p className="text-sm font-medium text-gray-700">
                        Mission #{d.id}
                      </p>
                      <p className="text-xs text-gray-400">
                        {d.dropoff_address}
                      </p>
                    </div>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLOR[d.status]}`}
                    >
                      {STATUS_LABEL[d.status]}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {activeMissions.length === 0 && historyMissions.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 gap-3 text-gray-400">
                <Truck className="w-12 h-12 text-gray-200" />
                <p className="text-sm">Aucune mission pour l&apos;instant</p>
                <button
                  onClick={() => setTab("available")}
                  className="text-violet-600 text-sm hover:underline"
                >
                  Voir les missions disponibles
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
