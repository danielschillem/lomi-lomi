"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import {
  MapPin,
  ArrowLeft,
  Filter,
  Hotel,
  UtensilsCrossed,
  Sparkles,
  Star,
  Phone,
  Globe,
} from "lucide-react";
import { getPlaces } from "@/lib/api";

const MapView = dynamic(() => import("./map-view"), { ssr: false });

interface Place {
  id: number;
  name: string;
  description: string;
  category: string;
  address: string;
  city: string;
  latitude: number;
  longitude: number;
  image_url: string;
  phone: string;
  website: string;
  rating: number;
  is_partner: boolean;
}

const categories = [
  { value: "", label: "Tous", icon: MapPin },
  { value: "hotel", label: "Hôtels", icon: Hotel },
  { value: "restaurant", label: "Restaurants", icon: UtensilsCrossed },
  { value: "loisirs", label: "Loisirs", icon: Sparkles },
];

export default function CartePage() {
  const [places, setPlaces] = useState<Place[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState("");
  const [selected, setSelected] = useState<Place | null>(null);

  useEffect(() => {
    setLoading(true);
    getPlaces(category ? { category } : undefined)
      .then((res) => setPlaces(res as unknown as Place[]))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [category]);

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="shrink-0 bg-zinc-900/80 backdrop-blur-md border-b border-zinc-800 px-4 py-3 z-20">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-white transition"
          >
            <ArrowLeft className="w-4 h-4" />
            Accueil
          </Link>
          <h1 className="text-lg font-bold flex items-center gap-2">
            <MapPin className="w-5 h-5 text-pink-500" />
            Carte interactive
          </h1>
          <div className="w-16" />
        </div>
      </header>

      {/* Filters */}
      <div className="shrink-0 bg-zinc-950 border-b border-zinc-800 px-4 py-3 z-10">
        <div className="max-w-7xl mx-auto flex items-center gap-2 overflow-x-auto">
          <Filter className="w-4 h-4 text-zinc-500 shrink-0" />
          {categories.map((cat) => {
            const Icon = cat.icon;
            return (
              <button
                key={cat.value}
                onClick={() => setCategory(cat.value)}
                className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-medium transition whitespace-nowrap ${
                  category === cat.value
                    ? "bg-pink-500/20 text-pink-400 border border-pink-500/30"
                    : "bg-zinc-900 text-zinc-400 border border-zinc-800 hover:border-zinc-700"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {cat.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Map + Sidebar */}
      <div className="flex-1 flex flex-col md:flex-row">
        {/* Map */}
        <div className="flex-1 relative min-h-[400px]">
          {loading ? (
            <div className="absolute inset-0 flex items-center justify-center bg-zinc-900">
              <div className="animate-pulse text-zinc-400">
                Chargement de la carte...
              </div>
            </div>
          ) : (
            <MapView
              places={places}
              onSelect={setSelected}
              selected={selected}
            />
          )}
        </div>

        {/* Sidebar */}
        <div className="md:w-96 shrink-0 border-t md:border-t-0 md:border-l border-zinc-800 bg-zinc-950 overflow-y-auto max-h-[50vh] md:max-h-none">
          {selected ? (
            <div className="p-6">
              <button
                onClick={() => setSelected(null)}
                className="text-xs text-zinc-500 hover:text-white transition mb-4 inline-flex items-center gap-1"
              >
                <ArrowLeft className="w-3 h-3" />
                Retour à la liste
              </button>
              <h2 className="text-xl font-bold mb-1">{selected.name}</h2>
              {selected.is_partner && (
                <span className="inline-block text-xs bg-pink-500/10 text-pink-400 border border-pink-500/20 px-2 py-0.5 rounded-full mb-3">
                  Partenaire
                </span>
              )}
              {selected.rating > 0 && (
                <div className="flex items-center gap-1 text-sm text-yellow-400 mb-3">
                  <Star className="w-4 h-4 fill-yellow-400" />
                  {selected.rating.toFixed(1)}
                </div>
              )}
              <p className="text-zinc-400 text-sm leading-relaxed mb-4">
                {selected.description || "Pas de description disponible."}
              </p>
              {selected.address && (
                <p className="text-zinc-500 text-xs flex items-center gap-1 mb-2">
                  <MapPin className="w-3 h-3" />
                  {selected.address}, {selected.city}
                </p>
              )}
              {selected.phone && (
                <p className="text-zinc-500 text-xs flex items-center gap-1 mb-2">
                  <Phone className="w-3 h-3" />
                  {selected.phone}
                </p>
              )}
              {selected.website && (
                <a
                  href={selected.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-violet-400 text-xs flex items-center gap-1 hover:text-violet-300 transition"
                >
                  <Globe className="w-3 h-3" />
                  Site web
                </a>
              )}
            </div>
          ) : (
            <div className="p-4 space-y-2">
              <p className="text-xs text-zinc-500 px-2 py-1">
                {places.length} lieu{places.length > 1 ? "x" : ""} trouvé
                {places.length > 1 ? "s" : ""}
              </p>
              {places.map((place) => (
                <button
                  key={place.id}
                  onClick={() => setSelected(place)}
                  className="w-full text-left flex items-start gap-3 bg-zinc-900/60 border border-zinc-800 hover:border-pink-500/30 rounded-xl p-3 transition"
                >
                  <div className="shrink-0 w-10 h-10 rounded-lg bg-zinc-800 flex items-center justify-center mt-0.5">
                    <MapPin className="w-5 h-5 text-pink-400" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-semibold text-sm truncate">
                      {place.name}
                    </h3>
                    <p className="text-zinc-500 text-xs truncate">
                      {place.city} — {place.category}
                    </p>
                  </div>
                  {place.rating > 0 && (
                    <span className="shrink-0 text-xs text-yellow-400 flex items-center gap-0.5 ml-auto">
                      <Star className="w-3 h-3 fill-yellow-400" />
                      {place.rating.toFixed(1)}
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
