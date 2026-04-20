"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Sparkles,
  Plus,
  Edit,
  Trash2,
  X,
  Search,
  Clock,
  Calendar,
  Check,
  AlertCircle,
  MapPin,
  Users,
} from "lucide-react";
import {
  getWellnessProviders,
  adminCreateProvider,
  adminUpdateProvider,
  adminDeleteProvider,
  adminCreateWellnessService,
  adminUpdateWellnessService,
  adminDeleteWellnessService,
  adminSetProviderAvailability,
  adminListWellnessBookings,
  adminUpdateWellnessBookingStatus,
} from "@/lib/api";

interface WellnessService {
  id: number;
  name: string;
  description: string;
  duration: number;
  price: number;
  category: string;
  is_duo: boolean;
  is_active: boolean;
  provider_id: number;
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
  is_active: boolean;
  services: WellnessService[];
  availabilities: Availability[];
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
  user: { id: number; username: string; email: string };
  service: { id: number; name: string };
  provider: { id: number; name: string };
}

const dayNames = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];

const providerCategories = [
  "spa",
  "massage_salon",
  "massage_home",
  "aesthetics",
  "yoga",
  "coaching",
];

export default function AdminWellnessPage() {
  const [tab, setTab] = useState<"providers" | "bookings">("providers");

  // Providers
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loadingProviders, setLoadingProviders] = useState(true);

  // Provider modal
  const [showProviderModal, setShowProviderModal] = useState(false);
  const [editProvider, setEditProvider] = useState<Provider | null>(null);
  const [providerForm, setProviderForm] = useState({
    name: "",
    description: "",
    category: "spa",
    image_url: "",
    phone: "",
    email: "",
    website: "",
    address: "",
    city: "",
    latitude: 0,
    longitude: 0,
    certifications: "",
    mobile_service: false,
    is_verified: false,
    is_active: true,
  });

  // Service modal
  const [showServiceModal, setShowServiceModal] = useState(false);
  const [editService, setEditService] = useState<WellnessService | null>(null);
  const [serviceProviderId, setServiceProviderId] = useState<number>(0);
  const [serviceForm, setServiceForm] = useState({
    name: "",
    description: "",
    duration: 60,
    price: 0,
    category: "",
    is_duo: false,
    is_active: true,
  });

  // Availability modal
  const [showAvailModal, setShowAvailModal] = useState(false);
  const [availProviderId, setAvailProviderId] = useState<number>(0);
  const [availSlots, setAvailSlots] = useState<
    { day_of_week: number; start_time: string; end_time: string }[]
  >([]);

  // Bookings
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [bookingsTotal, setBookingsTotal] = useState(0);
  const [bookingsPage, setBookingsPage] = useState(1);
  const [bookingsStatus, setBookingsStatus] = useState("");
  const [loadingBookings, setLoadingBookings] = useState(false);

  const loadProviders = useCallback(async () => {
    setLoadingProviders(true);
    try {
      const res = await getWellnessProviders();
      setProviders(res as unknown as Provider[]);
    } catch {
      /* ignore */
    }
    setLoadingProviders(false);
  }, []);

  const loadBookings = useCallback(async () => {
    setLoadingBookings(true);
    try {
      const res = await adminListWellnessBookings(bookingsPage, bookingsStatus);
      setBookings(res.bookings as unknown as Booking[]);
      setBookingsTotal(res.total);
    } catch {
      /* ignore */
    }
    setLoadingBookings(false);
  }, [bookingsPage, bookingsStatus]);

  useEffect(() => {
    loadProviders();
  }, [loadProviders]);

  useEffect(() => {
    if (tab === "bookings") loadBookings();
  }, [tab, loadBookings]);

  // Provider CRUD
  function openNewProvider() {
    setEditProvider(null);
    setProviderForm({
      name: "",
      description: "",
      category: "spa",
      image_url: "",
      phone: "",
      email: "",
      website: "",
      address: "",
      city: "",
      latitude: 0,
      longitude: 0,
      certifications: "",
      mobile_service: false,
      is_verified: false,
      is_active: true,
    });
    setShowProviderModal(true);
  }

  function openEditProvider(p: Provider) {
    setEditProvider(p);
    setProviderForm({
      name: p.name,
      description: p.description,
      category: p.category,
      image_url: p.image_url,
      phone: p.phone,
      email: p.email,
      website: p.website,
      address: p.address,
      city: p.city,
      latitude: p.latitude,
      longitude: p.longitude,
      certifications: p.certifications,
      mobile_service: p.mobile_service,
      is_verified: p.is_verified,
      is_active: p.is_active,
    });
    setShowProviderModal(true);
  }

  async function saveProvider() {
    try {
      if (editProvider) {
        await adminUpdateProvider(editProvider.id, providerForm);
      } else {
        await adminCreateProvider(providerForm);
      }
      setShowProviderModal(false);
      loadProviders();
    } catch {
      /* ignore */
    }
  }

  async function deleteProvider(id: number) {
    if (!confirm("Supprimer ce prestataire ?")) return;
    try {
      await adminDeleteProvider(id);
      loadProviders();
    } catch {
      /* ignore */
    }
  }

  // Service CRUD
  function openNewService(providerId: number) {
    setEditService(null);
    setServiceProviderId(providerId);
    setServiceForm({
      name: "",
      description: "",
      duration: 60,
      price: 0,
      category: "",
      is_duo: false,
      is_active: true,
    });
    setShowServiceModal(true);
  }

  function openEditService(s: WellnessService) {
    setEditService(s);
    setServiceProviderId(s.provider_id);
    setServiceForm({
      name: s.name,
      description: s.description,
      duration: s.duration,
      price: s.price,
      category: s.category,
      is_duo: s.is_duo,
      is_active: s.is_active,
    });
    setShowServiceModal(true);
  }

  async function saveService() {
    try {
      if (editService) {
        await adminUpdateWellnessService(editService.id, serviceForm);
      } else {
        await adminCreateWellnessService({
          ...serviceForm,
          provider_id: serviceProviderId,
        });
      }
      setShowServiceModal(false);
      loadProviders();
    } catch {
      /* ignore */
    }
  }

  async function deleteService(id: number) {
    if (!confirm("Supprimer ce service ?")) return;
    try {
      await adminDeleteWellnessService(id);
      loadProviders();
    } catch {
      /* ignore */
    }
  }

  // Availability
  function openAvailability(p: Provider) {
    setAvailProviderId(p.id);
    setAvailSlots(
      (p.availabilities || []).map((a) => ({
        day_of_week: a.day_of_week,
        start_time: a.start_time,
        end_time: a.end_time,
      })),
    );
    setShowAvailModal(true);
  }

  async function saveAvailability() {
    try {
      await adminSetProviderAvailability(availProviderId, availSlots);
      setShowAvailModal(false);
      loadProviders();
    } catch {
      /* ignore */
    }
  }

  // Booking status update
  async function updateBookingStatus(id: number, status: string) {
    try {
      await adminUpdateWellnessBookingStatus(id, status);
      loadBookings();
    } catch {
      /* ignore */
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Sparkles className="w-6 h-6 text-emerald-400" />
          Bien-être
        </h1>
        <div className="flex gap-2">
          <button
            onClick={() => setTab("providers")}
            className={`px-4 py-2 rounded-lg text-sm transition ${
              tab === "providers"
                ? "bg-emerald-500/20 text-emerald-400"
                : "bg-zinc-800 text-zinc-400 hover:text-white"
            }`}
          >
            Prestataires
          </button>
          <button
            onClick={() => setTab("bookings")}
            className={`px-4 py-2 rounded-lg text-sm transition ${
              tab === "bookings"
                ? "bg-emerald-500/20 text-emerald-400"
                : "bg-zinc-800 text-zinc-400 hover:text-white"
            }`}
          >
            Réservations
          </button>
        </div>
      </div>

      {/* ========== PROVIDERS TAB ========== */}
      {tab === "providers" && (
        <>
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-zinc-500">
              {providers.length} prestataire{providers.length > 1 ? "s" : ""}
            </p>
            <button
              onClick={openNewProvider}
              className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition"
            >
              <Plus className="w-4 h-4" />
              Ajouter
            </button>
          </div>

          {loadingProviders ? (
            <div className="text-zinc-400 text-sm animate-pulse py-8 text-center">
              Chargement...
            </div>
          ) : (
            <div className="space-y-4">
              {providers.map((p) => (
                <div
                  key={p.id}
                  className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-5"
                >
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div>
                      <h3 className="font-semibold flex items-center gap-2">
                        {p.name}
                        {!p.is_active && (
                          <span className="text-xs text-red-400">
                            (inactif)
                          </span>
                        )}
                        {p.is_verified && (
                          <span className="text-xs text-emerald-400">
                            ✓ Vérifié
                          </span>
                        )}
                      </h3>
                      <span className="text-xs text-zinc-500 capitalize">
                        {p.category.replace("_", " ")} — {p.city || "Ville N/A"}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => openAvailability(p)}
                        className="text-zinc-500 hover:text-emerald-400 transition"
                        title="Horaires"
                      >
                        <Clock className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => openNewService(p.id)}
                        className="text-zinc-500 hover:text-emerald-400 transition"
                        title="Ajouter service"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => openEditProvider(p)}
                        className="text-zinc-500 hover:text-blue-400 transition"
                        title="Modifier"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => deleteProvider(p.id)}
                        className="text-zinc-500 hover:text-red-400 transition"
                        title="Supprimer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Services list */}
                  {p.services && p.services.length > 0 && (
                    <div className="mt-3 space-y-2">
                      {p.services.map((s) => (
                        <div
                          key={s.id}
                          className="flex items-center justify-between bg-zinc-800/50 rounded-lg px-3 py-2"
                        >
                          <div>
                            <span className="text-sm">{s.name}</span>
                            <span className="text-xs text-zinc-500 ml-2">
                              {s.duration}min — {s.price.toFixed(2)}€
                              {s.is_duo ? " (duo)" : ""}
                            </span>
                          </div>
                          <div className="flex gap-1.5">
                            <button
                              onClick={() => openEditService(s)}
                              className="text-zinc-500 hover:text-blue-400 transition"
                              title="Modifier service"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => deleteService(s.id)}
                              className="text-zinc-500 hover:text-red-400 transition"
                              title="Supprimer service"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Availability preview */}
                  {p.availabilities && p.availabilities.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {p.availabilities
                        .sort((a, b) => a.day_of_week - b.day_of_week)
                        .map((a, i) => (
                          <span
                            key={i}
                            className="text-[10px] bg-zinc-800 text-zinc-500 px-2 py-0.5 rounded"
                          >
                            {dayNames[a.day_of_week]} {a.start_time}-
                            {a.end_time}
                          </span>
                        ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* ========== BOOKINGS TAB ========== */}
      {tab === "bookings" && (
        <>
          <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-2">
            {["", "pending", "confirmed", "completed", "canceled"].map((s) => (
              <button
                key={s}
                onClick={() => {
                  setBookingsStatus(s);
                  setBookingsPage(1);
                }}
                className={`px-3 py-1.5 rounded-full text-xs transition whitespace-nowrap ${
                  bookingsStatus === s
                    ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                    : "bg-zinc-900 text-zinc-400 border border-zinc-800"
                }`}
              >
                {s === ""
                  ? "Toutes"
                  : s === "pending"
                    ? "En attente"
                    : s === "confirmed"
                      ? "Confirmées"
                      : s === "completed"
                        ? "Terminées"
                        : "Annulées"}
              </button>
            ))}
          </div>

          {loadingBookings ? (
            <div className="text-zinc-400 text-sm animate-pulse py-8 text-center">
              Chargement...
            </div>
          ) : bookings.length === 0 ? (
            <p className="text-zinc-500 text-sm py-8 text-center">
              Aucune réservation.
            </p>
          ) : (
            <div className="space-y-3">
              {bookings.map((b) => (
                <div
                  key={b.id}
                  className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-4"
                >
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div>
                      <span className="text-sm font-semibold">
                        {b.service?.name}
                      </span>
                      <span className="text-xs text-zinc-500 ml-2">
                        #{b.id}
                      </span>
                      <br />
                      <span className="text-xs text-zinc-500">
                        par {b.user?.username} — {b.provider?.name}
                      </span>
                    </div>
                    <span
                      className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                        b.status === "confirmed"
                          ? "bg-emerald-500/10 text-emerald-400"
                          : b.status === "completed"
                            ? "bg-blue-500/10 text-blue-400"
                            : b.status === "canceled"
                              ? "bg-red-500/10 text-red-400"
                              : "bg-amber-500/10 text-amber-400"
                      }`}
                    >
                      {b.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-zinc-400 mb-3">
                    <span>{new Date(b.date).toLocaleDateString("fr-FR")}</span>
                    <span>
                      {b.start_time} — {b.end_time}
                    </span>
                    <span>{b.persons === 2 ? "Duo" : "Solo"}</span>
                    <span className="font-medium text-white">
                      {b.total_price.toFixed(2)}€
                    </span>
                  </div>
                  <div className="flex gap-2">
                    {b.status === "pending" && (
                      <button
                        onClick={() => updateBookingStatus(b.id, "confirmed")}
                        className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-lg transition"
                      >
                        Confirmer
                      </button>
                    )}
                    {(b.status === "pending" || b.status === "confirmed") && (
                      <>
                        <button
                          onClick={() => updateBookingStatus(b.id, "completed")}
                          className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg transition"
                        >
                          Terminé
                        </button>
                        <button
                          onClick={() => updateBookingStatus(b.id, "canceled")}
                          className="text-xs bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded-lg transition"
                        >
                          Annuler
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
              {/* Pagination */}
              <div className="flex items-center justify-center gap-3 pt-4">
                <button
                  onClick={() => setBookingsPage((p) => Math.max(1, p - 1))}
                  disabled={bookingsPage === 1}
                  className="text-xs text-zinc-500 hover:text-white disabled:opacity-30 transition"
                >
                  ← Précédent
                </button>
                <span className="text-xs text-zinc-500">
                  Page {bookingsPage}
                </span>
                <button
                  onClick={() => setBookingsPage((p) => p + 1)}
                  disabled={bookings.length < 20}
                  className="text-xs text-zinc-500 hover:text-white disabled:opacity-30 transition"
                >
                  Suivant →
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* ========== PROVIDER MODAL ========== */}
      {showProviderModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-zinc-950/80"
            onClick={() => setShowProviderModal(false)}
          />
          <div className="relative bg-zinc-900 border border-zinc-800 rounded-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setShowProviderModal(false)}
              className="absolute top-4 right-4 text-zinc-500 hover:text-white"
              title="Fermer"
            >
              <X className="w-5 h-5" />
            </button>
            <h2 className="text-lg font-bold mb-4">
              {editProvider ? "Modifier" : "Nouveau"} prestataire
            </h2>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label
                  htmlFor="provider-name"
                  className="block text-xs text-zinc-500 mb-1"
                >
                  Nom
                </label>
                <input
                  id="provider-name"
                  value={providerForm.name}
                  onChange={(e) =>
                    setProviderForm({ ...providerForm, name: e.target.value })
                  }
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-white"
                />
              </div>
              <div className="col-span-2">
                <label
                  htmlFor="provider-desc"
                  className="block text-xs text-zinc-500 mb-1"
                >
                  Description
                </label>
                <textarea
                  id="provider-desc"
                  value={providerForm.description}
                  onChange={(e) =>
                    setProviderForm({
                      ...providerForm,
                      description: e.target.value,
                    })
                  }
                  rows={2}
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-white resize-none"
                />
              </div>
              <div>
                <label
                  htmlFor="provider-category"
                  className="block text-xs text-zinc-500 mb-1"
                >
                  Catégorie
                </label>
                <select
                  id="provider-category"
                  value={providerForm.category}
                  onChange={(e) =>
                    setProviderForm({
                      ...providerForm,
                      category: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-white"
                >
                  {providerCategories.map((c) => (
                    <option key={c} value={c}>
                      {c.replace("_", " ")}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label
                  htmlFor="provider-city"
                  className="block text-xs text-zinc-500 mb-1"
                >
                  Ville
                </label>
                <input
                  id="provider-city"
                  value={providerForm.city}
                  onChange={(e) =>
                    setProviderForm({ ...providerForm, city: e.target.value })
                  }
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-white"
                />
              </div>
              <div className="col-span-2">
                <label
                  htmlFor="provider-address"
                  className="block text-xs text-zinc-500 mb-1"
                >
                  Adresse
                </label>
                <input
                  id="provider-address"
                  value={providerForm.address}
                  onChange={(e) =>
                    setProviderForm({
                      ...providerForm,
                      address: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-white"
                />
              </div>
              <div>
                <label
                  htmlFor="provider-phone"
                  className="block text-xs text-zinc-500 mb-1"
                >
                  Téléphone
                </label>
                <input
                  id="provider-phone"
                  value={providerForm.phone}
                  onChange={(e) =>
                    setProviderForm({ ...providerForm, phone: e.target.value })
                  }
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-white"
                />
              </div>
              <div>
                <label
                  htmlFor="provider-email"
                  className="block text-xs text-zinc-500 mb-1"
                >
                  Email
                </label>
                <input
                  id="provider-email"
                  type="email"
                  value={providerForm.email}
                  onChange={(e) =>
                    setProviderForm({ ...providerForm, email: e.target.value })
                  }
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-white"
                />
              </div>
              <div>
                <label
                  htmlFor="provider-website"
                  className="block text-xs text-zinc-500 mb-1"
                >
                  Site web
                </label>
                <input
                  id="provider-website"
                  value={providerForm.website}
                  onChange={(e) =>
                    setProviderForm({
                      ...providerForm,
                      website: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-white"
                />
              </div>
              <div>
                <label
                  htmlFor="provider-image"
                  className="block text-xs text-zinc-500 mb-1"
                >
                  Image URL
                </label>
                <input
                  id="provider-image"
                  value={providerForm.image_url}
                  onChange={(e) =>
                    setProviderForm({
                      ...providerForm,
                      image_url: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-white"
                />
              </div>
              <div>
                <label
                  htmlFor="provider-lat"
                  className="block text-xs text-zinc-500 mb-1"
                >
                  Latitude
                </label>
                <input
                  id="provider-lat"
                  type="number"
                  step="any"
                  value={providerForm.latitude || ""}
                  onChange={(e) =>
                    setProviderForm({
                      ...providerForm,
                      latitude: parseFloat(e.target.value) || 0,
                    })
                  }
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-white"
                />
              </div>
              <div>
                <label
                  htmlFor="provider-lng"
                  className="block text-xs text-zinc-500 mb-1"
                >
                  Longitude
                </label>
                <input
                  id="provider-lng"
                  type="number"
                  step="any"
                  value={providerForm.longitude || ""}
                  onChange={(e) =>
                    setProviderForm({
                      ...providerForm,
                      longitude: parseFloat(e.target.value) || 0,
                    })
                  }
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-white"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-xs text-zinc-500 mb-1">
                  Certifications (séparées par des virgules)
                </label>
                <input
                  value={providerForm.certifications}
                  onChange={(e) =>
                    setProviderForm({
                      ...providerForm,
                      certifications: e.target.value,
                    })
                  }
                  placeholder="RNCP, FFMBE, ..."
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-white"
                />
              </div>
              <label className="flex items-center gap-2 text-sm text-zinc-400 cursor-pointer">
                <input
                  type="checkbox"
                  checked={providerForm.mobile_service}
                  onChange={(e) =>
                    setProviderForm({
                      ...providerForm,
                      mobile_service: e.target.checked,
                    })
                  }
                  className="rounded border-zinc-700 bg-zinc-900 text-emerald-500"
                />
                À domicile
              </label>
              <label className="flex items-center gap-2 text-sm text-zinc-400 cursor-pointer">
                <input
                  type="checkbox"
                  checked={providerForm.is_verified}
                  onChange={(e) =>
                    setProviderForm({
                      ...providerForm,
                      is_verified: e.target.checked,
                    })
                  }
                  className="rounded border-zinc-700 bg-zinc-900 text-emerald-500"
                />
                Vérifié
              </label>
              <label className="flex items-center gap-2 text-sm text-zinc-400 cursor-pointer">
                <input
                  type="checkbox"
                  checked={providerForm.is_active}
                  onChange={(e) =>
                    setProviderForm({
                      ...providerForm,
                      is_active: e.target.checked,
                    })
                  }
                  className="rounded border-zinc-700 bg-zinc-900 text-emerald-500"
                />
                Actif
              </label>
            </div>
            <button
              onClick={saveProvider}
              className="mt-4 w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2.5 rounded-lg transition text-sm"
            >
              {editProvider ? "Enregistrer" : "Créer"}
            </button>
          </div>
        </div>
      )}

      {/* ========== SERVICE MODAL ========== */}
      {showServiceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-zinc-950/80"
            onClick={() => setShowServiceModal(false)}
          />
          <div className="relative bg-zinc-900 border border-zinc-800 rounded-2xl p-6 w-full max-w-md">
            <button
              onClick={() => setShowServiceModal(false)}
              className="absolute top-4 right-4 text-zinc-500 hover:text-white"
              title="Fermer"
            >
              <X className="w-5 h-5" />
            </button>
            <h2 className="text-lg font-bold mb-4">
              {editService ? "Modifier" : "Nouveau"} service
            </h2>
            <div className="space-y-3">
              <div>
                <label
                  htmlFor="service-name"
                  className="block text-xs text-zinc-500 mb-1"
                >
                  Nom
                </label>
                <input
                  id="service-name"
                  value={serviceForm.name}
                  onChange={(e) =>
                    setServiceForm({ ...serviceForm, name: e.target.value })
                  }
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-white"
                />
              </div>
              <div>
                <label
                  htmlFor="service-desc"
                  className="block text-xs text-zinc-500 mb-1"
                >
                  Description
                </label>
                <textarea
                  id="service-desc"
                  value={serviceForm.description}
                  onChange={(e) =>
                    setServiceForm({
                      ...serviceForm,
                      description: e.target.value,
                    })
                  }
                  rows={2}
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-white resize-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label
                    htmlFor="service-duration"
                    className="block text-xs text-zinc-500 mb-1"
                  >
                    Durée (min)
                  </label>
                  <input
                    id="service-duration"
                    type="number"
                    value={serviceForm.duration}
                    onChange={(e) =>
                      setServiceForm({
                        ...serviceForm,
                        duration: parseInt(e.target.value) || 0,
                      })
                    }
                    className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-white"
                  />
                </div>
                <div>
                  <label
                    htmlFor="service-price"
                    className="block text-xs text-zinc-500 mb-1"
                  >
                    Prix (€)
                  </label>
                  <input
                    id="service-price"
                    type="number"
                    step="0.01"
                    value={serviceForm.price}
                    onChange={(e) =>
                      setServiceForm({
                        ...serviceForm,
                        price: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-white"
                  />
                </div>
              </div>
              <div>
                <label
                  htmlFor="service-category"
                  className="block text-xs text-zinc-500 mb-1"
                >
                  Catégorie
                </label>
                <input
                  id="service-category"
                  value={serviceForm.category}
                  onChange={(e) =>
                    setServiceForm({
                      ...serviceForm,
                      category: e.target.value,
                    })
                  }
                  placeholder="relaxation, hot_stones, thai..."
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-white"
                />
              </div>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 text-sm text-zinc-400 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={serviceForm.is_duo}
                    onChange={(e) =>
                      setServiceForm({
                        ...serviceForm,
                        is_duo: e.target.checked,
                      })
                    }
                    className="rounded border-zinc-700 bg-zinc-900 text-pink-500"
                  />
                  Duo possible
                </label>
                <label className="flex items-center gap-2 text-sm text-zinc-400 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={serviceForm.is_active}
                    onChange={(e) =>
                      setServiceForm({
                        ...serviceForm,
                        is_active: e.target.checked,
                      })
                    }
                    className="rounded border-zinc-700 bg-zinc-900 text-emerald-500"
                  />
                  Actif
                </label>
              </div>
            </div>
            <button
              onClick={saveService}
              className="mt-4 w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2.5 rounded-lg transition text-sm"
            >
              {editService ? "Enregistrer" : "Créer"}
            </button>
          </div>
        </div>
      )}

      {/* ========== AVAILABILITY MODAL ========== */}
      {showAvailModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-zinc-950/80"
            onClick={() => setShowAvailModal(false)}
          />
          <div className="relative bg-zinc-900 border border-zinc-800 rounded-2xl p-6 w-full max-w-md">
            <button
              onClick={() => setShowAvailModal(false)}
              className="absolute top-4 right-4 text-zinc-500 hover:text-white"
              title="Fermer"
            >
              <X className="w-5 h-5" />
            </button>
            <h2 className="text-lg font-bold mb-4">
              Horaires d&apos;ouverture
            </h2>

            <div className="space-y-2 mb-4">
              {availSlots.map((slot, i) => (
                <div key={i} className="flex items-center gap-2">
                  <select
                    title="Jour"
                    value={slot.day_of_week}
                    onChange={(e) => {
                      const updated = [...availSlots];
                      updated[i].day_of_week = parseInt(e.target.value);
                      setAvailSlots(updated);
                    }}
                    className="px-2 py-1.5 bg-zinc-800 border border-zinc-700 rounded text-xs text-white"
                  >
                    {dayNames.map((d, di) => (
                      <option key={di} value={di}>
                        {d}
                      </option>
                    ))}
                  </select>
                  <input
                    title="Heure de début"
                    type="time"
                    value={slot.start_time}
                    onChange={(e) => {
                      const updated = [...availSlots];
                      updated[i].start_time = e.target.value;
                      setAvailSlots(updated);
                    }}
                    className="px-2 py-1.5 bg-zinc-800 border border-zinc-700 rounded text-xs text-white"
                  />
                  <span className="text-zinc-500 text-xs">—</span>
                  <input
                    title="Heure de fin"
                    type="time"
                    value={slot.end_time}
                    onChange={(e) => {
                      const updated = [...availSlots];
                      updated[i].end_time = e.target.value;
                      setAvailSlots(updated);
                    }}
                    className="px-2 py-1.5 bg-zinc-800 border border-zinc-700 rounded text-xs text-white"
                  />
                  <button
                    onClick={() =>
                      setAvailSlots(availSlots.filter((_, j) => j !== i))
                    }
                    className="text-red-400 hover:text-red-300"
                    title="Supprimer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>

            <button
              onClick={() =>
                setAvailSlots([
                  ...availSlots,
                  { day_of_week: 1, start_time: "09:00", end_time: "18:00" },
                ])
              }
              className="inline-flex items-center gap-1 text-xs text-emerald-400 hover:text-emerald-300 transition mb-4"
            >
              <Plus className="w-3 h-3" />
              Ajouter un créneau
            </button>

            <button
              onClick={saveAvailability}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2.5 rounded-lg transition text-sm"
            >
              Enregistrer les horaires
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
