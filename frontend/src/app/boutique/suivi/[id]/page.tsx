"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  MapPin,
  Package,
  Truck,
  CheckCircle2,
  Clock,
  User,
} from "lucide-react";
import {
  getDeliveryByOrder,
  DeliveryTracking,
  DeliveryStatus,
} from "@/lib/api";

/* ---- Étapes de livraison ---- */
const STEPS: { status: DeliveryStatus; label: string; icon: typeof Clock }[] = [
  { status: "pending", label: "En attente d'un livreur", icon: Clock },
  { status: "accepted", label: "Livreur assigné", icon: User },
  { status: "picking_up", label: "En route vers le vendeur", icon: Truck },
  { status: "picked_up", label: "Colis récupéré", icon: Package },
  { status: "delivering", label: "En route vers vous", icon: Truck },
  { status: "delivered", label: "Livré !", icon: CheckCircle2 },
];

const STATUS_ORDER: DeliveryStatus[] = [
  "pending",
  "accepted",
  "picking_up",
  "picked_up",
  "delivering",
  "delivered",
];

function stepIndex(s: DeliveryStatus) {
  return STATUS_ORDER.indexOf(s);
}

/* ---- Composant carte simple (OpenStreetMap via iframe) ---- */
function DeliveryMap({
  driverLat,
  driverLng,
  dropoffLat,
  dropoffLng,
}: {
  driverLat: number;
  driverLng: number;
  dropoffLat: number;
  dropoffLng: number;
}) {
  const hasDriver = driverLat !== 0 && driverLng !== 0;
  const hasDropoff = dropoffLat !== 0 && dropoffLng !== 0;

  if (!hasDriver && !hasDropoff) {
    return (
      <div className="h-64 rounded-2xl bg-gray-100 flex items-center justify-center text-gray-400 text-sm">
        Position GPS non disponible
      </div>
    );
  }

  // Centrer sur le livreur ou le point de livraison
  const centerLat = hasDriver ? driverLat : dropoffLat;
  const centerLng = hasDriver ? driverLng : dropoffLng;

  const src = `https://www.openstreetmap.org/export/embed.html?bbox=${centerLng - 0.02},${centerLat - 0.02},${centerLng + 0.02},${centerLat + 0.02}&layer=mapnik&marker=${centerLat},${centerLng}`;

  return (
    <div className="relative h-64 rounded-2xl overflow-hidden border border-gray-200">
      <iframe
        title="Carte de livraison"
        src={src}
        className="w-full h-full"
        loading="lazy"
      />
      <div className="absolute bottom-2 left-2 right-2 flex gap-2">
        {hasDriver && (
          <span className="bg-blue-600 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1">
            <Truck className="w-3 h-3" /> Livreur
          </span>
        )}
        {hasDropoff && (
          <span className="bg-green-600 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1">
            <MapPin className="w-3 h-3" /> Destination
          </span>
        )}
      </div>
    </div>
  );
}

/* ---- Page principale ---- */
export default function SuiviLivraisonPage() {
  const params = useParams<{ id: string }>();
  const orderId = parseInt(params.id, 10);

  const [delivery, setDelivery] = useState<DeliveryTracking | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const wsRef = useRef<WebSocket | null>(null);

  const load = useCallback(async () => {
    try {
      const d = await getDeliveryByOrder(orderId);
      setDelivery(d);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Erreur inconnue");
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  /* WebSocket : écouter les mises à jour en temps réel */
  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const token =
      typeof window !== "undefined" ? localStorage.getItem("token") : null;
    if (!token) return;

    const wsBase = (
      process.env.NEXT_PUBLIC_WS_URL ||
      (typeof window !== "undefined"
        ? window.location.origin.replace(/^http/, "ws")
        : "ws://localhost:8888")
    ).replace(/\/api.*$/, "");

    const ws = new WebSocket(`${wsBase}/ws?token=${token}`);
    wsRef.current = ws;

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);

        if (msg.type === "delivery_location_update" && delivery) {
          setDelivery((prev) =>
            prev
              ? {
                  ...prev,
                  delivery_person_lat: msg.data.latitude,
                  delivery_person_lng: msg.data.longitude,
                }
              : prev,
          );
        }

        if (msg.type === "delivery_status_changed" && delivery) {
          setDelivery((prev) =>
            prev ? { ...prev, status: msg.data.status } : prev,
          );
        }

        if (msg.type === "delivery_accepted") {
          load(); // recharger pour avoir les infos du livreur
        }
      } catch {}
    };

    return () => {
      ws.close();
    };
  }, [delivery, load]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !delivery) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 gap-4 px-4">
        <Package className="w-12 h-12 text-gray-300" />
        <p className="text-gray-500 text-center">
          {error || "Aucune livraison trouvée pour cette commande."}
        </p>
        <Link
          href="/boutique/orders"
          className="text-blue-600 hover:underline text-sm"
        >
          Retour aux commandes
        </Link>
      </div>
    );
  }

  const currentIndex = stepIndex(delivery.status);

  return (
    <div className="min-h-screen bg-gray-50 pb-10">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-lg mx-auto px-4 py-4 flex items-center gap-3">
          <Link
            href="/boutique/orders"
            className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </Link>
          <div>
            <h1 className="font-semibold text-gray-900">Suivi de livraison</h1>
            <p className="text-xs text-gray-400">Commande #{orderId}</p>
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 pt-6 space-y-6">
        {/* Carte */}
        {(delivery.status === "accepted" ||
          delivery.status === "picking_up" ||
          delivery.status === "picked_up" ||
          delivery.status === "delivering") && (
          <DeliveryMap
            driverLat={delivery.delivery_person_lat}
            driverLng={delivery.delivery_person_lng}
            dropoffLat={delivery.dropoff_lat}
            dropoffLng={delivery.dropoff_lng}
          />
        )}

        {/* Statut livreur */}
        {delivery.delivery_person && (
          <div className="bg-white rounded-2xl p-4 border border-gray-100 flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center overflow-hidden">
              {delivery.delivery_person.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={delivery.delivery_person.avatar_url}
                  alt=""
                  className="w-full h-full object-cover"
                />
              ) : (
                <User className="w-6 h-6 text-blue-500" />
              )}
            </div>
            <div>
              <p className="font-medium text-gray-900 text-sm">
                {delivery.delivery_person.username}
              </p>
              <p className="text-xs text-gray-400">Votre livreur</p>
            </div>
            <Truck className="w-5 h-5 text-blue-500 ml-auto" />
          </div>
        )}

        {/* Adresses */}
        <div className="bg-white rounded-2xl border border-gray-100 divide-y divide-gray-50">
          <div className="p-4 flex gap-3 items-start">
            <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center shrink-0">
              <Package className="w-4 h-4 text-orange-500" />
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-0.5">Enlèvement</p>
              <p className="text-sm font-medium text-gray-800">
                {delivery.pickup_address || "-"}
              </p>
            </div>
          </div>
          <div className="p-4 flex gap-3 items-start">
            <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center shrink-0">
              <MapPin className="w-4 h-4 text-green-500" />
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-0.5">Livraison</p>
              <p className="text-sm font-medium text-gray-800">
                {delivery.dropoff_address || "-"}
              </p>
            </div>
          </div>
        </div>

        {/* Étapes de progression */}
        <div className="bg-white rounded-2xl border border-gray-100 p-4">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">
            Progression
          </h2>
          <ol className="space-y-4">
            {STEPS.map((step, i) => {
              const done = i < currentIndex;
              const active = i === currentIndex;
              const Icon = step.icon;
              return (
                <li key={step.status} className="flex items-center gap-3">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-colors ${
                      done
                        ? "bg-blue-600"
                        : active
                          ? "bg-blue-100 ring-2 ring-blue-400"
                          : "bg-gray-100"
                    }`}
                  >
                    <Icon
                      className={`w-4 h-4 ${
                        done
                          ? "text-white"
                          : active
                            ? "text-blue-600"
                            : "text-gray-400"
                      }`}
                    />
                  </div>
                  <span
                    className={`text-sm ${
                      done
                        ? "text-gray-400 line-through"
                        : active
                          ? "text-gray-900 font-semibold"
                          : "text-gray-400"
                    }`}
                  >
                    {step.label}
                  </span>
                  {active && (
                    <span className="ml-auto inline-flex items-center gap-1 text-xs text-blue-600 font-medium">
                      <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                      En cours
                    </span>
                  )}
                </li>
              );
            })}
          </ol>
        </div>

        {delivery.status === "delivered" && (
          <div className="bg-green-50 border border-green-200 rounded-2xl p-4 flex items-center gap-3">
            <CheckCircle2 className="w-8 h-8 text-green-500 shrink-0" />
            <div>
              <p className="font-semibold text-green-800">
                Livraison effectuée !
              </p>
              <p className="text-sm text-green-600">
                Votre colis a bien été livré.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
