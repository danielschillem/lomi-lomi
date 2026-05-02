"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Clock,
  Calendar,
  MapPin,
  Star,
  Users,
  X,
  Check,
  AlertCircle,
  Sparkles,
  Send,
} from "lucide-react";
import {
  getWellnessBookings,
  cancelWellnessBooking,
  createWellnessReview,
} from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

interface Service {
  id: number;
  name: string;
  duration: number;
  price: number;
}

interface Provider {
  id: number;
  name: string;
  city: string;
  image_url: string;
}

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
  service: Service;
  provider: Provider;
  guest?: { id: number; username: string };
}

const statusConfig: Record<
  string,
  { label: string; color: string; icon: typeof Check }
> = {
  pending: {
    label: "En attente",
    color: "bg-amber-500/10 text-amber-400",
    icon: Clock,
  },
  confirmed: {
    label: "Confirmé",
    color: "bg-emerald-50 text-emerald-600",
    icon: Check,
  },
  completed: {
    label: "Terminé",
    color: "bg-blue-50 text-blue-600",
    icon: Check,
  },
  canceled: {
    label: "Annulé",
    color: "bg-red-50 text-red-400",
    icon: X,
  },
};

export default function ReservationsPage() {
  const { user, loading: authLoading } = useAuth();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("");
  const [cancelingId, setCancelingId] = useState<number | null>(null);

  // Review modal
  const [reviewBooking, setReviewBooking] = useState<Booking | null>(null);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState("");
  const [reviewLoading, setReviewLoading] = useState(false);
  const [reviewSuccess, setReviewSuccess] = useState(false);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    getWellnessBookings()
      .then((res) => setBookings(res as unknown as Booking[]))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user]);

  const filtered = filter
    ? bookings.filter((b) => b.status === filter)
    : bookings;

  async function handleCancel(bookingId: number) {
    setCancelingId(bookingId);
    try {
      await cancelWellnessBooking(bookingId);
      setBookings((prev) =>
        prev.map((b) =>
          b.id === bookingId ? { ...b, status: "canceled" } : b,
        ),
      );
    } catch {
      /* ignore */
    }
    setCancelingId(null);
  }

  async function handleReview() {
    if (!reviewBooking) return;
    setReviewLoading(true);
    try {
      await createWellnessReview({
        booking_id: reviewBooking.id,
        rating: reviewRating,
        comment: reviewComment,
      });
      setReviewSuccess(true);
      setReviewBooking(null);
      setReviewComment("");
      setReviewRating(5);
      setTimeout(() => setReviewSuccess(false), 4000);
    } catch {
      /* ignore */
    }
    setReviewLoading(false);
  }

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-muted">Chargement...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-4">
        <p className="text-muted">Connectez-vous pour voir vos réservations.</p>
        <Link
          href="/login"
          className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-6 py-3 rounded-lg transition text-sm"
        >
          Se connecter
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen px-4 py-12">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <Link
            href="/bien-etre"
            className="inline-flex items-center gap-2 text-sm text-muted hover:text-foreground transition"
          >
            <ArrowLeft className="w-4 h-4" />
            Bien-être
          </Link>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Calendar className="w-5 h-5 text-emerald-600" />
            Mes réservations
          </h1>
          <div className="w-16" />
        </div>

        {/* Review success */}
        {reviewSuccess && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-600 text-sm rounded-lg px-4 py-3 mb-6 flex items-center gap-2">
            <Check className="w-4 h-4" />
            Avis publié avec succès !
          </div>
        )}

        {/* Filters */}
        <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-2">
          {[
            { value: "", label: "Toutes" },
            { value: "pending", label: "En attente" },
            { value: "confirmed", label: "Confirmées" },
            { value: "completed", label: "Terminées" },
            { value: "canceled", label: "Annulées" },
          ].map((f) => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={`px-4 py-1.5 rounded-full text-xs font-medium transition whitespace-nowrap ${
                filter === f.value
                  ? "bg-emerald-500/20 text-emerald-600 border border-emerald-500/30"
                  : "bg-surface text-muted border border-border hover:border-border"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Bookings */}
        {loading ? (
          <div className="text-center py-12 text-muted animate-pulse">
            Chargement...
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12">
            <Calendar className="w-16 h-16 text-muted/60 mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">Aucune réservation</h2>
            <p className="text-muted text-sm mb-4">
              Explorez nos prestataires pour réserver un soin.
            </p>
            <Link
              href="/bien-etre"
              className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-5 py-2.5 rounded-lg transition text-sm"
            >
              <Sparkles className="w-4 h-4" />
              Découvrir
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {filtered.map((booking) => {
              const status =
                statusConfig[booking.status] || statusConfig.pending;
              const StatusIcon = status.icon;
              const isPast = new Date(booking.date) < new Date();
              const canCancel =
                !isPast &&
                (booking.status === "pending" ||
                  booking.status === "confirmed");
              const canReview = booking.status === "completed";

              return (
                <div
                  key={booking.id}
                  className="bg-white/90 border border-border rounded-xl p-5"
                >
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div>
                      <h3 className="font-semibold text-sm">
                        {booking.service?.name}
                      </h3>
                      <Link
                        href={`/bien-etre/${booking.provider?.id}`}
                        className="text-xs text-emerald-600 hover:text-emerald-300 transition"
                      >
                        {booking.provider?.name}
                      </Link>
                    </div>
                    <span
                      className={`inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full ${status.color}`}
                    >
                      <StatusIcon className="w-3 h-3" />
                      {status.label}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs text-muted mb-3">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {new Date(booking.date).toLocaleDateString("fr-FR")}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {booking.start_time} - {booking.end_time}
                    </span>
                    <span className="flex items-center gap-1">
                      <Users className="w-3 h-3" />
                      {booking.persons === 2 ? "Duo" : "Solo"}
                      {booking.guest && ` avec ${booking.guest.username}`}
                    </span>
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      {booking.provider?.city}
                    </span>
                  </div>

                  {booking.notes && (
                    <p className="text-muted text-xs mb-3 italic">
                      {booking.notes}
                    </p>
                  )}

                  <div className="flex items-center justify-between pt-3 border-t border-border">
                    <span className="text-sm font-bold text-white">
                      {Math.round(booking.total_price)} FCFA
                    </span>
                    <div className="flex items-center gap-2">
                      {canReview && (
                        <button
                          onClick={() => setReviewBooking(booking)}
                          className="inline-flex items-center gap-1 text-xs text-yellow-600 hover:text-yellow-300 transition"
                        >
                          <Star className="w-3 h-3" />
                          Laisser un avis
                        </button>
                      )}
                      {canCancel && (
                        <button
                          onClick={() => handleCancel(booking.id)}
                          disabled={cancelingId === booking.id}
                          className="inline-flex items-center gap-1 text-xs text-red-400 hover:text-red-300 transition disabled:opacity-50"
                        >
                          <X className="w-3 h-3" />
                          {cancelingId === booking.id
                            ? "Annulation..."
                            : "Annuler"}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Review Modal */}
      {reviewBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-white/80"
            onClick={() => setReviewBooking(null)}
          />
          <div className="relative bg-surface border border-border rounded-2xl p-6 w-full max-w-md">
            <button
              onClick={() => setReviewBooking(null)}
              className="absolute top-4 right-4 text-muted hover:text-foreground transition"
              title="Fermer"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-bold mb-1">Laisser un avis</h3>
            <p className="text-sm text-muted mb-4">
              {reviewBooking.service?.name} - {reviewBooking.provider?.name}
            </p>

            {/* Rating */}
            <div className="mb-4">
              <label className="block text-xs text-muted mb-2">Note</label>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    onClick={() => setReviewRating(n)}
                    className="transition"
                    title={`${n} étoile${n > 1 ? "s" : ""}`}
                  >
                    <Star
                      className={`w-7 h-7 ${
                        n <= reviewRating
                          ? "text-yellow-600 fill-yellow-400"
                          : "text-foreground"
                      }`}
                    />
                  </button>
                ))}
              </div>
            </div>

            {/* Comment */}
            <div className="mb-4">
              <label className="block text-xs text-muted mb-1.5">
                Commentaire
              </label>
              <textarea
                value={reviewComment}
                onChange={(e) => setReviewComment(e.target.value)}
                placeholder="Partagez votre expérience..."
                rows={3}
                className="w-full px-3 py-2.5 bg-surface-2 border border-border rounded-lg text-sm text-foreground placeholder-gray-400 focus:outline-none focus:border-yellow-500/50 transition resize-none"
              />
            </div>

            <button
              onClick={handleReview}
              disabled={reviewLoading || !reviewComment.trim()}
              className="w-full inline-flex items-center justify-center gap-2 bg-yellow-600 hover:bg-yellow-700 disabled:opacity-50 text-white font-semibold py-3 rounded-lg transition text-sm"
            >
              <Send className="w-4 h-4" />
              {reviewLoading ? "Publication..." : "Publier l'avis"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
