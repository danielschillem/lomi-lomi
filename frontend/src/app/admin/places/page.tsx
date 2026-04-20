"use client";

import { useState, useEffect, useCallback } from "react";
import {
  MapPin,
  Plus,
  Pencil,
  Trash2,
  X,
  Save,
  Globe,
  Phone,
  Star,
} from "lucide-react";
import {
  getPlaces,
  adminCreatePlace,
  adminUpdatePlace,
  adminDeletePlace,
} from "@/lib/api";

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

const emptyForm = {
  name: "",
  description: "",
  category: "restaurant",
  address: "",
  city: "",
  latitude: 0,
  longitude: 0,
  image_url: "",
  phone: "",
  website: "",
  rating: 0,
  is_partner: false,
};

const categories: Record<string, string> = {
  restaurant: "Restaurant",
  hotel: "Hôtel",
  leisure: "Loisir",
  bar: "Bar",
  cafe: "Café",
  spa: "Spa",
  wellness: "Bien-être",
};

export default function AdminPlacesPage() {
  const [places, setPlaces] = useState<Place[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState(emptyForm);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getPlaces();
      setPlaces(res as unknown as Place[]);
    } catch {
      /* ignore */
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function openCreate() {
    setForm(emptyForm);
    setEditId(null);
    setShowForm(true);
  }

  function openEdit(p: Place) {
    setForm({
      name: p.name,
      description: p.description,
      category: p.category,
      address: p.address,
      city: p.city,
      latitude: p.latitude,
      longitude: p.longitude,
      image_url: p.image_url,
      phone: p.phone,
      website: p.website,
      rating: p.rating,
      is_partner: p.is_partner,
    });
    setEditId(p.id);
    setShowForm(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      if (editId) {
        await adminUpdatePlace(editId, form);
      } else {
        await adminCreatePlace(form);
      }
      setShowForm(false);
      load();
    } catch {
      /* ignore */
    }
  }

  async function handleDelete(p: Place) {
    if (!confirm(`Supprimer "${p.name}" ?`)) return;
    try {
      await adminDeletePlace(p.id);
      load();
    } catch {
      /* ignore */
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <MapPin className="w-6 h-6 text-blue-400" />
          Lieux
        </h1>
        <button
          onClick={openCreate}
          className="inline-flex items-center gap-2 bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium px-4 py-2.5 rounded-lg transition"
        >
          <Plus className="w-4 h-4" />
          Ajouter
        </button>
      </div>

      {/* Modal Form */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <form
            onSubmit={handleSubmit}
            className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 w-full max-w-lg mx-4 space-y-4 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between mb-2">
              <h2 className="font-semibold text-lg">
                {editId ? "Modifier" : "Nouveau"} lieu
              </h2>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                title="Fermer"
                className="p-1 rounded hover:bg-zinc-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <input
              required
              placeholder="Nom du lieu"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-violet-500"
            />
            <textarea
              placeholder="Description"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={3}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-violet-500"
            />
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-zinc-500 mb-1 block">Catégorie</label>
                <select
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  title="Catégorie"
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-violet-500"
                >
                  {Object.entries(categories).map(([val, label]) => (
                    <option key={val} value={val}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-zinc-500 mb-1 block">Ville</label>
                <input
                  placeholder="Ville"
                  value={form.city}
                  onChange={(e) => setForm({ ...form, city: e.target.value })}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-violet-500"
                />
              </div>
            </div>
            <input
              placeholder="Adresse complète"
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-violet-500"
            />
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-zinc-500 mb-1 block">Latitude</label>
                <input
                  type="number"
                  step="any"
                  title="Latitude"
                  value={form.latitude}
                  onChange={(e) => setForm({ ...form, latitude: parseFloat(e.target.value) || 0 })}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-violet-500"
                />
              </div>
              <div>
                <label className="text-xs text-zinc-500 mb-1 block">Longitude</label>
                <input
                  type="number"
                  step="any"
                  title="Longitude"
                  value={form.longitude}
                  onChange={(e) => setForm({ ...form, longitude: parseFloat(e.target.value) || 0 })}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-violet-500"
                />
              </div>
            </div>
            <input
              placeholder="Téléphone"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-violet-500"
            />
            <input
              placeholder="Site web"
              value={form.website}
              onChange={(e) => setForm({ ...form, website: e.target.value })}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-violet-500"
            />
            <input
              placeholder="URL de l'image"
              value={form.image_url}
              onChange={(e) => setForm({ ...form, image_url: e.target.value })}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-violet-500"
            />
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.is_partner}
                onChange={(e) => setForm({ ...form, is_partner: e.target.checked })}
                className="rounded border-zinc-600"
              />
              Partenaire
            </label>
            <button
              type="submit"
              className="w-full inline-flex items-center justify-center gap-2 bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium px-4 py-2.5 rounded-lg transition"
            >
              <Save className="w-4 h-4" />
              {editId ? "Mettre à jour" : "Créer"}
            </button>
          </form>
        </div>
      )}

      {/* Table */}
      <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-800">
              <th className="text-left px-6 py-4 text-xs text-zinc-500 uppercase tracking-wider font-medium">
                Lieu
              </th>
              <th className="text-left px-6 py-4 text-xs text-zinc-500 uppercase tracking-wider font-medium hidden sm:table-cell">
                Catégorie
              </th>
              <th className="text-left px-6 py-4 text-xs text-zinc-500 uppercase tracking-wider font-medium hidden md:table-cell">
                Ville
              </th>
              <th className="text-left px-6 py-4 text-xs text-zinc-500 uppercase tracking-wider font-medium">
                Note
              </th>
              <th className="text-right px-6 py-4 text-xs text-zinc-500 uppercase tracking-wider font-medium">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-zinc-500 animate-pulse">
                  Chargement...
                </td>
              </tr>
            ) : places.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-zinc-500">
                  <MapPin className="w-10 h-10 mx-auto mb-3 text-zinc-600" />
                  Aucun lieu enregistré.
                  <br />
                  <span className="text-xs">
                    Cliquez sur &quot;Ajouter&quot; pour référencer un lieu.
                  </span>
                </td>
              </tr>
            ) : (
              places.map((p) => (
                <tr
                  key={p.id}
                  className="border-b border-zinc-800/50 hover:bg-zinc-800/30 transition"
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      {p.image_url ? (
                        <img
                          src={p.image_url}
                          alt=""
                          className="w-10 h-10 rounded-lg object-cover shrink-0"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-zinc-800 flex items-center justify-center shrink-0">
                          <MapPin className="w-5 h-5 text-zinc-600" />
                        </div>
                      )}
                      <div>
                        <span className="font-medium flex items-center gap-2">
                          {p.name}
                          {p.is_partner && (
                            <span className="text-[10px] bg-violet-500/10 text-violet-400 border border-violet-500/20 px-1.5 py-0.5 rounded-full font-medium">
                              Partenaire
                            </span>
                          )}
                        </span>
                        <span className="text-xs text-zinc-500 flex items-center gap-2">
                          {p.address && <span className="truncate max-w-40">{p.address}</span>}
                          {p.phone && (
                            <span className="inline-flex items-center gap-0.5">
                              <Phone className="w-3 h-3" />
                            </span>
                          )}
                          {p.website && (
                            <span className="inline-flex items-center gap-0.5">
                              <Globe className="w-3 h-3" />
                            </span>
                          )}
                        </span>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-zinc-400 hidden sm:table-cell">
                    {categories[p.category] || p.category}
                  </td>
                  <td className="px-6 py-4 text-zinc-400 hidden md:table-cell">
                    {p.city || "—"}
                  </td>
                  <td className="px-6 py-4">
                    <span className="flex items-center gap-1 text-yellow-400">
                      <Star className="w-3.5 h-3.5 fill-current" />
                      {p.rating.toFixed(1)}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => openEdit(p)}
                        title="Modifier"
                        className="p-1.5 rounded-md hover:bg-zinc-700 transition text-zinc-500 hover:text-violet-400"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(p)}
                        title="Supprimer"
                        className="p-1.5 rounded-md hover:bg-zinc-700 transition text-zinc-500 hover:text-red-400"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
