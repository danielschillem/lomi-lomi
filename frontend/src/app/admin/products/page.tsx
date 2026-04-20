"use client";

import { useState, useEffect, useCallback } from "react";
import {
  ShoppingBag,
  Plus,
  Package,
  Pencil,
  Trash2,
  X,
  Save,
} from "lucide-react";
import {
  getProducts,
  adminCreateProduct,
  adminUpdateProduct,
  adminDeleteProduct,
} from "@/lib/api";

interface Product {
  id: number;
  name: string;
  description: string;
  price: number;
  image_url: string;
  category: string;
  stock: number;
  is_active: boolean;
}

const emptyForm = {
  name: "",
  description: "",
  price: 0,
  image_url: "",
  category: "",
  stock: 0,
  is_active: true,
};

export default function AdminProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState(emptyForm);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getProducts();
      setProducts(res as unknown as Product[]);
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

  function openEdit(p: Product) {
    setForm({
      name: p.name,
      description: p.description,
      price: p.price,
      image_url: p.image_url,
      category: p.category,
      stock: p.stock,
      is_active: p.is_active,
    });
    setEditId(p.id);
    setShowForm(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      if (editId) {
        await adminUpdateProduct(editId, form);
      } else {
        await adminCreateProduct(form);
      }
      setShowForm(false);
      load();
    } catch {
      /* ignore */
    }
  }

  async function handleDelete(p: Product) {
    if (!confirm(`Supprimer "${p.name}" ?`)) return;
    try {
      await adminDeleteProduct(p.id);
      load();
    } catch {
      /* ignore */
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <ShoppingBag className="w-6 h-6 text-pink-400" />
          Produits
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
            className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 w-full max-w-lg mx-4 space-y-4"
          >
            <div className="flex items-center justify-between mb-2">
              <h2 className="font-semibold text-lg">
                {editId ? "Modifier" : "Nouveau"} produit
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
              placeholder="Nom du produit"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-violet-500"
            />
            <textarea
              placeholder="Description"
              value={form.description}
              onChange={(e) =>
                setForm({ ...form, description: e.target.value })
              }
              rows={3}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-violet-500"
            />
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-zinc-500 mb-1 block">
                  Prix (€)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  required
                  title="Prix"
                  value={form.price}
                  onChange={(e) =>
                    setForm({ ...form, price: parseFloat(e.target.value) || 0 })
                  }
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-violet-500"
                />
              </div>
              <div>
                <label className="text-xs text-zinc-500 mb-1 block">
                  Stock
                </label>
                <input
                  type="number"
                  min="0"
                  title="Stock"
                  value={form.stock}
                  onChange={(e) =>
                    setForm({ ...form, stock: parseInt(e.target.value) || 0 })
                  }
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-violet-500"
                />
              </div>
            </div>
            <input
              placeholder="Catégorie"
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
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
                checked={form.is_active}
                onChange={(e) =>
                  setForm({ ...form, is_active: e.target.checked })
                }
                className="rounded border-zinc-600"
              />
              Actif
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
                Produit
              </th>
              <th className="text-left px-6 py-4 text-xs text-zinc-500 uppercase tracking-wider font-medium hidden sm:table-cell">
                Catégorie
              </th>
              <th className="text-left px-6 py-4 text-xs text-zinc-500 uppercase tracking-wider font-medium">
                Prix
              </th>
              <th className="text-left px-6 py-4 text-xs text-zinc-500 uppercase tracking-wider font-medium hidden md:table-cell">
                Stock
              </th>
              <th className="text-right px-6 py-4 text-xs text-zinc-500 uppercase tracking-wider font-medium">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td
                  colSpan={5}
                  className="px-6 py-12 text-center text-zinc-500 animate-pulse"
                >
                  Chargement...
                </td>
              </tr>
            ) : products.length === 0 ? (
              <tr>
                <td
                  colSpan={5}
                  className="px-6 py-12 text-center text-zinc-500"
                >
                  <Package className="w-10 h-10 mx-auto mb-3 text-zinc-600" />
                  Aucun produit dans la boutique.
                  <br />
                  <span className="text-xs">
                    Cliquez sur &quot;Ajouter&quot; pour créer un produit.
                  </span>
                </td>
              </tr>
            ) : (
              products.map((p) => (
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
                          <Package className="w-5 h-5 text-zinc-600" />
                        </div>
                      )}
                      <div>
                        <span className="font-medium flex items-center gap-2">
                          {p.name}
                          {!p.is_active && (
                            <span className="text-[10px] bg-zinc-700 text-zinc-400 px-1.5 py-0.5 rounded-full">
                              Inactif
                            </span>
                          )}
                        </span>
                        <span className="text-xs text-zinc-500 block truncate max-w-50">
                          {p.description}
                        </span>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-zinc-400 hidden sm:table-cell">
                    {p.category || "—"}
                  </td>
                  <td className="px-6 py-4 font-medium text-pink-400">
                    {p.price.toFixed(2)} €
                  </td>
                  <td className="px-6 py-4 hidden md:table-cell">
                    <span
                      className={
                        p.stock === 0
                          ? "text-red-400 font-medium"
                          : p.stock < 10
                            ? "text-yellow-400"
                            : "text-zinc-400"
                      }
                    >
                      {p.stock}
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
