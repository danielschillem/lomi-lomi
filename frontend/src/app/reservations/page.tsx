"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  CalendarDays,
  MapPin,
  Users,
  Clock,
  Loader2,
  CheckCircle2,
  XCircle,
  Plus,
  MessageSquare,
} from "lucide-react";
import {
  createPlaceReservation,
  getMyPlaceReservations,
  cancelPlaceReservation,
  getPlaces,
  initiateReservationPayment,
  confirmReservationPayment,
} from "@/lib/api";
import OMPaymentModal from "@/components/OMPaymentModal";

interface Place {
  id: number;
  name: string;
  category: string;
  address: string;
  city: string;
  image_url?: string;
}

interface Reservation {
  id: number;
  place_id: number;
  date: string;
  end_date?: string;
  persons: number;
  notes?: string;
  status: string;
  created_at: string;
  place?: Place;
}

const statusLabels: Record<string, { label: string; color: string }> = {
  pending: { label: "En attente", color: "text-amber-600 bg-amber-50" },
  confirmed: { label: "Confirmée", color: "text-green-600 bg-green-50" },
  canceled: { label: "Annulée", color: "text-red-600 bg-red-50" },
  completed: { label: "Terminée", color: "text-blue-600 bg-blue-50" },
};

export default function ReservationsPage() {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [places, setPlaces] = useState<Place[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [pendingReservationId, setPendingReservationId] = useState<
    number | null
  >(null);

  const [form, setForm] = useState({
    place_id: "",
    date: "",
    end_date: "",
    persons: "2",
    notes: "",
  });

  const loadReservations = useCallback(async () => {
    try {
      const data = await getMyPlaceReservations();
      const raw = data as unknown as { reservations?: Reservation[] };
      const list = raw?.reservations ?? [];
      setReservations(Array.isArray(list) ? list : []);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadReservations();
    getPlaces()
      .then((data) => setPlaces(data as unknown as Place[]))
      .catch(() => {});
  }, [loadReservations]);

  const handleCreate = async () => {
    if (!form.place_id || !form.date) return;
    setSubmitting(true);
    try {
      const res = await createPlaceReservation({
        place_id: parseInt(form.place_id, 10),
        date: form.date,
        end_date: form.end_date || undefined,
        persons: parseInt(form.persons, 10) || 2,
        notes: form.notes || undefined,
      });
      const created = res as unknown as { id: number };
      setPendingReservationId(created.id);
      setShowPaymentModal(true);
      setForm({
        place_id: "",
        date: "",
        end_date: "",
        persons: "2",
        notes: "",
      });
      setShowForm(false);
    } catch {
      /* ignore */
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = async (id: number) => {
    try {
      await cancelPlaceReservation(id);
      await loadReservations();
    } catch {
      /* ignore */
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
              <CalendarDays className="w-5 h-5 text-pink-500" />
              Mes réservations
            </h1>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="px-4 py-2 rounded-xl bg-violet-600 text-white text-sm font-medium hover:bg-violet-700 transition flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            {showForm ? "Fermer" : "Réserver"}
          </button>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* New reservation form */}
        {showForm && (
          <div className="bg-surface rounded-2xl p-5 border border-border space-y-4 animate-in fade-in slide-in-from-top-2">
            <h2 className="font-semibold text-foreground flex items-center gap-2">
              <CalendarDays className="w-4 h-4 text-violet-600" />
              Nouvelle réservation
            </h2>

            <label className="block">
              <span className="text-sm text-muted">Lieu *</span>
              <select
                value={form.place_id}
                onChange={(e) => setForm({ ...form, place_id: e.target.value })}
                className="mt-1 w-full px-3 py-2 bg-white border border-border rounded-xl text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-violet-500/50"
              >
                <option value="">Sélectionner un lieu</option>
                {places.map((place) => (
                  <option key={place.id} value={place.id}>
                    {place.name} - {place.city}
                  </option>
                ))}
              </select>
            </label>

            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="text-sm text-muted">
                  Date d&apos;arrivée *
                </span>
                <input
                  type="datetime-local"
                  value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
                  className="mt-1 w-full px-3 py-2 bg-white border border-border rounded-xl text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-violet-500/50"
                />
              </label>
              <label className="block">
                <span className="text-sm text-muted">Date de fin</span>
                <input
                  type="datetime-local"
                  value={form.end_date}
                  onChange={(e) =>
                    setForm({ ...form, end_date: e.target.value })
                  }
                  className="mt-1 w-full px-3 py-2 bg-white border border-border rounded-xl text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-violet-500/50"
                />
              </label>
            </div>

            <label className="block">
              <span className="text-sm text-muted">Nombre de personnes</span>
              <input
                type="number"
                min="1"
                max="50"
                value={form.persons}
                onChange={(e) => setForm({ ...form, persons: e.target.value })}
                className="mt-1 w-full px-3 py-2 bg-white border border-border rounded-xl text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-violet-500/50"
              />
            </label>

            <label className="block">
              <span className="text-sm text-muted">Notes</span>
              <textarea
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="Demandes particulières…"
                rows={2}
                className="mt-1 w-full px-3 py-2 bg-white border border-border rounded-xl text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-violet-500/50 resize-none"
              />
            </label>

            <button
              onClick={handleCreate}
              disabled={!form.place_id || !form.date || submitting}
              className="w-full py-2.5 rounded-xl bg-violet-600 text-white font-medium text-sm disabled:opacity-50 hover:bg-violet-700 transition flex items-center justify-center gap-2"
            >
              {submitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <CheckCircle2 className="w-4 h-4" />
              )}
              Confirmer la réservation
            </button>
          </div>
        )}

        {/* Reservations list */}
        <section className="space-y-3">
          <h2 className="font-semibold text-foreground">
            Historique ({reservations.length})
          </h2>

          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted" />
            </div>
          ) : reservations.length === 0 ? (
            <div className="text-center py-12 space-y-3">
              <CalendarDays className="w-12 h-12 text-muted mx-auto" />
              <p className="text-muted text-sm">
                Aucune réservation pour le moment
              </p>
              <button
                onClick={() => setShowForm(true)}
                className="text-sm text-violet-600 font-medium hover:underline"
              >
                Faire ma première réservation
              </button>
            </div>
          ) : (
            reservations.map((res) => {
              const st = statusLabels[res.status] || {
                label: res.status,
                color: "text-gray-600 bg-gray-50",
              };
              return (
                <div
                  key={res.id}
                  className="bg-surface rounded-xl p-4 border border-border space-y-3"
                >
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-foreground">
                        {res.place?.name || `Lieu #${res.place_id}`}
                      </p>
                      {res.place?.address && (
                        <p className="text-xs text-muted flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {res.place.address}, {res.place.city}
                        </p>
                      )}
                    </div>
                    <span
                      className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${st.color}`}
                    >
                      {st.label}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 text-xs text-muted">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {new Date(res.date).toLocaleDateString("fr-FR", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                    <span className="flex items-center gap-1">
                      <Users className="w-3 h-3" />
                      {res.persons} pers.
                    </span>
                  </div>

                  {res.notes && (
                    <p className="text-xs text-muted flex items-center gap-1">
                      <MessageSquare className="w-3 h-3" />
                      {res.notes}
                    </p>
                  )}

                  {(res.status === "pending" || res.status === "confirmed") && (
                    <button
                      onClick={() => handleCancel(res.id)}
                      className="text-xs text-red-600 font-medium hover:underline flex items-center gap-1"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      Annuler
                    </button>
                  )}
                </div>
              );
            })
          )}
        </section>
      </main>

      {/* Payment Modal for reservation fee */}
      <OMPaymentModal
        open={showPaymentModal}
        onClose={() => {
          setShowPaymentModal(false);
          loadReservations();
        }}
        onSuccess={() => {
          setShowPaymentModal(false);
          loadReservations();
        }}
        title="Paiement réservation"
        description="Frais de réservation de lieu : 500 FCFA par Orange Money."
        amount={500}
        initiatePayment={() =>
          initiateReservationPayment(pendingReservationId!)
        }
        confirmPayment={(paymentId, phone, otp) =>
          confirmReservationPayment(paymentId, phone, otp)
        }
      />
    </div>
  );
}
