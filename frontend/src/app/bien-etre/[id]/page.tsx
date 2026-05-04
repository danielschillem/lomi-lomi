"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Sparkles,
  MapPin,
  Star,
  Phone,
  Globe,
  Clock,
  Users,
  BadgeCheck,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Send,
  Check,
} from "lucide-react";
import {
  getWellnessProvider,
  createWellnessBooking,
  getMatches,
  initiateBookingPayment,
  confirmBookingPayment,
} from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import OMPaymentModal from "@/components/OMPaymentModal";

interface WellnessService {
  id: number;
  name: string;
  description: string;
  duration: number;
  price: number;
  category: string;
  is_duo: boolean;
}

interface Availability {
  id: number;
  day_of_week: number;
  start_time: string;
  end_time: string;
}

interface Provider {
  id: number;
  name: string;
  description: string;
  category: string;
  image_url: string;
  phone: string;
  email: string;
  website: string;
  address: string;
  city: string;
  latitude: number;
  longitude: number;
  rating: number;
  review_count: number;
  certifications: string;
  mobile_service: boolean;
  is_verified: boolean;
  services: WellnessService[];
  availabilities: Availability[];
}

interface Review {
  id: number;
  created_at: string;
  rating: number;
  comment: string;
  user: { id: number; username: string; avatar_url: string };
}

interface MatchUser {
  id: number;
  username: string;
  avatar_url: string;
}

const dayNames = [
  "Dimanche",
  "Lundi",
  "Mardi",
  "Mercredi",
  "Jeudi",
  "Vendredi",
  "Samedi",
];

export default function ProviderPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const providerId = Number(params.id);

  const [provider, setProvider] = useState<Provider | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);

  // Booking state
  const [selectedService, setSelectedService] =
    useState<WellnessService | null>(null);
  const [bookingDate, setBookingDate] = useState("");
  const [bookingTime, setBookingTime] = useState("");
  const [persons, setPersons] = useState(1);
  const [guestId, setGuestId] = useState<number | undefined>();
  const [notes, setNotes] = useState("");
  const [bookingLoading, setBookingLoading] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState(false);
  const [bookingError, setBookingError] = useState("");
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [pendingBookingId, setPendingBookingId] = useState<number | null>(null);

  // Matches for duo invitation
  const [matches, setMatches] = useState<MatchUser[]>([]);

  useEffect(() => {
    if (!providerId) return;
    setLoading(true);
    getWellnessProvider(providerId)
      .then((res) => {
        setProvider(res.provider as unknown as Provider);
        setReviews(res.reviews as unknown as Review[]);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [providerId]);

  // Load matches for duo booking
  useEffect(() => {
    if (!user) return;
    getMatches()
      .then((res) => {
        const matchList = (
          res as unknown as {
            user1: MatchUser;
            user2: MatchUser;
            user1_id: number;
          }[]
        ).map((m) => {
          const other =
            m.user1_id === (user as unknown as { id: number }).id
              ? m.user2
              : m.user1;
          return other;
        });
        setMatches(matchList);
      })
      .catch(() => {});
  }, [user]);

  const parseCerts = (certs: string): string[] => {
    if (!certs) return [];
    try {
      return JSON.parse(certs);
    } catch {
      return certs
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
    }
  };

  // Available time slots for selected date
  const getTimeSlots = (): string[] => {
    if (!provider || !bookingDate || !selectedService) return [];
    const date = new Date(bookingDate);
    const dayOfWeek = date.getDay();
    const avail = provider.availabilities?.find(
      (a) => a.day_of_week === dayOfWeek,
    );
    if (!avail) return [];

    const slots: string[] = [];
    const [startH, startM] = avail.start_time.split(":").map(Number);
    const [endH, endM] = avail.end_time.split(":").map(Number);
    const startMin = startH * 60 + startM;
    const endMin = endH * 60 + endM;

    for (let t = startMin; t + selectedService.duration <= endMin; t += 30) {
      const h = Math.floor(t / 60);
      const m = t % 60;
      slots.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
    }
    return slots;
  };

  // Min date = tomorrow
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const minDate = tomorrow.toISOString().split("T")[0];

  async function handleBooking() {
    if (!selectedService || !bookingDate || !bookingTime) return;
    setBookingLoading(true);
    setBookingError("");
    try {
      const res = await createWellnessBooking({
        service_id: selectedService.id,
        date: bookingDate,
        start_time: bookingTime,
        persons,
        guest_id: persons === 2 ? guestId : undefined,
        notes: notes || undefined,
      });
      const created = res as unknown as { id: number };
      setPendingBookingId(created.id);
      setShowPaymentModal(true);
      setSelectedService(null);
      setBookingDate("");
      setBookingTime("");
      setPersons(1);
      setNotes("");
    } catch (err: unknown) {
      setBookingError(
        err instanceof Error ? err.message : "Erreur lors de la réservation",
      );
    }
    setBookingLoading(false);
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-muted">Chargement...</div>
      </div>
    );
  }

  if (!provider) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <p className="text-muted">Prestataire non trouvé</p>
        <Link
          href="/bien-etre"
          className="text-emerald-600 text-sm hover:underline"
        >
          Retour au catalogue
        </Link>
      </div>
    );
  }

  const timeSlots = getTimeSlots();
  const certs = parseCerts(provider.certifications);

  return (
    <div className="min-h-screen px-4 py-12">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <Link
          href="/bien-etre"
          className="inline-flex items-center gap-2 text-sm text-muted hover:text-foreground transition mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Retour au catalogue
        </Link>

        {/* Booking success */}
        {bookingSuccess && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-600 text-sm rounded-lg px-4 py-3 mb-6 flex items-center gap-2">
            <Check className="w-4 h-4" />
            Réservation créée avec succès ! Consultez vos rendez-vous pour le
            suivi.
          </div>
        )}

        {/* Provider card */}
        <div className="bg-white/90 border border-border rounded-2xl overflow-hidden mb-8">
          {/* Image */}
          <div className="h-64 bg-surface-2 flex items-center justify-center relative">
            {provider.image_url ? (
              <img
                src={provider.image_url}
                alt={provider.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <Sparkles className="w-16 h-16 text-muted/60" />
            )}
            {provider.is_verified && (
              <span className="absolute top-4 right-4 bg-emerald-500/90 text-white text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1">
                <BadgeCheck className="w-4 h-4" />
                Certifié & vérifié
              </span>
            )}
          </div>

          <div className="p-6">
            <div className="flex items-start justify-between gap-4 mb-3">
              <div>
                <h1 className="text-2xl font-bold">{provider.name}</h1>
                <span className="text-sm text-muted capitalize">
                  {provider.category.replace("_", " ")}
                </span>
              </div>
              {provider.rating > 0 && (
                <div className="flex items-center gap-1.5 text-yellow-600">
                  <Star className="w-5 h-5 fill-yellow-400" />
                  <span className="text-lg font-bold">
                    {provider.rating.toFixed(1)}
                  </span>
                  <span className="text-xs text-muted">
                    ({provider.review_count} avis)
                  </span>
                </div>
              )}
            </div>

            <p className="text-foreground text-sm leading-relaxed mb-4">
              {provider.description}
            </p>

            {/* Badges */}
            <div className="flex flex-wrap gap-2 mb-4">
              {provider.mobile_service && (
                <span className="inline-flex items-center gap-1 text-xs bg-violet-50 text-violet-600 border border-violet-200 px-2.5 py-1 rounded-full">
                  <MapPin className="w-3 h-3" />
                  Se déplace à domicile
                </span>
              )}
              {certs.map((cert, i) => (
                <span
                  key={i}
                  className="text-xs bg-surface-2 text-muted px-2.5 py-1 rounded-full"
                >
                  {cert}
                </span>
              ))}
            </div>

            {/* Contact info */}
            <div className="flex flex-wrap items-center gap-4 text-sm text-muted">
              {provider.address && (
                <span className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5" />
                  {provider.address}, {provider.city}
                </span>
              )}
              {provider.phone && (
                <span className="flex items-center gap-1">
                  <Phone className="w-3.5 h-3.5" />
                  {provider.phone}
                </span>
              )}
              {provider.website && (
                <a
                  href={provider.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-emerald-600 hover:text-emerald-300 transition"
                >
                  <Globe className="w-3.5 h-3.5" />
                  Site web
                </a>
              )}
            </div>

            {/* Availability schedule */}
            {provider.availabilities && provider.availabilities.length > 0 && (
              <div className="mt-4 pt-4 border-t border-border">
                <h3 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-emerald-600" />
                  Horaires
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {provider.availabilities
                    .sort((a, b) => a.day_of_week - b.day_of_week)
                    .map((a) => (
                      <div
                        key={a.id}
                        className="text-xs text-muted bg-surface rounded-lg px-3 py-2"
                      >
                        <span className="font-medium text-foreground">
                          {dayNames[a.day_of_week]}
                        </span>
                        <br />
                        {a.start_time} - {a.end_time}
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Services */}
        <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-emerald-600" />
          Prestations
        </h2>

        <div className="grid sm:grid-cols-2 gap-4 mb-8">
          {provider.services?.map((service) => (
            <div
              key={service.id}
              className={`bg-white/90 border rounded-xl p-5 transition cursor-pointer ${
                selectedService?.id === service.id
                  ? "border-emerald-500/50 bg-emerald-500/5"
                  : "border-border hover:border-emerald-500/30"
              }`}
              onClick={() =>
                setSelectedService(
                  selectedService?.id === service.id ? null : service,
                )
              }
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <h3 className="font-semibold text-sm">{service.name}</h3>
                <span className="text-lg font-bold text-emerald-600 shrink-0">
                  {Math.round(service.price)} FCFA
                </span>
              </div>
              <p className="text-muted text-xs leading-relaxed mb-3">
                {service.description}
              </p>
              <div className="flex items-center gap-3 text-xs text-muted">
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {service.duration} min
                </span>
                {service.is_duo && (
                  <span className="flex items-center gap-1 text-pink-600">
                    <Users className="w-3 h-3" />
                    Duo possible
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Booking form */}
        {selectedService && user && (
          <div className="bg-white/90 border border-emerald-200 rounded-2xl p-6 mb-8">
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-emerald-600" />
              Réserver : {selectedService.name}
            </h3>

            {bookingError && (
              <div className="bg-red-50 border border-red-200 text-red-400 text-sm rounded-lg px-4 py-3 mb-4">
                {bookingError}
              </div>
            )}

            <div className="grid sm:grid-cols-2 gap-4 mb-4">
              {/* Date */}
              <div>
                <label
                  htmlFor="booking-date"
                  className="block text-xs text-muted mb-1.5"
                >
                  Date
                </label>
                <input
                  id="booking-date"
                  type="date"
                  min={minDate}
                  value={bookingDate}
                  onChange={(e) => {
                    setBookingDate(e.target.value);
                    setBookingTime("");
                  }}
                  className="w-full px-3 py-2.5 bg-surface-2 border border-border rounded-lg text-sm text-foreground focus:outline-none focus:border-emerald-500/50 transition"
                />
              </div>

              {/* Time */}
              <div>
                <label
                  htmlFor="booking-time"
                  className="block text-xs text-muted mb-1.5"
                >
                  Heure
                </label>
                {timeSlots.length > 0 ? (
                  <select
                    id="booking-time"
                    value={bookingTime}
                    onChange={(e) => setBookingTime(e.target.value)}
                    className="w-full px-3 py-2.5 bg-surface-2 border border-border rounded-lg text-sm text-foreground focus:outline-none focus:border-emerald-500/50 transition"
                  >
                    <option value="">Choisir un créneau</option>
                    {timeSlots.map((slot) => (
                      <option key={slot} value={slot}>
                        {slot}
                      </option>
                    ))}
                  </select>
                ) : (
                  <p className="text-muted text-xs px-3 py-2.5">
                    {bookingDate
                      ? "Aucun créneau disponible ce jour"
                      : "Sélectionnez une date"}
                  </p>
                )}
              </div>
            </div>

            {/* Persons (duo) */}
            {selectedService.is_duo && (
              <div className="mb-4">
                <label className="block text-xs text-muted mb-1.5">
                  Nombre de personnes
                </label>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setPersons(1);
                      setGuestId(undefined);
                    }}
                    className={`px-4 py-2 rounded-lg text-sm transition ${
                      persons === 1
                        ? "bg-emerald-500/20 text-emerald-600 border border-emerald-500/30"
                        : "bg-surface-2 text-muted border border-border"
                    }`}
                  >
                    Solo
                  </button>
                  <button
                    onClick={() => setPersons(2)}
                    className={`px-4 py-2 rounded-lg text-sm transition flex items-center gap-1.5 ${
                      persons === 2
                        ? "bg-pink-500/20 text-pink-600 border border-pink-500/30"
                        : "bg-surface-2 text-muted border border-border"
                    }`}
                  >
                    <Users className="w-3.5 h-3.5" />
                    Duo ({Math.round(selectedService.price * 2)} FCFA)
                  </button>
                </div>

                {/* Guest selection */}
                {persons === 2 && matches.length > 0 && (
                  <div className="mt-3">
                    <label
                      htmlFor="guest-select"
                      className="block text-xs text-muted mb-1.5"
                    >
                      Inviter un match (optionnel)
                    </label>
                    <select
                      id="guest-select"
                      value={guestId || ""}
                      onChange={(e) =>
                        setGuestId(
                          e.target.value ? Number(e.target.value) : undefined,
                        )
                      }
                      className="w-full px-3 py-2.5 bg-surface-2 border border-border rounded-lg text-sm text-foreground focus:outline-none focus:border-pink-300 transition"
                    >
                      <option value="">Aucun invité</option>
                      {matches.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.username}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            )}

            {/* Notes */}
            <div className="mb-4">
              <label className="block text-xs text-muted mb-1.5">
                Notes (optionnel)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Allergies, préférences particulières..."
                rows={2}
                className="w-full px-3 py-2.5 bg-surface-2 border border-border rounded-lg text-sm text-foreground placeholder-gray-400 focus:outline-none focus:border-emerald-500/50 transition resize-none"
              />
            </div>

            {/* Summary & submit */}
            <div className="flex items-center justify-between pt-4 border-t border-border">
              <div>
                <span className="text-muted text-sm">Total :</span>
                <span className="text-xl font-bold text-white ml-2">
                  {Math.round(selectedService.price * persons)} FCFA
                </span>
              </div>
              <button
                onClick={handleBooking}
                disabled={!bookingDate || !bookingTime || bookingLoading}
                className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-semibold px-6 py-3 rounded-lg transition text-sm"
              >
                <Send className="w-4 h-4" />
                {bookingLoading ? "Réservation..." : "Réserver"}
              </button>
            </div>
          </div>
        )}

        {/* Not logged in */}
        {selectedService && !user && (
          <div className="bg-white/90 border border-border rounded-2xl p-6 mb-8 text-center">
            <p className="text-muted text-sm mb-3">
              Connectez-vous pour réserver une prestation.
            </p>
            <Link
              href="/login"
              className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-6 py-3 rounded-lg transition text-sm"
            >
              Se connecter
            </Link>
          </div>
        )}

        {/* Reviews */}
        <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
          <Star className="w-5 h-5 text-yellow-600" />
          Avis ({reviews.length})
        </h2>

        {reviews.length === 0 ? (
          <p className="text-muted text-sm">Aucun avis pour le moment.</p>
        ) : (
          <div className="space-y-4">
            {reviews.map((review) => (
              <div
                key={review.id}
                className="bg-white/90 border border-border rounded-xl p-4"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-surface-2 flex items-center justify-center overflow-hidden">
                      {review.user?.avatar_url ? (
                        <img
                          src={review.user.avatar_url}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-xs text-muted">
                          {review.user?.username?.[0]?.toUpperCase() || "?"}
                        </span>
                      )}
                    </div>
                    <span className="text-sm font-medium">
                      {review.user?.username}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        className={`w-3.5 h-3.5 ${
                          i < review.rating
                            ? "text-yellow-600 fill-yellow-400"
                            : "text-foreground"
                        }`}
                      />
                    ))}
                  </div>
                </div>
                <p className="text-muted text-sm">{review.comment}</p>
                <p className="text-muted/60 text-xs mt-2">
                  {new Date(review.created_at).toLocaleDateString("fr-FR")}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Payment Modal for booking fee */}
      <OMPaymentModal
        open={showPaymentModal}
        onClose={() => {
          setShowPaymentModal(false);
          setBookingSuccess(true);
          setTimeout(() => setBookingSuccess(false), 5000);
        }}
        onSuccess={() => {
          setShowPaymentModal(false);
          setBookingSuccess(true);
          setTimeout(() => setBookingSuccess(false), 5000);
        }}
        title="Paiement rendez-vous"
        description="Frais de prise de rendez-vous bien-être : 500 FCFA par Orange Money."
        amount={500}
        initiatePayment={() => initiateBookingPayment(pendingBookingId!)}
        confirmPayment={(paymentId, phone, otp) =>
          confirmBookingPayment(paymentId, phone, otp)
        }
      />
    </div>
  );
}
