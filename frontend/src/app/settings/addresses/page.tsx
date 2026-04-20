"use client";

import { useEffect, useState } from "react";
import {
  getDeliveryAddresses,
  createDeliveryAddress,
  updateDeliveryAddress,
  deleteDeliveryAddress,
} from "@/lib/api";
import { Plus, Edit2, Trash2, Save, X, MapPin, Star } from "lucide-react";

interface Address {
  id: number;
  label: string;
  full_name: string;
  phone: string;
  address: string;
  city: string;
  postal_code: string;
  country: string;
  is_default: boolean;
}

export default function AddressesPage() {
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState({
    label: "",
    full_name: "",
    phone: "",
    address: "",
    city: "",
    postal_code: "",
    country: "France",
    is_default: false,
  });

  useEffect(() => {
    getDeliveryAddresses()
      .then((r) => setAddresses(r.addresses))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  function resetForm() {
    setForm({ label: "", full_name: "", phone: "", address: "", city: "", postal_code: "", country: "France", is_default: false });
  }

  async function handleCreate() {
    if (!form.full_name || !form.address || !form.city) return;
    try {
      const addr = (await createDeliveryAddress(form)) as unknown as Address;
      setAddresses((prev) => [addr, ...prev]);
      setShowCreate(false);
      resetForm();
    } catch (err) {
      alert((err as Error).message);
    }
  }

  async function handleUpdate(id: number) {
    try {
      const addr = (await updateDeliveryAddress(id, form)) as unknown as Address;
      setAddresses((prev) => prev.map((a) => (a.id === id ? addr : a)));
      setEditId(null);
      resetForm();
    } catch (err) {
      alert((err as Error).message);
    }
  }

  async function handleDelete(id: number) {
    if (!confirm("Supprimer cette adresse ?")) return;
    try {
      await deleteDeliveryAddress(id);
      setAddresses((prev) => prev.filter((a) => a.id !== id));
    } catch (err) {
      alert((err as Error).message);
    }
  }

  async function handleSetDefault(id: number) {
    try {
      const addr = (await updateDeliveryAddress(id, { is_default: true })) as unknown as Address;
      setAddresses((prev) =>
        prev.map((a) => ({
          ...a,
          is_default: a.id === id ? true : false,
        }))
      );
    } catch (err) {
      alert((err as Error).message);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-purple-600 border-t-transparent" />
      </div>
    );
  }

  const FormBlock = () => (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <input className="rounded-lg border px-3 py-2 text-sm" placeholder="Label (ex: Maison)" value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} />
        <input className="rounded-lg border px-3 py-2 text-sm" placeholder="Nom complet *" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
      </div>
      <input className="w-full rounded-lg border px-3 py-2 text-sm" placeholder="Adresse complète *" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
      <div className="grid grid-cols-3 gap-2">
        <input className="rounded-lg border px-3 py-2 text-sm" placeholder="Ville *" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
        <input className="rounded-lg border px-3 py-2 text-sm" placeholder="Code postal" value={form.postal_code} onChange={(e) => setForm({ ...form, postal_code: e.target.value })} />
        <input className="rounded-lg border px-3 py-2 text-sm" placeholder="Pays" value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} />
      </div>
      <input className="w-full rounded-lg border px-3 py-2 text-sm" placeholder="Téléphone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={form.is_default} onChange={(e) => setForm({ ...form, is_default: e.target.checked })} />
        Adresse par défaut
      </label>
    </div>
  );

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Mes adresses de livraison</h1>
        <button
          onClick={() => { setShowCreate(!showCreate); resetForm(); }}
          className="flex items-center gap-2 rounded-lg bg-purple-600 px-4 py-2 text-sm text-white transition hover:bg-purple-700"
        >
          <Plus size={16} /> Ajouter
        </button>
      </div>

      {showCreate && (
        <div className="mb-6 rounded-xl bg-white p-5 shadow-sm">
          <h3 className="mb-3 font-semibold">Nouvelle adresse</h3>
          <FormBlock />
          <div className="mt-3 flex gap-2">
            <button onClick={handleCreate} className="flex items-center gap-1 rounded-lg bg-green-600 px-4 py-2 text-sm text-white">
              <Save size={14} /> Enregistrer
            </button>
            <button onClick={() => setShowCreate(false)} className="flex items-center gap-1 rounded-lg bg-gray-200 px-4 py-2 text-sm">
              <X size={14} /> Annuler
            </button>
          </div>
        </div>
      )}

      {addresses.length === 0 && !showCreate ? (
        <div className="rounded-xl bg-white p-8 text-center shadow-sm">
          <MapPin size={48} className="mx-auto text-gray-300" />
          <p className="mt-3 text-gray-500">Aucune adresse enregistrée.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {addresses.map((addr) => (
            <div key={addr.id} className="rounded-xl bg-white p-5 shadow-sm">
              {editId === addr.id ? (
                <>
                  <FormBlock />
                  <div className="mt-3 flex gap-2">
                    <button onClick={() => handleUpdate(addr.id)} className="flex items-center gap-1 rounded-lg bg-green-600 px-3 py-2 text-sm text-white">
                      <Save size={14} /> Sauver
                    </button>
                    <button onClick={() => setEditId(null)} className="flex items-center gap-1 rounded-lg bg-gray-200 px-3 py-2 text-sm">
                      <X size={14} /> Annuler
                    </button>
                  </div>
                </>
              ) : (
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-gray-900">{addr.label || addr.full_name}</p>
                      {addr.is_default && (
                        <span className="flex items-center gap-1 rounded-full bg-purple-100 px-2 py-0.5 text-xs text-purple-700">
                          <Star size={10} /> Par défaut
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600">{addr.full_name}</p>
                    <p className="text-sm text-gray-500">{addr.address}</p>
                    <p className="text-sm text-gray-500">{addr.postal_code} {addr.city}, {addr.country}</p>
                    {addr.phone && <p className="text-sm text-gray-500">📞 {addr.phone}</p>}
                  </div>
                  <div className="flex gap-1">
                    {!addr.is_default && (
                      <button title="Définir par défaut" onClick={() => handleSetDefault(addr.id)} className="rounded-lg p-2 text-gray-400 hover:bg-purple-50 hover:text-purple-600">
                        <Star size={14} />
                      </button>
                    )}
                    <button
                      title="Modifier"
                      onClick={() => {
                        setEditId(addr.id);
                        setForm({
                          label: addr.label, full_name: addr.full_name, phone: addr.phone,
                          address: addr.address, city: addr.city, postal_code: addr.postal_code,
                          country: addr.country, is_default: addr.is_default,
                        });
                      }}
                      className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                    >
                      <Edit2 size={14} />
                    </button>
                    <button title="Supprimer" onClick={() => handleDelete(addr.id)} className="rounded-lg p-2 text-gray-400 hover:bg-red-50 hover:text-red-600">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
