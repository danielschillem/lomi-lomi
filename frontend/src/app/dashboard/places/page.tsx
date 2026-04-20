"use client";

import { useEffect, useState } from "react";
import { ownerGetPlaces, ownerUpdatePlace } from "@/lib/api";
import { MapPin, Edit2, Save, X } from "lucide-react";

interface Place {
  id: number;
  name: string;
  description: string;
  category: string;
  address: string;
  city: string;
  phone: string;
  website: string;
  image_url: string;
  rating: number;
  is_partner: boolean;
}

export default function DashboardPlacesPage() {
  const [places, setPlaces] = useState<Place[]>([]);
  const [loading, setLoading] = useState(true);
  const [editId, setEditId] = useState<number | null>(null);
  const [editData, setEditData] = useState<Partial<Place>>({});

  useEffect(() => {
    ownerGetPlaces()
      .then((r) => setPlaces(r.places as unknown as Place[]))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  async function handleSave(id: number) {
    try {
      const updated = await ownerUpdatePlace(id, editData);
      setPlaces((prev) => prev.map((p) => (p.id === id ? { ...p, ...updated } as unknown as Place : p)));
      setEditId(null);
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
      <h1 className="mb-6 text-2xl font-bold text-gray-900">Mes lieux</h1>

      {places.length === 0 ? (
        <div className="rounded-xl bg-white p-8 text-center shadow-sm">
          <MapPin size={48} className="mx-auto text-gray-300" />
          <p className="mt-3 text-gray-500">
            Aucun lieu ne vous est attribué.
            <br />
            Contactez l&apos;administrateur pour en ajouter.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {places.map((place) => (
            <div key={place.id} className="rounded-xl bg-white p-5 shadow-sm">
              {editId === place.id ? (
                <div className="space-y-3">
                  <input
                    className="w-full rounded-lg border px-3 py-2 text-sm"
                    defaultValue={place.name}
                    placeholder="Nom"
                    onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                  />
                  <textarea
                    className="w-full rounded-lg border px-3 py-2 text-sm"
                    defaultValue={place.description}
                    placeholder="Description"
                    rows={3}
                    onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                  />
                  <input
                    className="w-full rounded-lg border px-3 py-2 text-sm"
                    defaultValue={place.phone}
                    placeholder="Téléphone"
                    onChange={(e) => setEditData({ ...editData, phone: e.target.value })}
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleSave(place.id)}
                      className="flex items-center gap-1 rounded-lg bg-green-600 px-3 py-2 text-sm text-white"
                    >
                      <Save size={14} /> Enregistrer
                    </button>
                    <button
                      onClick={() => setEditId(null)}
                      className="flex items-center gap-1 rounded-lg bg-gray-200 px-3 py-2 text-sm"
                    >
                      <X size={14} /> Annuler
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold text-gray-900">{place.name}</h3>
                      <p className="text-sm text-gray-500">{place.category} • {place.city}</p>
                    </div>
                    <button
                      onClick={() => {
                        setEditId(place.id);
                        setEditData({});
                      }}
                      title="Modifier"
                      className="rounded-lg p-2 text-gray-400 transition hover:bg-gray-100 hover:text-gray-700"
                    >
                      <Edit2 size={16} />
                    </button>
                  </div>
                  {place.description && (
                    <p className="mt-2 text-sm text-gray-600 line-clamp-2">{place.description}</p>
                  )}
                  <div className="mt-3 flex flex-wrap gap-2 text-xs text-gray-500">
                    {place.address && <span>📍 {place.address}</span>}
                    {place.phone && <span>📞 {place.phone}</span>}
                    <span>⭐ {place.rating.toFixed(1)}</span>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
