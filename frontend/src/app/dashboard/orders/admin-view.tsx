"use client";

import { useState, useEffect, useCallback } from "react";
import { ShoppingCart, ChevronLeft, ChevronRight, Package } from "lucide-react";
import { adminListOrders, adminUpdateOrderStatus } from "@/lib/api";

interface OrderItem {
  id: number;
  product_id: number;
  quantity: number;
  price: number;
  product?: { name: string };
}

interface Order {
  id: number;
  user_id: number;
  total_amount: number;
  status: string;
  payment_id: string;
  created_at: string;
  user?: { username: string; email: string };
  items?: OrderItem[];
}

const statusColors: Record<string, string> = {
  pending: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
  paid: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  shipped: "bg-violet-500/10 text-violet-400 border-violet-500/20",
  delivered: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  cancelled: "bg-red-500/10 text-red-400 border-red-500/20",
};

const statuses = ["pending", "paid", "shipped", "delivered", "cancelled"];

export default function AdminOrdersView() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminListOrders(page);
      setOrders(res.orders as unknown as Order[]);
      setTotal(res.total);
    } catch {
      /* ignore */
    }
    setLoading(false);
  }, [page]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleStatusChange(order: Order, newStatus: string) {
    try {
      await adminUpdateOrderStatus(order.id, newStatus);
      load();
    } catch {
      /* ignore */
    }
  }

  const totalPages = Math.ceil(total / 20) || 1;

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <ShoppingCart className="w-6 h-6 text-green-400" />
          Commandes
        </h1>
        <span className="text-sm text-zinc-500">{total} au total</span>
      </div>

      <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-800">
              <th className="text-left px-6 py-4 text-xs text-zinc-500 uppercase tracking-wider font-medium">
                #
              </th>
              <th className="text-left px-6 py-4 text-xs text-zinc-500 uppercase tracking-wider font-medium">
                Client
              </th>
              <th className="text-left px-6 py-4 text-xs text-zinc-500 uppercase tracking-wider font-medium hidden md:table-cell">
                Articles
              </th>
              <th className="text-left px-6 py-4 text-xs text-zinc-500 uppercase tracking-wider font-medium">
                Total
              </th>
              <th className="text-left px-6 py-4 text-xs text-zinc-500 uppercase tracking-wider font-medium">
                Statut
              </th>
              <th className="text-left px-6 py-4 text-xs text-zinc-500 uppercase tracking-wider font-medium hidden sm:table-cell">
                Date
              </th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td
                  colSpan={6}
                  className="px-6 py-12 text-center text-zinc-500 animate-pulse"
                >
                  Chargement...
                </td>
              </tr>
            ) : orders.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="px-6 py-12 text-center text-zinc-500"
                >
                  <Package className="w-10 h-10 mx-auto mb-3 text-zinc-600" />
                  Aucune commande pour le moment.
                </td>
              </tr>
            ) : (
              orders.map((o) => (
                <tr
                  key={o.id}
                  className="border-b border-zinc-800/50 hover:bg-zinc-800/30 transition"
                >
                  <td className="px-6 py-4 text-zinc-400 font-mono text-xs">
                    #{o.id}
                  </td>
                  <td className="px-6 py-4">
                    <div>
                      <span className="font-medium">
                        {o.user?.username || `User #${o.user_id}`}
                      </span>
                      {o.user?.email && (
                        <span className="text-xs text-zinc-500 block">
                          {o.user.email}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-zinc-400 hidden md:table-cell">
                    {o.items?.length ?? 0} article(s)
                  </td>
                  <td className="px-6 py-4 font-medium text-green-400">
                    {o.total_amount.toFixed(2)} €
                  </td>
                  <td className="px-6 py-4">
                    <select
                      value={o.status}
                      onChange={(e) => handleStatusChange(o, e.target.value)}
                      title="Statut de la commande"
                      className={`text-[11px] border px-2 py-1 rounded-full font-medium bg-transparent cursor-pointer focus:outline-none ${statusColors[o.status] || "text-zinc-400 border-zinc-600"}`}
                    >
                      {statuses.map((s) => (
                        <option
                          key={s}
                          value={s}
                          className="bg-zinc-900 text-white"
                        >
                          {s.charAt(0).toUpperCase() + s.slice(1)}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-6 py-4 text-zinc-500 text-xs hidden sm:table-cell">
                    {new Date(o.created_at).toLocaleDateString("fr-FR")}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 mt-6">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-white disabled:opacity-30 transition"
          >
            <ChevronLeft className="w-4 h-4" />
            Précédent
          </button>
          <span className="text-sm text-zinc-500">
            Page {page} / {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-white disabled:opacity-30 transition"
          >
            Suivant
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
