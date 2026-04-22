"use client";

import { Suspense, useState, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  ShoppingBag,
  ArrowLeft,
  Star,
  Plus,
  Minus,
  ShoppingCart,
  Package,
  X,
  CreditCard,
  Check,
  Clock,
  ChevronDown,
  ChevronUp,
  ExternalLink,
} from "lucide-react";
import { getProducts, createOrder, initiatePayment, getOrders } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

interface Product {
  id: number;
  name: string;
  description: string;
  price: number;
  image_url: string;
  category: string;
  stock: number;
}

interface CartItem {
  product: Product;
  quantity: number;
}

interface OrderItem {
  id: number;
  product: Product;
  quantity: number;
  price: number;
}

interface Order {
  id: number;
  created_at: string;
  total_amount: number;
  status: string;
  items: OrderItem[];
}

export default function BoutiquePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center text-zinc-400 animate-pulse">
          Chargement...
        </div>
      }
    >
      <BoutiqueContent />
    </Suspense>
  );
}

function BoutiqueContent() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [ordering, setOrdering] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(false);
  const [orderCanceled, setOrderCanceled] = useState(false);
  const [category, setCategory] = useState("");
  const [orders, setOrders] = useState<Order[]>([]);
  const [ordersOpen, setOrdersOpen] = useState(false);
  const [ordersLoading, setOrdersLoading] = useState(false);

  useEffect(() => {
    getProducts()
      .then((res) => setProducts(res as unknown as Product[]))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // Orange Money redirect params
  useEffect(() => {
    if (searchParams.get("success") === "true") {
      setOrderSuccess(true);
      setTimeout(() => setOrderSuccess(false), 6000);
    }
    if (searchParams.get("canceled") === "true") {
      setOrderCanceled(true);
      setTimeout(() => setOrderCanceled(false), 6000);
    }
  }, [searchParams]);

  const loadOrders = useCallback(async () => {
    if (!user) return;
    setOrdersLoading(true);
    try {
      const res = await getOrders();
      setOrders(res as unknown as Order[]);
    } catch {
      /* ignore */
    }
    setOrdersLoading(false);
  }, [user]);

  const filtered = category
    ? products.filter((p) => p.category === category)
    : products;

  const categories = [
    ...new Set(products.map((p) => p.category).filter(Boolean)),
  ];

  function addToCart(product: Product) {
    setCart((prev) => {
      const existing = prev.find((i) => i.product.id === product.id);
      if (existing) {
        return prev.map((i) =>
          i.product.id === product.id
            ? { ...i, quantity: Math.min(i.quantity + 1, product.stock) }
            : i,
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
  }

  function updateQuantity(productId: number, delta: number) {
    setCart((prev) =>
      prev
        .map((i) =>
          i.product.id === productId
            ? { ...i, quantity: Math.max(0, i.quantity + delta) }
            : i,
        )
        .filter((i) => i.quantity > 0),
    );
  }

  const total = cart.reduce(
    (sum, item) => sum + item.product.price * item.quantity,
    0,
  );
  const itemCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  async function handleOrder() {
    if (!user) return;
    setOrdering(true);
    try {
      const order = (await createOrder({
        items: cart.map((i) => ({
          product_id: i.product.id,
          quantity: i.quantity,
        })),
      })) as unknown as Order;
      // Initiate Orange Money payment
      const payment = await initiatePayment(order.id);
      if (payment.payment_url) {
        window.location.href = payment.payment_url;
      } else {
        // Dev mode: payment simulated
        setCart([]);
        setOrderSuccess(true);
        setTimeout(() => setOrderSuccess(false), 6000);
        setOrdering(false);
      }
    } catch {
      setOrdering(false);
    }
  }

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
            <ShoppingBag className="w-5 h-5 text-violet-400" />
            Boutique
          </h1>
          <button
            onClick={() => setCartOpen(true)}
            className="relative text-zinc-400 hover:text-white transition"
            title="Panier"
          >
            <ShoppingCart className="w-6 h-6" />
            {itemCount > 0 && (
              <span className="absolute -top-2 -right-2 w-5 h-5 bg-pink-500 rounded-full text-[10px] font-bold flex items-center justify-center text-white">
                {itemCount}
              </span>
            )}
          </button>
        </div>

        {/* Order success */}
        {orderSuccess && (
          <div className="bg-green-500/10 border border-green-500/20 text-green-400 text-sm rounded-lg px-4 py-3 mb-6 flex items-center gap-2">
            <Check className="w-4 h-4" />
            Paiement confirmé ! Votre commande sera livrée sous 48h.
          </div>
        )}

        {/* Order canceled */}
        {orderCanceled && (
          <div className="bg-amber-500/10 border border-amber-500/20 text-amber-400 text-sm rounded-lg px-4 py-3 mb-6 flex items-center gap-2">
            <X className="w-4 h-4" />
            Paiement annulé. Votre commande reste en attente.
          </div>
        )}

        {/* Mes commandes */}
        {user && (
          <div className="mb-6">
            <button
              onClick={() => {
                setOrdersOpen(!ordersOpen);
                if (!ordersOpen && orders.length === 0) loadOrders();
              }}
              className="inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-white transition"
            >
              <Clock className="w-4 h-4" />
              Mes commandes
              {ordersOpen ? (
                <ChevronUp className="w-3 h-3" />
              ) : (
                <ChevronDown className="w-3 h-3" />
              )}
            </button>
            {ordersOpen && (
              <div className="mt-4 space-y-3">
                {ordersLoading ? (
                  <p className="text-zinc-500 text-sm animate-pulse">
                    Chargement...
                  </p>
                ) : orders.length === 0 ? (
                  <p className="text-zinc-500 text-sm">
                    Aucune commande pour le moment.
                  </p>
                ) : (
                  orders.map((o) => (
                    <div
                      key={o.id}
                      className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-4"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs text-zinc-500">
                          #{o.id} —{" "}
                          {new Date(o.created_at).toLocaleDateString("fr-FR")}
                        </span>
                        <span
                          className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                            o.status === "paid"
                              ? "bg-green-500/10 text-green-400"
                              : o.status === "pending"
                                ? "bg-amber-500/10 text-amber-400"
                                : "bg-zinc-800 text-zinc-400"
                          }`}
                        >
                          {o.status === "paid"
                            ? "Payée"
                            : o.status === "pending"
                              ? "En attente"
                              : o.status}
                        </span>
                      </div>
                      <div className="space-y-1">
                        {o.items?.map((item) => (
                          <div
                            key={item.id}
                            className="flex justify-between text-sm"
                          >
                            <span className="text-zinc-300">
                              {item.product?.name || "Produit"} ×{" "}
                              {item.quantity}
                            </span>
                            <span className="text-zinc-400">
                              {Math.round(item.price * item.quantity)} FCFA
                            </span>
                          </div>
                        ))}
                      </div>
                      <div className="flex items-center justify-between mt-3 pt-3 border-t border-zinc-800">
                        <span className="text-sm font-semibold text-white">
                          {Math.round(o.total_amount)} FCFA
                        </span>
                        {o.status === "pending" && (
                          <button
                            onClick={async () => {
                              try {
                                const payment = await initiatePayment(o.id);
                                if (payment.payment_url) {
                                  window.location.href = payment.payment_url;
                                } else {
                                  window.location.reload();
                                }
                              } catch {
                                /* ignore */
                              }
                            }}
                            className="inline-flex items-center gap-1.5 text-xs text-violet-400 hover:text-violet-300 transition"
                          >
                            <ExternalLink className="w-3 h-3" />
                            Payer via Orange Money
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        )}

        {/* Categories */}
        {categories.length > 0 && (
          <div className="flex items-center gap-2 mb-8 overflow-x-auto pb-2">
            <button
              onClick={() => setCategory("")}
              className={`px-4 py-1.5 rounded-full text-xs font-medium transition whitespace-nowrap ${
                category === ""
                  ? "bg-violet-500/20 text-violet-400 border border-violet-500/30"
                  : "bg-zinc-900 text-zinc-400 border border-zinc-800 hover:border-zinc-700"
              }`}
            >
              Tous
            </button>
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setCategory(cat)}
                className={`px-4 py-1.5 rounded-full text-xs font-medium transition whitespace-nowrap capitalize ${
                  category === cat
                    ? "bg-violet-500/20 text-violet-400 border border-violet-500/30"
                    : "bg-zinc-900 text-zinc-400 border border-zinc-800 hover:border-zinc-700"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        )}

        {/* Products Grid */}
        {loading ? (
          <div className="text-center py-12 text-zinc-400 animate-pulse">
            Chargement des produits...
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12">
            <Package className="w-16 h-16 text-zinc-600 mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">Aucun produit</h2>
            <p className="text-zinc-400 text-sm">
              La boutique sera bientôt approvisionnée.
            </p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filtered.map((product) => (
              <div
                key={product.id}
                className="bg-zinc-900/60 border border-zinc-800 rounded-2xl overflow-hidden hover:border-violet-500/30 transition group"
              >
                <div className="h-48 bg-zinc-800 flex items-center justify-center">
                  {product.image_url ? (
                    <img
                      src={product.image_url}
                      alt={product.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <Package className="w-12 h-12 text-zinc-600" />
                  )}
                </div>
                <div className="p-5">
                  <h3 className="font-semibold text-sm mb-1 group-hover:text-violet-400 transition truncate">
                    {product.name}
                  </h3>
                  {product.category && (
                    <span className="text-xs text-zinc-500 capitalize">
                      {product.category}
                    </span>
                  )}
                  <p className="text-zinc-400 text-xs mt-2 line-clamp-2 leading-relaxed">
                    {product.description}
                  </p>
                  <div className="flex items-center justify-between mt-4">
                    <span className="text-lg font-bold text-violet-400">
                      {Math.round(product.price)} FCFA
                    </span>
                    <button
                      onClick={() => addToCart(product)}
                      disabled={product.stock === 0}
                      className="inline-flex items-center gap-1.5 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white text-xs font-medium px-3 py-2 rounded-lg transition"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Ajouter
                    </button>
                  </div>
                  {product.stock === 0 && (
                    <p className="text-red-400 text-xs mt-2">
                      Rupture de stock
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Cart Drawer */}
      {cartOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div
            className="absolute inset-0 bg-zinc-950/70"
            onClick={() => setCartOpen(false)}
          />
          <div className="relative w-full max-w-md bg-zinc-900 border-l border-zinc-800 flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-zinc-800">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <ShoppingCart className="w-5 h-5 text-violet-400" />
                Panier ({itemCount})
              </h2>
              <button
                onClick={() => setCartOpen(false)}
                className="text-zinc-400 hover:text-white transition"
                title="Fermer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {cart.length === 0 ? (
                <div className="text-center py-8">
                  <ShoppingCart className="w-12 h-12 text-zinc-600 mx-auto mb-3" />
                  <p className="text-zinc-400 text-sm">Votre panier est vide</p>
                </div>
              ) : (
                cart.map((item) => (
                  <div
                    key={item.product.id}
                    className="flex items-center gap-4 bg-zinc-800/50 rounded-xl p-4"
                  >
                    <div className="w-14 h-14 rounded-lg bg-zinc-800 shrink-0 flex items-center justify-center overflow-hidden">
                      {item.product.image_url ? (
                        <img
                          src={item.product.image_url}
                          alt={item.product.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <Package className="w-6 h-6 text-zinc-600" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-semibold truncate">
                        {item.product.name}
                      </h4>
                      <p className="text-violet-400 text-sm font-medium">
                        {Math.round(item.product.price)} FCFA
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => updateQuantity(item.product.id, -1)}
                        className="w-7 h-7 rounded-md bg-zinc-700 hover:bg-zinc-600 flex items-center justify-center transition"
                        title="Retirer"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className="text-sm font-medium w-6 text-center">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => updateQuantity(item.product.id, 1)}
                        className="w-7 h-7 rounded-md bg-zinc-700 hover:bg-zinc-600 flex items-center justify-center transition"
                        title="Ajouter"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {cart.length > 0 && (
              <div className="shrink-0 border-t border-zinc-800 p-6">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-zinc-400">Total</span>
                  <span className="text-xl font-bold text-white">
                    {Math.round(total)} FCFA
                  </span>
                </div>
                {!user ? (
                  <Link
                    href="/login"
                    className="block text-center bg-violet-600 hover:bg-violet-700 text-white font-semibold py-3 rounded-lg transition text-sm"
                  >
                    Se connecter pour commander
                  </Link>
                ) : (
                  <button
                    onClick={handleOrder}
                    disabled={ordering}
                    className="w-full inline-flex items-center justify-center gap-2 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white font-semibold py-3 rounded-lg transition text-sm"
                  >
                    <CreditCard className="w-4 h-4" />
                    {ordering
                      ? "Redirection vers le paiement..."
                      : "Payer par carte"}
                  </button>
                )}
                <p className="text-zinc-500 text-xs text-center mt-3 flex items-center justify-center gap-1">
                  <Star className="w-3 h-3" />
                  Livraison discrète garantie
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
