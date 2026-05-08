"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Package,
  Clock,
  CheckCircle2,
  Truck,
  XCircle,
  CreditCard,
  Loader2,
} from "lucide-react";
import { getOrders } from "@/lib/api";

interface OrderItem {
  product_id: number;
  quantity: number;
  price: number;
  product?: { name: string; image_url?: string };
}

interface Order {
  id: number;
  created_at: string;
  total_amount: number;
  status: string;
  payment_id: string;
  items?: OrderItem[];
}

const statusConfig: Record<
  string,
  { label: string; color: string; icon: typeof Clock }
> = {
  pending: {
    label: "En attente",
    color: "text-amber-600 bg-amber-50",
    icon: Clock,
  },
  paid: {
    label: "Payée",
    color: "text-green-600 bg-green-50",
    icon: CreditCard,
  },
  confirmed: {
    label: "Confirmée",
    color: "text-blue-600 bg-blue-50",
    icon: CheckCircle2,
  },
  preparing: {
    label: "En préparation",
    color: "text-blue-600 bg-blue-50",
    icon: Package,
  },
  shipped: {
    label: "Expédiée",
    color: "text-indigo-600 bg-indigo-50",
    icon: Truck,
  },
  delivered: {
    label: "Livrée",
    color: "text-green-600 bg-green-50",
    icon: CheckCircle2,
  },
  canceled: {
    label: "Annulée",
    color: "text-red-600 bg-red-50",
    icon: XCircle,
  },
  payment_failed: {
    label: "Échec paiement",
    color: "text-red-600 bg-red-50",
    icon: XCircle,
  },
  payment_expired: {
    label: "Paiement expiré",
    color: "text-gray-600 bg-gray-50",
    icon: Clock,
  },
};

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getOrders()
      .then((data) => setOrders(data as unknown as Order[]))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-white">
      <header className="bg-surface/80 backdrop-blur-md border-b border-border px-4 py-4 sticky top-0 z-20">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <Link
            href="/boutique"
            className="text-muted hover:text-foreground transition"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-lg font-bold flex items-center gap-2">
            <Package className="w-5 h-5 text-blue-600" />
            Mes commandes
          </h1>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-4">
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-muted" />
          </div>
        ) : orders.length === 0 ? (
          <div className="text-center py-16 space-y-3">
            <Package className="w-14 h-14 text-muted mx-auto" />
            <p className="text-muted">Aucune commande pour le moment</p>
            <Link
              href="/boutique"
              className="inline-block text-sm text-blue-600 font-medium hover:underline"
            >
              Découvrir la boutique
            </Link>
          </div>
        ) : (
          orders.map((order) => {
            const st = statusConfig[order.status] || {
              label: order.status,
              color: "text-gray-600 bg-gray-50",
              icon: Clock,
            };
            const Icon = st.icon;
            return (
              <Link
                key={order.id}
                href={`/boutique/orders/${order.id}`}
                className="block bg-surface rounded-xl p-4 border border-border hover:border-blue-300 transition space-y-3"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-semibold text-foreground">
                      Commande #{order.id}
                    </p>
                    <p className="text-xs text-muted mt-0.5">
                      {new Date(order.created_at).toLocaleDateString("fr-FR", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                  <span
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${st.color}`}
                  >
                    <Icon className="w-3 h-3" />
                    {st.label}
                  </span>
                </div>

                {order.items && order.items.length > 0 && (
                  <div className="space-y-1">
                    {order.items.slice(0, 3).map((item, i) => (
                      <p key={i} className="text-xs text-muted">
                        {item.quantity}x{" "}
                        {item.product?.name || `Produit #${item.product_id}`} -{" "}
                        {item.price.toLocaleString("fr-FR")} FCFA
                      </p>
                    ))}
                    {order.items.length > 3 && (
                      <p className="text-xs text-muted">
                        +{order.items.length - 3} autre(s)
                      </p>
                    )}
                  </div>
                )}

                <div className="flex items-center justify-between pt-2 border-t border-border">
                  <span className="text-sm font-semibold text-foreground">
                    {order.total_amount.toLocaleString("fr-FR")} FCFA
                  </span>
                  <div className="flex items-center gap-3">
                    {(order.status === "shipped" ||
                      order.status === "confirmed" ||
                      order.status === "preparing") && (
                      <Link
                        href={`/boutique/suivi/${order.id}`}
                        onClick={(e) => e.stopPropagation()}
                        className="text-xs text-green-600 font-medium flex items-center gap-1 hover:underline"
                      >
                        <Truck className="w-3 h-3" />
                        Suivre
                      </Link>
                    )}
                    <span className="text-xs text-blue-600 font-medium">
                      Voir le détail →
                    </span>
                  </div>
                </div>
              </Link>
            );
          })
        )}
      </main>
    </div>
  );
}
