"use client";

import { useEffect, useState } from "react";
import {
  ownerGetProducts,
  ownerCreateProduct,
  ownerUpdateProduct,
  ownerDeleteProduct,
} from "@/lib/api";
import { Plus, Edit2, Trash2, Save, X } from "lucide-react";

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

export default function OwnerProductsView() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState({
    name: "",
    description: "",
    price: "",
    category: "",
    stock: "0",
  });

  useEffect(() => {
    ownerGetProducts()
      .then((r) => setProducts(r.products as unknown as Product[]))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  async function handleCreate() {
    if (!form.name || !form.price) return;
    try {
      const p = await ownerCreateProduct({
        name: form.name,
        description: form.description,
        price: parseFloat(form.price),
        category: form.category,
        stock: parseInt(form.stock) || 0,
      });
      setProducts((prev) => [p as unknown as Product, ...prev]);
      setShowCreate(false);
      setForm({
        name: "",
        description: "",
        price: "",
        category: "",
        stock: "0",
      });
    } catch (err) {
      alert((err as Error).message);
    }
  }

  async function handleUpdate(id: number) {
    try {
      const p = await ownerUpdateProduct(id, {
        name: form.name || undefined,
        description: form.description || undefined,
        price: form.price ? parseFloat(form.price) : undefined,
        category: form.category || undefined,
        stock: form.stock ? parseInt(form.stock) : undefined,
      });
      setProducts((prev) =>
        prev.map((pr) =>
          pr.id === id ? ({ ...pr, ...p } as unknown as Product) : pr,
        ),
      );
      setEditId(null);
    } catch (err) {
      alert((err as Error).message);
    }
  }

  async function handleDelete(id: number) {
    if (!confirm("Supprimer ce produit ?")) return;
    try {
      await ownerDeleteProduct(id);
      setProducts((prev) => prev.filter((p) => p.id !== id));
    } catch (err) {
      alert((err as Error).message);
    }
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-violet-600 border-t-transparent" />
      </div>
    );
  }

  const FormFields = ({ defaults }: { defaults?: Partial<Product> }) => (
    <div className="space-y-3">
      <input
        className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white placeholder-zinc-500 focus:border-violet-500 focus:outline-none"
        placeholder="Nom du produit"
        defaultValue={defaults?.name}
        onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
      />
      <textarea
        className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white placeholder-zinc-500 focus:border-violet-500 focus:outline-none"
        placeholder="Description"
        rows={2}
        defaultValue={defaults?.description}
        onChange={(e) =>
          setForm((f) => ({ ...f, description: e.target.value }))
        }
      />
      <div className="grid grid-cols-3 gap-2">
        <input
          className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white placeholder-zinc-500 focus:border-violet-500 focus:outline-none"
          placeholder="Prix (FCFA)"
          type="number"
          step="0.01"
          defaultValue={defaults?.price}
          onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
        />
        <input
          className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white placeholder-zinc-500 focus:border-violet-500 focus:outline-none"
          placeholder="Catégorie"
          defaultValue={defaults?.category}
          onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
        />
        <input
          className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white placeholder-zinc-500 focus:border-violet-500 focus:outline-none"
          placeholder="Stock"
          type="number"
          defaultValue={defaults?.stock}
          onChange={(e) => setForm((f) => ({ ...f, stock: e.target.value }))}
        />
      </div>
    </div>
  );

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Mes produits</h1>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="flex items-center gap-2 rounded-lg bg-purple-600 px-4 py-2 text-sm text-white transition hover:bg-purple-700"
        >
          <Plus size={16} /> Ajouter
        </button>
      </div>

      {showCreate && (
        <div className="mb-6 rounded-xl bg-zinc-900/60 border border-zinc-800 p-5 ">
          <h3 className="mb-3 font-semibold">Nouveau produit</h3>
          <FormFields />
          <div className="mt-3 flex gap-2">
            <button
              onClick={handleCreate}
              className="flex items-center gap-1 rounded-lg bg-green-600 px-4 py-2 text-sm text-white"
            >
              <Save size={14} /> Créer
            </button>
            <button
              onClick={() => setShowCreate(false)}
              className="flex items-center gap-1 rounded-lg bg-zinc-700 px-4 py-2 text-sm"
            >
              <X size={14} /> Annuler
            </button>
          </div>
        </div>
      )}

      {products.length === 0 && !showCreate ? (
        <p className="text-zinc-400">
          Aucun produit. Cliquez sur &quot;Ajouter&quot; pour en créer.
        </p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {products.map((product) => (
            <div
              key={product.id}
              className="rounded-xl bg-zinc-900/60 border border-zinc-800 p-5 "
            >
              {editId === product.id ? (
                <>
                  <FormFields defaults={product} />
                  <div className="mt-3 flex gap-2">
                    <button
                      onClick={() => handleUpdate(product.id)}
                      className="flex items-center gap-1 rounded-lg bg-green-600 px-3 py-2 text-sm text-white"
                    >
                      <Save size={14} /> Sauver
                    </button>
                    <button
                      onClick={() => setEditId(null)}
                      className="flex items-center gap-1 rounded-lg bg-zinc-700 px-3 py-2 text-sm"
                    >
                      <X size={14} /> Annuler
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold text-white">
                        {product.name}
                      </h3>
                      <p className="text-sm text-violet-400 font-bold">
                        {Math.round(product.price)} FCFA
                      </p>
                    </div>
                    <div className="flex gap-1">
                      <button
                        title="Modifier"
                        onClick={() => {
                          setEditId(product.id);
                          setForm({
                            name: product.name,
                            description: product.description,
                            price: String(product.price),
                            category: product.category,
                            stock: String(product.stock),
                          });
                        }}
                        className="rounded-lg p-2 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button
                        title="Supprimer"
                        onClick={() => handleDelete(product.id)}
                        className="rounded-lg p-2 text-zinc-500 hover:bg-red-500/10 hover:text-red-400"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                  {product.description && (
                    <p className="mt-2 text-sm text-zinc-400 line-clamp-2">
                      {product.description}
                    </p>
                  )}
                  <div className="mt-2 flex gap-2 text-xs text-zinc-400">
                    {product.category && (
                      <span className="rounded bg-zinc-800 px-2 py-0.5">
                        {product.category}
                      </span>
                    )}
                    <span>Stock: {product.stock}</span>
                    <span
                      className={
                        product.is_active ? "text-green-600" : "text-red-600"
                      }
                    >
                      {product.is_active ? "Actif" : "Inactif"}
                    </span>
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
