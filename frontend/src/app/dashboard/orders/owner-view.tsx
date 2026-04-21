"use client";

import { useEffect, useState } from "react";
import { ownerGetOrders, ownerUpdateOrderStatus } from "@/lib/api";
import { Package, Truck, CheckCircle, XCircle, Clock } from "lucide-react";

interface Order {
  id: number;
  created_at: string;
  total_amount: number;
  status: string;
  user?: { username: string };
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
    product?: { name: string };
  }[];
}

const STATUS_LABELS: Record<
  string,
  { label: string; color: string; icon: typeof Clock }
> = {
  pending: {
    label: "En attente",
    color: "bg-yellow-500/10 text-yellow-400",
    icon: Clock,
  },
  confirmed: {
    label: "Confirmée",
    color: "bg-blue-500/10 text-blue-400",
    icon: CheckCircle,
  },
  preparing: {
    label: "En préparation",
    color: "bg-orange-500/10 text-orange-400",
    icon: Package,
  },
  shipped: {
    label: "Expédiée",
    color: "bg-violet-500/10 text-violet-400",
    icon: Truck,
  },
  delivered: {
    label: "Livrée",
    color: "bg-green-500/10 text-green-400",
    icon: CheckCircle,
  },
  canceled: {
    label: "Annulée",
    color: "bg-red-500/100/10 text-red-400",
    icon: XCircle,
  },
};

const NEXT_STATUS: Record<string, string> = {
  pending: "confirmed",
  confirmed: "preparing",
  preparing: "shipped",
  shipped: "delivered",
};

export default function OwnerOrdersView() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    ownerGetOrders()
      .then((r) => setOrders(r.orders as unknown as Order[]))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  async function handleStatusUpdate(orderId: number, status: string) {
    try {
      await ownerUpdateOrderStatus(orderId, status);
      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, status } : o)),
      );
    } catch (err) {
      alert((err as Error).message);
    }
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-violet-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-white">
        Commandes reçues
      </h1>

      {orders.length === 0 ? (
        <p className="text-zinc-400">Aucune commande pour le moment.</p>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => {
            const statusInfo =
              STATUS_LABELS[order.status] || STATUS_LABELS.pending;
            const nextStatus = NEXT_STATUS[order.status];
            return (
              <div key={order.id} className="rounded-xl bg-zinc-900/60 border border-zinc-800 p-5 ">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold text-white">
                      Commande #{order.id}
                    </p>
                    <p className="text-sm text-zinc-400">
                      {new Date(order.created_at).toLocaleDateString("fr-FR")} •{" "}
                      {order.user?.username || "Client"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium ${statusInfo.color}`}
                    >
                      <statusInfo.icon size={14} />
                      {statusInfo.label}
                    </span>
                    <span className="font-bold text-white">
                      {order.total_amount.toFixed(2)} €
                    </span>
                  </div>
                </div>

                {/* Items */}
                {order.items && order.items.length > 0 && (
                  <div className="mt-3 border-t pt-3">
                    {order.items.map((item, i) => (
                      <div
                        key={i}
                        className="flex justify-between text-sm text-zinc-400"
                      >
                        <span>
                          {item.product?.name || `Produit #${item.product_id}`}{" "}
                          x{item.quantity}
                        </span>
                        <span>{(item.price * item.quantity).toFixed(2)} €</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Delivery address */}
                {order.delivery_address && (
                  <div className="mt-3 rounded-lg bg-zinc-800/50 p-3 text-sm">
                    <p className="font-medium">📦 Livraison</p>
                    <p>{order.delivery_address.full_name}</p>
                    <p>
                      {order.delivery_address.address},{" "}
                      {order.delivery_address.city}
                    </p>
                    {order.delivery_address.phone && (
                      <p>📞 {order.delivery_address.phone}</p>
                    )}
                  </div>
                )}

                {/* Actions */}
                <div className="mt-3 flex gap-2">
                  {nextStatus && (
                    <button
                      onClick={() => handleStatusUpdate(order.id, nextStatus)}
                      className="rounded-lg bg-purple-600 px-4 py-2 text-sm text-white transition hover:bg-purple-700"
                    >
                      Passer à : {STATUS_LABELS[nextStatus]?.label}
                    </button>
                  )}
                  {order.status !== "canceled" &&
                    order.status !== "delivered" && (
                      <button
                        onClick={() => handleStatusUpdate(order.id, "canceled")}
                        className="rounded-lg bg-red-500/10 px-4 py-2 text-sm text-red-400 transition hover:bg-red-100"
                      >
                        Annuler
                      </button>
                    )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
