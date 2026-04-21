"use client";

import { useEffect, useState } from "react";
import { ownerGetReservations, ownerUpdateReservationStatus } from "@/lib/api";
import { CheckCircle, XCircle, Clock } from "lucide-react";

interface Reservation {
  id: number;
  created_at: string;
  date: string;
  end_date: string;
  persons: number;
  status: string;
  notes: string;
  place?: { name: string; category: string; city: string };
  user?: { username: string };
}

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  pending: { label: "En attente", color: "bg-yellow-500/10 text-yellow-400" },
  confirmed: { label: "Confirmée", color: "bg-blue-500/10 text-blue-400" },
  completed: { label: "Terminée", color: "bg-green-500/10 text-green-400" },
  canceled: { label: "Annulée", color: "bg-red-500/100/10 text-red-400" },
};

export default function DashboardReservationsPage() {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    ownerGetReservations()
      .then((r) => setReservations(r.reservations as unknown as Reservation[]))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  async function handleStatus(id: number, status: string) {
    try {
      await ownerUpdateReservationStatus(id, status);
      setReservations((prev) =>
        prev.map((r) => (r.id === id ? { ...r, status } : r)),
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
        Réservations de lieux
      </h1>

      {reservations.length === 0 ? (
        <p className="text-zinc-400">Aucune réservation de lieu.</p>
      ) : (
        <div className="space-y-4">
          {reservations.map((res) => {
            const sc = STATUS_CONFIG[res.status] || STATUS_CONFIG.pending;
            const dateStr = new Date(res.date).toLocaleDateString("fr-FR");
            const endStr = res.end_date
              ? new Date(res.end_date).toLocaleDateString("fr-FR")
              : dateStr;
            return (
              <div key={res.id} className="rounded-xl bg-zinc-900/60 border border-zinc-800 p-5 ">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold text-white">
                      {res.place?.name}{" "}
                      <span className="text-sm text-zinc-400">
                        ({res.place?.category})
                      </span>
                    </p>
                    <p className="text-sm text-zinc-400">
                      {dateStr === endStr ? dateStr : `${dateStr} → ${endStr}`}{" "}
                      • {res.persons} pers.
                    </p>
                    <p className="text-sm text-zinc-400">
                      Client : {res.user?.username}
                    </p>
                    {res.notes && (
                      <p className="mt-1 text-sm text-zinc-500 italic">
                        {res.notes}
                      </p>
                    )}
                  </div>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-medium ${sc.color}`}
                  >
                    {sc.label}
                  </span>
                </div>

                {res.status === "pending" && (
                  <div className="mt-3 flex gap-2">
                    <button
                      onClick={() => handleStatus(res.id, "confirmed")}
                      className="flex items-center gap-1 rounded-lg bg-green-600 px-3 py-2 text-sm text-white"
                    >
                      <CheckCircle size={14} /> Confirmer
                    </button>
                    <button
                      onClick={() => handleStatus(res.id, "canceled")}
                      className="flex items-center gap-1 rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-400"
                    >
                      <XCircle size={14} /> Refuser
                    </button>
                  </div>
                )}
                {res.status === "confirmed" && (
                  <div className="mt-3">
                    <button
                      onClick={() => handleStatus(res.id, "completed")}
                      className="flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-2 text-sm text-white"
                    >
                      <Clock size={14} /> Marquer terminée
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
