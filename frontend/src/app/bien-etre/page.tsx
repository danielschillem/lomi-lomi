"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Sparkles,
  MapPin,
  Star,
  Phone,
  Home,
  Search,
  Filter,
  Clock,
  Users,
  BadgeCheck,
} from "lucide-react";
import { getWellnessProviders } from "@/lib/api";

interface WellnessService {
  id: number;
  name: string;
  duration: number;
  price: number;
  is_duo: boolean;
  category: string;
}

interface Provider {
  id: number;
  name: string;
  description: string;
  category: string;
  image_url: string;
  phone: string;
  address: string;
  city: string;
  rating: number;
  review_count: number;
  mobile_service: boolean;
  is_verified: boolean;
  services: WellnessService[];
}

const categories = [
  { value: "", label: "Tous", icon: Sparkles },
  { value: "spa", label: "Spa & Hammam", icon: Sparkles },
  { value: "massage_salon", label: "Massage en salon", icon: Home },
  { value: "massage_home", label: "Massage à domicile", icon: MapPin },
  { value: "aesthetics", label: "Soins esthétiques", icon: Star },
  { value: "yoga", label: "Yoga & Méditation", icon: Users },
  { value: "coaching", label: "Coaching bien-être", icon: BadgeCheck },
];

export default function WellnessPage() {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState("");
  const [city, setCity] = useState("");
  const [mobileOnly, setMobileOnly] = useState(false);

  useEffect(() => {
    setLoading(true);
    getWellnessProviders({
      category: category || undefined,
      city: city || undefined,
      mobile: mobileOnly || undefined,
    })
      .then((res) => setProviders(res as unknown as Provider[]))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [category, city, mobileOnly]);

  const minPrice = (services: WellnessService[]) => {
    if (!services || services.length === 0) return null;
    return Math.min(...services.map((s) => s.price));
  };

  return (
    <div className="min-h-screen px-4 py-12">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-white transition"
          >
            <ArrowLeft className="w-4 h-4" />
            Accueil
          </Link>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-emerald-400" />
            Bien-être
          </h1>
          <Link
            href="/bien-etre/reservations"
            className="inline-flex items-center gap-1.5 text-sm text-zinc-400 hover:text-white transition"
          >
            <Clock className="w-4 h-4" />
            Mes RDV
          </Link>
        </div>

        {/* Search & Filters */}
        <div className="mb-6 space-y-4">
          {/* City search */}
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <input
              type="text"
              placeholder="Rechercher par ville..."
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500/50 transition"
            />
          </div>

          {/* Category filters */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2">
            <Filter className="w-4 h-4 text-zinc-500 shrink-0" />
            {categories.map((cat) => {
              const Icon = cat.icon;
              return (
                <button
                  key={cat.value}
                  onClick={() => setCategory(cat.value)}
                  className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-medium transition whitespace-nowrap ${
                    category === cat.value
                      ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                      : "bg-zinc-900 text-zinc-400 border border-zinc-800 hover:border-zinc-700"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {cat.label}
                </button>
              );
            })}
          </div>

          {/* Mobile filter */}
          <label className="inline-flex items-center gap-2 text-sm text-zinc-400 cursor-pointer">
            <input
              type="checkbox"
              checked={mobileOnly}
              onChange={(e) => setMobileOnly(e.target.checked)}
              className="rounded border-zinc-700 bg-zinc-900 text-emerald-500 focus:ring-emerald-500/20"
            />
            <MapPin className="w-3.5 h-3.5" />
            À domicile uniquement
          </label>
        </div>

        {/* Providers Grid */}
        {loading ? (
          <div className="text-center py-12 text-zinc-400 animate-pulse">
            Chargement des prestataires...
          </div>
        ) : providers.length === 0 ? (
          <div className="text-center py-12">
            <Sparkles className="w-16 h-16 text-zinc-600 mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">Aucun prestataire</h2>
            <p className="text-zinc-400 text-sm">
              Les prestataires bien-être seront bientôt disponibles.
            </p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {providers.map((provider) => (
              <Link
                key={provider.id}
                href={`/bien-etre/${provider.id}`}
                className="bg-zinc-900/60 border border-zinc-800 rounded-2xl overflow-hidden hover:border-emerald-500/30 transition group"
              >
                {/* Image */}
                <div className="h-48 bg-zinc-800 flex items-center justify-center relative">
                  {provider.image_url ? (
                    <img
                      src={provider.image_url}
                      alt={provider.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <Sparkles className="w-12 h-12 text-zinc-600" />
                  )}
                  {provider.is_verified && (
                    <span className="absolute top-3 right-3 bg-emerald-500/90 text-white text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                      <BadgeCheck className="w-3 h-3" />
                      Vérifié
                    </span>
                  )}
                  {provider.mobile_service && (
                    <span className="absolute top-3 left-3 bg-violet-500/90 text-white text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      À domicile
                    </span>
                  )}
                </div>

                {/* Info */}
                <div className="p-5">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <h3 className="font-semibold text-sm group-hover:text-emerald-400 transition truncate">
                      {provider.name}
                    </h3>
                    {provider.rating > 0 && (
                      <span className="shrink-0 flex items-center gap-1 text-xs text-yellow-400">
                        <Star className="w-3.5 h-3.5 fill-yellow-400" />
                        {provider.rating.toFixed(1)}
                        <span className="text-zinc-500">
                          ({provider.review_count})
                        </span>
                      </span>
                    )}
                  </div>

                  <span className="text-xs text-zinc-500 capitalize">
                    {categories.find((c) => c.value === provider.category)
                      ?.label || provider.category}
                  </span>

                  <p className="text-zinc-400 text-xs mt-2 line-clamp-2 leading-relaxed">
                    {provider.description}
                  </p>

                  {provider.city && (
                    <p className="text-zinc-500 text-xs mt-2 flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      {provider.city}
                    </p>
                  )}

                  {/* Services preview */}
                  <div className="mt-3 pt-3 border-t border-zinc-800 flex items-center justify-between">
                    <span className="text-xs text-zinc-500">
                      {provider.services?.length || 0} service
                      {(provider.services?.length || 0) > 1 ? "s" : ""}
                    </span>
                    {minPrice(provider.services) !== null && (
                      <span className="text-sm font-bold text-emerald-400">
                        À partir de {minPrice(provider.services)?.toFixed(2)}€
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
