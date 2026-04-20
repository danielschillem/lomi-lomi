"use client";

import { useEffect, useState } from "react";
import { ownerGetWellnessBookings, ownerUpdateBookingStatus } from "@/lib/api";
import { CheckCircle, XCircle, Clock } from "lucide-react";

interface Booking {
  id: number;
  created_at: string;
  date: string;
  start_time: string;
  end_time: string;
  persons: number;
  status: string;
  total_price: number;
  notes: string;
  user?: { username: string };
  service?: { name: string; duration: number };
  provider?: { name: string };
}

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  pending: { label: "En attente", color: "bg-yellow-100 text-yellow-800" },
  confirmed: { label: "Confirmée", color: "bg-blue-100 text-blue-800" },
  completed: { label: "Terminée", color: "bg-green-100 text-green-800" },
  canceled: { label: "Annulée", color: "bg-red-100 text-red-800" },
};

export default function DashboardWellnessPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    ownerGetWellnessBookings()
      .then((r) => setBookings(r.bookings as unknown as Booking[]))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  async function handleStatus(id: number, status: string) {
    try {
      await ownerUpdateBookingStatus(id, status);
      setBookings((prev) =>
        prev.map((b) => (b.id === id ? { ...b, status } : b)),
      );
    } catch (err) {
      alert((err as Error).message);
    }
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-purple-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-gray-900">
        Réservations bien-être
      </h1>

      {bookings.length === 0 ? (
        <p className="text-gray-500">Aucune réservation bien-être.</p>
      ) : (
        <div className="space-y-4">
          {bookings.map((booking) => {
            const sc = STATUS_CONFIG[booking.status] || STATUS_CONFIG.pending;
            return (
              <div
                key={booking.id}
                className="rounded-xl bg-white p-5 shadow-sm"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold text-gray-900">
                      {booking.service?.name || "Service"} —{" "}
                      {booking.provider?.name}
                    </p>
                    <p className="text-sm text-gray-500">
                      {new Date(booking.date).toLocaleDateString("fr-FR")} •{" "}
                      {booking.start_time} – {booking.end_time}
                    </p>
                    <p className="text-sm text-gray-500">
                      Client : {booking.user?.username} • {booking.persons}{" "}
                      pers. • {booking.total_price.toFixed(2)} €
                    </p>
                    {booking.notes && (
                      <p className="mt-1 text-sm text-gray-400 italic">
                        {booking.notes}
                      </p>
                    )}
                  </div>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-medium ${sc.color}`}
                  >
                    {sc.label}
                  </span>
                </div>

                {booking.status === "pending" && (
                  <div className="mt-3 flex gap-2">
                    <button
                      onClick={() => handleStatus(booking.id, "confirmed")}
                      className="flex items-center gap-1 rounded-lg bg-green-600 px-3 py-2 text-sm text-white"
                    >
                      <CheckCircle size={14} /> Confirmer
                    </button>
                    <button
                      onClick={() => handleStatus(booking.id, "canceled")}
                      className="flex items-center gap-1 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700"
                    >
                      <XCircle size={14} /> Refuser
                    </button>
                  </div>
                )}
                {booking.status === "confirmed" && (
                  <div className="mt-3">
                    <button
                      onClick={() => handleStatus(booking.id, "completed")}
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
