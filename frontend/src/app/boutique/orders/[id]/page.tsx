"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { getOrderTracking } from "@/lib/api";
import { CheckCircle, Circle, ArrowLeft } from "lucide-react";
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

export default function OrderTrackingPage() {
  const params = useParams();
  const orderId = Number(params.id);
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
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-purple-600 border-t-transparent" />
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <p className="text-red-600">{error || "Commande non trouvée"}</p>
        <Link
          href="/boutique"
          className="mt-4 inline-block text-purple-700 underline"
        >
          Retour à la boutique
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <Link
        href="/boutique"
        className="mb-6 flex items-center gap-2 text-sm text-purple-700 hover:underline"
      >
        <ArrowLeft size={16} /> Retour
      </Link>

      <h1 className="mb-2 text-2xl font-bold text-gray-900">
        Commande #{order.id}
      </h1>
      <p className="mb-6 text-sm text-gray-500">
        Passée le {new Date(order.created_at).toLocaleDateString("fr-FR")} •{" "}
        {Math.round(order.total_amount)} FCFA
      </p>

      {/* Tracking steps */}
      <div className="mb-8 rounded-xl bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">
          Suivi de livraison
        </h2>
        <div className="space-y-0">
          {tracking.map((step, i) => (
            <div key={step.step} className="flex items-start gap-3">
              <div className="flex flex-col items-center">
                {step.done ? (
                  <CheckCircle size={24} className="text-green-600" />
                ) : (
                  <Circle size={24} className="text-gray-300" />
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

      {/* Items */}
      {order.items && order.items.length > 0 && (
        <div className="mb-6 rounded-xl bg-white p-6 shadow-sm">
          <h2 className="mb-3 text-lg font-semibold text-gray-900">Articles</h2>
          <div className="divide-y">
            {order.items.map((item, i) => (
              <div key={i} className="flex items-center justify-between py-2">
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {item.product?.name || `Produit #${item.product_id}`}
                  </p>
                  <p className="text-xs text-gray-500">Qté : {item.quantity}</p>
                </div>
                <p className="text-sm font-medium text-gray-900">
                  {Math.round(item.price * item.quantity)} FCFA
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Delivery address */}
      {order.delivery_address && (
        <div className="rounded-xl bg-white p-6 shadow-sm">
          <h2 className="mb-3 text-lg font-semibold text-gray-900">
            Adresse de livraison
          </h2>
          <p className="text-sm text-gray-700">
            {order.delivery_address.full_name}
          </p>
          <p className="text-sm text-gray-500">
            {order.delivery_address.address}
          </p>
          <p className="text-sm text-gray-500">{order.delivery_address.city}</p>
          {order.delivery_address.phone && (
            <p className="text-sm text-gray-500">
              📞 {order.delivery_address.phone}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
