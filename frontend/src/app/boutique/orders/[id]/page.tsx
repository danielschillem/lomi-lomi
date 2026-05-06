"use client";

import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Image from "next/image";
import { getOrderTracking } from "@/lib/api";
import {
  CheckCircle,
  Circle,
  ArrowLeft,
  ShoppingBag,
  Package,
  MapPin,
  Phone,
  PartyPopper,
} from "lucide-react";
import Link from "next/link";

interface TrackingStep {
  step: string;
  label: string;
  done: boolean;
}

interface Order {
  id: number;
  created_at: string;
  total_amount: number;
  status: string;
  delivery_address?: {
    full_name: string;
    address: string;
    city: string;
    phone: string;
  };
  items?: {
    product_id: number;
    quantity: number;
    price: number;
    product?: { name: string; image_url?: string };
  }[];
}

const statusLabels: Record<string, { label: string; color: string }> = {
  paid: { label: "Payée", color: "bg-green-100 text-green-700" },
  pending: { label: "En attente", color: "bg-amber-100 text-amber-700" },
  payment_failed: { label: "Échec paiement", color: "bg-red-100 text-red-600" },
  payment_expired: { label: "Expiré", color: "bg-gray-100 text-gray-600" },
  canceled: { label: "Annulée", color: "bg-red-50 text-red-500" },
  preparing: {
    label: "En préparation",
    color: "bg-violet-100 text-violet-600",
  },
  shipped: { label: "Expédiée", color: "bg-blue-100 text-blue-600" },
  delivered: { label: "Livrée", color: "bg-green-100 text-green-700" },
};

export default function OrderTrackingPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const orderId = Number(params.id);
  const justPaid = searchParams.get("paid") === "true";
  const [order, setOrder] = useState<Order | null>(null);
  const [tracking, setTracking] = useState<TrackingStep[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!orderId) return;
    getOrderTracking(orderId)
      .then((r) => {
        setOrder(r.order as unknown as Order);
        setTracking(r.tracking);
      })
      .catch((err) => setError((err as Error).message))
      .finally(() => setLoading(false));
  }, [orderId]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-violet-600 border-t-transparent" />
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <p className="text-red-600">{error || "Commande non trouvée"}</p>
        <Link
          href="/boutique"
          className="mt-4 inline-block text-violet-600 hover:underline"
        >
          Retour à la boutique
        </Link>
      </div>
    );
  }

  const statusInfo = statusLabels[order.status] || {
    label: order.status,
    color: "bg-gray-100 text-gray-600",
  };
  const totalItems = order.items?.reduce((s, i) => s + i.quantity, 0) || 0;

  return (
    <div className="min-h-screen bg-gray-50 pb-12">
      <div className="mx-auto max-w-2xl px-4 py-6">
        {/* Nav */}
        <Link
          href="/boutique"
          className="mb-6 inline-flex items-center gap-2 text-sm text-gray-500 hover:text-violet-600 transition"
        >
          <ArrowLeft size={16} /> Retour à la boutique
        </Link>

        {/* Payment success banner */}
        {justPaid && (
          <div className="mb-6 rounded-2xl bg-linear-to-r from-green-500 to-emerald-600 p-6 text-white shadow-lg shadow-green-500/20">
            <div className="flex items-start gap-4">
              <div className="shrink-0 w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
                <PartyPopper className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-lg font-bold mb-1">Paiement confirmé !</h2>
                <p className="text-sm text-green-100">
                  Votre paiement Orange Money de{" "}
                  {Math.round(order.total_amount)} FCFA a été reçu avec succès.
                  Votre commande sera traitée dans les plus brefs délais.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Order header card */}
        <div className="rounded-2xl bg-white p-6 shadow-sm mb-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center">
                <ShoppingBag className="w-5 h-5 text-violet-600" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-gray-900">
                  Commande #{order.id}
                </h1>
                <p className="text-xs text-gray-400">
                  {new Date(order.created_at).toLocaleDateString("fr-FR", {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </p>
              </div>
            </div>
            <span
              className={`text-xs font-semibold px-3 py-1.5 rounded-full ${statusInfo.color}`}
            >
              {statusInfo.label}
            </span>
          </div>

          {/* Summary row */}
          <div className="flex items-center justify-between pt-4 border-t border-gray-100">
            <span className="text-sm text-gray-500">
              {totalItems} article{totalItems > 1 ? "s" : ""}
            </span>
            <span className="text-lg font-bold text-gray-900">
              {Math.round(order.total_amount)} FCFA
            </span>
          </div>
        </div>

        {/* Items */}
        {order.items && order.items.length > 0 && (
          <div className="rounded-2xl bg-white p-6 shadow-sm mb-4">
            <h2 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Package className="w-4 h-4 text-violet-600" />
              Articles commandés
            </h2>
            <div className="space-y-3">
              {order.items.map((item, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-lg bg-gray-100 shrink-0 flex items-center justify-center overflow-hidden">
                    {item.product?.image_url ? (
                      <Image
                        src={item.product.image_url}
                        alt={item.product?.name || "Produit"}
                        width={48}
                        height={48}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Package className="w-5 h-5 text-gray-400" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {item.product?.name || `Produit #${item.product_id}`}
                    </p>
                    <p className="text-xs text-gray-400">
                      {Math.round(item.price)} FCFA × {item.quantity}
                    </p>
                  </div>
                  <p className="text-sm font-semibold text-gray-900 shrink-0">
                    {Math.round(item.price * item.quantity)} FCFA
                  </p>
                </div>
              ))}
            </div>
            {/* Total recap */}
            <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between">
              <span className="text-sm text-gray-500">Total</span>
              <span className="text-base font-bold text-violet-600">
                {Math.round(order.total_amount)} FCFA
              </span>
            </div>
          </div>
        )}

        {/* Tracking steps */}
        {tracking.length > 0 && (
          <div className="rounded-2xl bg-white p-6 shadow-sm mb-4">
            <h2 className="text-sm font-semibold text-gray-900 mb-4">
              Suivi de livraison
            </h2>
            <div className="space-y-0">
              {tracking.map((step, i) => (
                <div key={step.step} className="flex items-start gap-3">
                  <div className="flex flex-col items-center">
                    {step.done ? (
                      <CheckCircle size={22} className="text-green-600" />
                    ) : (
                      <Circle size={22} className="text-gray-300" />
                    )}
                    {i < tracking.length - 1 && (
                      <div
                        className={`h-8 w-0.5 ${
                          step.done ? "bg-green-600" : "bg-gray-200"
                        }`}
                      />
                    )}
                  </div>
                  <p
                    className={`pt-0.5 text-sm ${
                      step.done ? "font-medium text-gray-900" : "text-gray-400"
                    }`}
                  >
                    {step.label}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Delivery address */}
        {order.delivery_address && (
          <div className="rounded-2xl bg-white p-6 shadow-sm mb-4">
            <h2 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-violet-600" />
              Adresse de livraison
            </h2>
            <div className="space-y-1">
              <p className="text-sm font-medium text-gray-900">
                {order.delivery_address.full_name}
              </p>
              <p className="text-sm text-gray-500">
                {order.delivery_address.address}
              </p>
              <p className="text-sm text-gray-500">
                {order.delivery_address.city}
              </p>
              {order.delivery_address.phone && (
                <p className="text-sm text-gray-500 flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5" />
                  {order.delivery_address.phone}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 mt-6">
          <Link
            href="/boutique"
            className="flex-1 text-center bg-violet-600 hover:bg-violet-700 text-white font-semibold py-3 rounded-xl transition text-sm"
          >
            Continuer mes achats
          </Link>
          <Link
            href="/boutique/orders"
            className="flex-1 text-center bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 font-semibold py-3 rounded-xl transition text-sm"
          >
            Mes commandes
          </Link>
        </div>
      </div>
    </div>
  );
}
