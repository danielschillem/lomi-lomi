"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { getEvents, attendEvent } from "@/lib/api";
import { Calendar, MapPin, Users, Tag } from "lucide-react";

const CATEGORIES = [
  { id: "", label: "Tous" },
  { id: "soiree", label: "Soirées" },
  { id: "rencontre", label: "Rencontres" },
  { id: "atelier", label: "Ateliers" },
  { id: "sport", label: "Sport" },
];

const CITIES = ["", "Ouagadougou", "Bobo-Dioulasso"];

type Event = {
  id: number;
  title: string;
  description: string;
  image_url?: string;
  city: string;
  address: string;
  starts_at: string;
  ends_at: string;
  price: number;
  category: string;
  max_attendees: number;
  attendees_count: number;
};

export default function EvenementsPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState("");
  const [city, setCity] = useState("");
  const [attending, setAttending] = useState<Record<number, string>>({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getEvents({
        category: category || undefined,
        city: city || undefined,
      });
      setEvents(data as Event[]);
    } finally {
      setLoading(false);
    }
  }, [category, city]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleAttend(id: number, status: "going" | "interested") {
    try {
      await attendEvent(id, status);
      setAttending((prev) => ({ ...prev, [id]: status }));
    } catch {
      // ignore
    }
  }

  function formatDate(d: string) {
    return new Date(d).toLocaleDateString("fr-BF", {
      weekday: "short",
      day: "numeric",
      month: "long",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white pb-16">
      {/* Header */}
      <div className="bg-linear-to-r from-purple-900 to-pink-800 px-4 pt-10 pb-6">
        <h1 className="text-2xl font-bold mb-1">Événements</h1>
        <p className="text-white/70 text-sm">
          Rencontrez des gens lors de soirées et d&apos;activités
        </p>
      </div>

      {/* Filters */}
      <div className="px-4 py-4 space-y-3 bg-gray-900 border-b border-gray-800">
        {/* Categories */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          {CATEGORIES.map((c) => (
            <button
              key={c.id}
              onClick={() => setCategory(c.id)}
              className={`px-4 py-1.5 rounded-full text-sm whitespace-nowrap transition ${category === c.id ? "bg-purple-600 text-white" : "bg-gray-800 text-gray-400 hover:text-white"}`}
            >
              {c.label}
            </button>
          ))}
        </div>
        {/* City */}
        <div className="flex gap-2">
          {CITIES.map((c) => (
            <button
              key={c}
              onClick={() => setCity(c)}
              className={`px-3 py-1 rounded-full text-xs transition ${city === c ? "bg-pink-600 text-white" : "bg-gray-800 text-gray-500 hover:text-white"}`}
            >
              {c || "Toutes les villes"}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      <div className="px-4 py-4 space-y-4 max-w-2xl mx-auto">
        {loading && (
          <p className="text-gray-500 text-center py-8">Chargement...</p>
        )}
        {!loading && events.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            <Calendar className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>Aucun événement pour le moment</p>
          </div>
        )}
        {events.map((event) => (
          <div
            key={event.id}
            className="bg-gray-900 rounded-2xl overflow-hidden border border-gray-800 hover:border-purple-700 transition"
          >
            {event.image_url && (
              <Image
                src={event.image_url}
                alt={event.title}
                width={1200}
                height={640}
                className="w-full h-40 object-cover"
              />
            )}
            <div className="p-4">
              <div className="flex items-start justify-between gap-2 mb-2">
                <h2 className="font-bold text-lg leading-tight">
                  {event.title}
                </h2>
                <span className="text-xs bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded-full capitalize whitespace-nowrap">
                  {event.category}
                </span>
              </div>

              <p className="text-gray-400 text-sm mb-3 line-clamp-2">
                {event.description}
              </p>

              <div className="space-y-1.5 text-xs text-gray-500 mb-4">
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5" />
                  {formatDate(event.starts_at)}
                </div>
                <div className="flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5" />
                  {event.address}, {event.city}
                </div>
                <div className="flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5" />
                  {event.attendees_count}
                  {event.max_attendees > 0
                    ? ` / ${event.max_attendees}`
                    : ""}{" "}
                  participant(s)
                </div>
                {event.price > 0 && (
                  <div className="flex items-center gap-1.5">
                    <Tag className="w-3.5 h-3.5" />
                    {event.price.toLocaleString()} FCFA
                  </div>
                )}
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => handleAttend(event.id, "going")}
                  className={`flex-1 py-2 rounded-xl text-sm font-medium transition ${attending[event.id] === "going" ? "bg-purple-600 text-white" : "bg-purple-600/20 text-purple-300 hover:bg-purple-600 hover:text-white"}`}
                >
                  {attending[event.id] === "going"
                    ? " Je vais y aller"
                    : "J'y vais"}
                </button>
                <button
                  onClick={() => handleAttend(event.id, "interested")}
                  className={`flex-1 py-2 rounded-xl text-sm font-medium transition ${attending[event.id] === "interested" ? "bg-gray-700 text-white" : "bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white"}`}
                >
                  Intéressé(e)
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
