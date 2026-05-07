"use client";

import { Suspense, useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
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
  Check,
  Clock,
  ChevronDown,
  ChevronUp,
  Phone,
  AlertCircle,
  RefreshCw,
  Loader2,
  MapPin,
  Search,
  SlidersHorizontal,
  Sparkles,
  Wheat,
  Scissors,
  Gem,
  Palette,
  Flame,
  Gift,
  Wind,
  Sprout,
  Tag,
  type LucideIcon,
} from "lucide-react";
import {
  getProducts,
  createOrder,
  getOMUssdCode,
  confirmOMPayment,
  getOrders,
  getDeliveryAddresses,
} from "@/lib/api";
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

interface DeliveryAddress {
  id: number;
  label: string;
  full_name: string;
  address: string;
  city: string;
  is_default: boolean;
}

export default function BoutiquePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center text-muted animate-pulse">
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
  const router = useRouter();

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [ordering, setOrdering] = useState(false);
  const [orderSuccess] = useState(false);
  const [category, setCategory] = useState("");
  const [orders, setOrders] = useState<Order[]>([]);
  const [ordersOpen, setOrdersOpen] = useState(false);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [phone, setPhone] = useState("");
  const [phoneError, setPhoneError] = useState("");
  // OM 3-step checkout state
  const [checkoutStep, setCheckoutStep] = useState<"cart" | "ussd" | "otp">(
    "cart",
  );
  const [ussdCode, setUssdCode] = useState("");
  const [currentOrderId, setCurrentOrderId] = useState<number | null>(null);
  const [otp, setOtp] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [paymentError, setPaymentError] = useState("");
  const [addresses, setAddresses] = useState<DeliveryAddress[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<"default" | "asc" | "desc">("default");

  useEffect(() => {
    getProducts()
      .then((res) => setProducts(res as unknown as Product[]))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem("boutique_cart");
    if (saved) {
      try { setCart(JSON.parse(saved)); } catch {}
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("boutique_cart", JSON.stringify(cart));
  }, [cart]);

  useEffect(() => {
    if (!user) return;
    getDeliveryAddresses()
      .then((res) => {
        setAddresses(res.addresses);
        const def = res.addresses.find((a) => a.is_default);
        if (def) setSelectedAddressId(def.id);
      })
      .catch(() => {});
  }, [user]);

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

  const categoryIcons: Record<string, LucideIcon> = {
    soins: Sparkles,
    alimentaire: Wheat,
    textiles: Scissors,
    bijoux: Gem,
    artisanat: Palette,
    ambiance: Flame,
    coffrets: Gift,
    yoga: Wind,
    épices: Sprout,
  };
  const getCategoryIcon = (cat: string) => {
    const Icon = categoryIcons[cat] ?? Tag;
    return <Icon className="w-3 h-3 inline-block -mt-px" />;
  };

  const filtered = products
    .filter((p) => {
      if (category && p.category !== category) return false;
      if (search) {
        const q = search.toLowerCase();
        return (
          p.name.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q)
        );
      }
      return true;
    })
    .sort((a, b) => {
      if (sortBy === "asc") return a.price - b.price;
      if (sortBy === "desc") return b.price - a.price;
      return 0;
    });

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

    // Validate phone
    const cleanPhone = phone.replace(/\s/g, "");
    if (!cleanPhone || cleanPhone.replace(/\+/g, "").length < 8) {
      setPhoneError("Entrez un numéro Orange Money valide (ex: 07XXXXXX)");
      return;
    }
    setPhoneError("");
    setPaymentError("");
    setOrdering(true);
    try {
      const order = (await createOrder({
        items: cart.map((i) => ({
          product_id: i.product.id,
          quantity: i.quantity,
        })),
        ...(selectedAddressId ? { delivery_address_id: selectedAddressId } : {}),
      })) as unknown as Order;
      setCurrentOrderId(order.id);
      // Get USSD code
      const ussd = await getOMUssdCode(order.id);
      setUssdCode(ussd.ussd_code);
      setCheckoutStep("ussd");
    } catch {
      setPaymentError("Erreur lors de la création de la commande.");
    }
    setOrdering(false);
  }

  async function handleConfirmOTP() {
    if (!currentOrderId || !otp.trim() || !phone.trim()) return;
    setConfirming(true);
    setPaymentError("");
    try {
      const cleanPhone = phone.replace(/\s/g, "");
      const res = await confirmOMPayment(
        currentOrderId,
        cleanPhone,
        otp.trim(),
      );
      if (res.status === "paid") {
        setCart([]);
        setCheckoutStep("cart");
        setOtp("");
        setPhone("");
        setCartOpen(false);
        router.push(`/boutique/orders/${currentOrderId}?paid=true`);
      } else {
        setPaymentError(
          res.message || res.error || "Paiement échoué. Vérifiez le code OTP.",
        );
      }
    } catch {
      setPaymentError("Erreur lors de la confirmation. Réessayez.");
    }
    setConfirming(false);
  }

  function resetCheckout() {
    setCheckoutStep("cart");
    setUssdCode("");
    setOtp("");
    setPaymentError("");
    setCurrentOrderId(null);
  }

  return (
    <div className="min-h-screen px-4 py-12">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm text-muted hover:text-foreground transition"
          >
            <ArrowLeft className="w-4 h-4" />
            Accueil
          </Link>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-violet-600" />
            Boutique
          </h1>
          <button
            onClick={() => setCartOpen(true)}
            className="relative text-muted hover:text-foreground transition"
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

        {/* Hero banner */}
        <div className="relative mb-8 rounded-2xl overflow-hidden bg-linear-to-br from-violet-700 via-purple-600 to-fuchsia-500 px-6 py-7">
          <div className="relative z-10">
            <p className="text-violet-200 text-[10px] font-semibold uppercase tracking-widest mb-1.5">Burkina Faso · Sahel</p>
            <h2 className="text-2xl font-bold text-white mb-1 leading-tight">Artisanat & Bien-être</h2>
            <p className="text-violet-200/80 text-sm max-w-xs leading-relaxed">Cosmétiques naturels, bijoux et saveurs du Sahel · direct artisans</p>
          </div>
          <div className="absolute right-5 bottom-2 text-7xl opacity-[0.15] select-none pointer-events-none leading-none">🌿</div>
          <Sparkles className="absolute right-16 top-4 w-8 h-8 text-white opacity-[0.12] pointer-events-none" />
        </div>

        {/* Order success */}
        {orderSuccess && (
          <div className="bg-green-50 border border-green-500/20 text-green-600 text-sm rounded-lg px-4 py-3 mb-6 flex items-center gap-2">
            <Check className="w-4 h-4" />
            Paiement confirmé ! Votre commande sera livrée sous 48h.
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
              className="inline-flex items-center gap-2 text-sm text-muted hover:text-foreground transition"
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
                  <p className="text-muted text-sm animate-pulse">
                    Chargement...
                  </p>
                ) : orders.length === 0 ? (
                  <p className="text-muted text-sm">
                    Aucune commande pour le moment.
                  </p>
                ) : (
                  orders.map((o) => (
                    <div
                      key={o.id}
                      className="bg-white/90 border border-border rounded-xl p-4"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs text-muted">
                          #{o.id} -{" "}
                          {new Date(o.created_at).toLocaleDateString("fr-FR")}
                        </span>
                        <span
                          className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                            o.status === "paid"
                              ? "bg-green-50 text-green-600"
                              : o.status === "delivered"
                                ? "bg-blue-50 text-blue-600"
                                : o.status === "pending"
                                  ? "bg-amber-500/10 text-amber-400"
                                  : o.status === "payment_failed"
                                    ? "bg-red-50 text-red-500"
                                    : o.status === "payment_expired"
                                      ? "bg-gray-100 text-gray-500"
                                      : o.status === "canceled"
                                        ? "bg-red-50 text-red-400"
                                        : o.status === "preparing"
                                          ? "bg-violet-50 text-violet-500"
                                          : o.status === "shipped"
                                            ? "bg-blue-50 text-blue-500"
                                            : "bg-surface-2 text-muted"
                          }`}
                        >
                          {o.status === "paid"
                            ? "Payée"
                            : o.status === "pending"
                              ? "En attente"
                              : o.status === "payment_failed"
                                ? "Échec paiement"
                                : o.status === "payment_expired"
                                  ? "Expiré"
                                  : o.status === "canceled"
                                    ? "Annulée"
                                    : o.status === "preparing"
                                      ? "En préparation"
                                      : o.status === "shipped"
                                        ? "Expédiée"
                                        : o.status === "delivered"
                                          ? "Livrée"
                                          : o.status}
                        </span>
                      </div>
                      <div className="space-y-1">
                        {o.items?.map((item) => (
                          <div
                            key={item.id}
                            className="flex justify-between text-sm"
                          >
                            <span className="text-foreground">
                              {item.product?.name || "Produit"} ×{" "}
                              {item.quantity}
                            </span>
                            <span className="text-muted">
                              {Math.round(item.price * item.quantity)} FCFA
                            </span>
                          </div>
                        ))}
                      </div>
                      <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
                        <span className="text-sm font-semibold text-white">
                          {Math.round(o.total_amount)} FCFA
                        </span>
                        {(o.status === "pending" ||
                          o.status === "payment_failed" ||
                          o.status === "payment_expired") && (
                          <button
                            onClick={async () => {
                              try {
                                setCurrentOrderId(o.id);
                                const ussd = await getOMUssdCode(o.id);
                                setUssdCode(ussd.ussd_code);
                                setCheckoutStep("ussd");
                                setCartOpen(true);
                              } catch {
                                /* ignore */
                              }
                            }}
                            className="inline-flex items-center gap-1.5 text-xs text-violet-600 hover:text-violet-500 transition"
                          >
                            {o.status === "pending" ? (
                              <Phone className="w-3 h-3" />
                            ) : (
                              <RefreshCw className="w-3 h-3" />
                            )}
                            {o.status === "pending"
                              ? "Payer via Orange Money"
                              : "Réessayer le paiement"}
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

        {/* Search + Sort */}
        <div className="flex items-center gap-3 mb-5">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted/60" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher un produit…"
              className="w-full pl-10 pr-4 py-2.5 bg-surface border border-border rounded-xl text-sm text-foreground placeholder:text-muted/60 focus:outline-none focus:ring-2 focus:ring-violet-400/40 focus:border-violet-400 transition"
            />
          </div>
          <div className="relative shrink-0">
            <SlidersHorizontal className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted/60 pointer-events-none" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as "default" | "asc" | "desc")}
              title="Trier les produits"
              className="pl-8 pr-3 py-2.5 bg-surface border border-border rounded-xl text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-violet-400/40 focus:border-violet-400 transition appearance-none cursor-pointer"
            >
              <option value="default">Trier</option>
              <option value="asc">Prix ↑</option>
              <option value="desc">Prix ↓</option>
            </select>
          </div>
        </div>

        {/* Categories */}
        {categories.length > 0 && (
          <div className="flex items-center gap-2 mb-8 overflow-x-auto pb-2 scrollbar-none">
            <button
              type="button"
              onClick={() => setCategory("")}
              className={`px-4 py-1.5 rounded-full text-xs font-medium transition whitespace-nowrap ${
                category === ""
                  ? "bg-violet-500/20 text-violet-600 border border-violet-300"
                  : "bg-surface text-muted border border-border hover:border-violet-200 hover:text-violet-600"
              }`}
            >
              Tous
            </button>
            {categories.map((cat) => (
              <button
                type="button"
                key={cat}
                onClick={() => setCategory(cat)}
                className={`px-4 py-1.5 rounded-full text-xs font-medium transition whitespace-nowrap capitalize ${
                  category === cat
                    ? "bg-violet-500/20 text-violet-600 border border-violet-300"
                    : "bg-surface text-muted border border-border hover:border-violet-200 hover:text-violet-600"
                }`}
              >
                {getCategoryIcon(cat)} {cat}
              </button>
            ))}
          </div>
        )}

        {/* Products Grid */}
        {loading ? (
          <div className="text-center py-12 text-muted animate-pulse">
            Chargement des produits...
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-16 h-16 rounded-2xl bg-surface-2 flex items-center justify-center mx-auto mb-4">
              {search ? (
                <Search className="w-7 h-7 text-muted/50" />
              ) : (
                <Package className="w-7 h-7 text-muted/50" />
              )}
            </div>
            <h2 className="text-base font-semibold mb-1">
              {search ? "Aucun résultat" : "Aucun produit"}
            </h2>
            <p className="text-muted text-sm">
              {search
                ? `Aucun produit ne correspond à « ${search} »`
                : "La boutique sera bientôt approvisionnée."}
            </p>
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="mt-4 text-xs text-violet-600 hover:underline"
              >
                Effacer la recherche
              </button>
            )}
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {filtered.map((product) => (
              <div
                key={product.id}
                className="bg-white border border-gray-100 rounded-2xl overflow-hidden hover:shadow-md hover:border-violet-200 transition-all duration-200 group flex flex-col"
              >
                {/* Image */}
                <div className="relative h-52 bg-gray-50 overflow-hidden shrink-0">
                  {product.image_url ? (
                    <Image
                      src={product.image_url}
                      alt={product.name}
                      fill
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                      className="object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Package className="w-12 h-12 text-gray-300" />
                    </div>
                  )}
                  {/* Out of stock overlay */}
                  {product.stock === 0 && (
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                      <span className="bg-white/90 text-gray-700 text-[11px] font-bold px-3 py-1.5 rounded-full tracking-wide">
                        Rupture de stock
                      </span>
                    </div>
                  )}
                  {/* Category badge */}
                  {product.category && (
                    <span className="absolute top-3 left-3 bg-white/90 backdrop-blur-sm text-gray-600 text-[10px] font-semibold px-2.5 py-1 rounded-full capitalize shadow-sm">
                      {getCategoryIcon(product.category)} {product.category}
                    </span>
                  )}
                  {/* Low stock badge */}
                  {product.stock > 0 && product.stock <= 5 && (
                    <span className="absolute top-3 right-3 bg-orange-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm">
                      Plus que {product.stock} !
                    </span>
                  )}
                </div>
                {/* Info */}
                <div className="p-4 flex flex-col flex-1">
                  <h3 className="font-semibold text-sm text-gray-900 mb-1.5 line-clamp-2 group-hover:text-violet-700 transition-colors leading-snug">
                    {product.name}
                  </h3>
                  <p className="text-gray-400 text-xs line-clamp-2 leading-relaxed flex-1">
                    {product.description}
                  </p>
                  <div className="flex items-center justify-between mt-4">
                    <div>
                      <span className="text-lg font-bold text-violet-600">
                        {Math.round(product.price).toLocaleString("fr-FR")}
                      </span>
                      <span className="text-xs text-gray-400 ml-1">FCFA</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => addToCart(product)}
                      disabled={product.stock === 0}
                      className="inline-flex items-center gap-1.5 bg-violet-600 hover:bg-violet-700 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-semibold px-4 py-2 rounded-xl transition-all duration-150"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Ajouter
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Cart Drawer */}
      {cartOpen && (
        <div className="fixed inset-0 z-60 flex justify-end">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => {
              setCartOpen(false);
              resetCheckout();
            }}
          />
          <div className="relative w-full max-w-md h-full bg-white shadow-2xl flex flex-col">
            {/* Header */}
            <div className="shrink-0 flex items-center justify-between px-5 py-4 border-b border-gray-200">
              <h2 className="text-lg font-bold flex items-center gap-2 text-gray-900">
                <ShoppingCart className="w-5 h-5 text-violet-600" />
                Panier ({itemCount})
              </h2>
              <button
                onClick={() => {
                  setCartOpen(false);
                  resetCheckout();
                }}
                className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition"
                title="Fermer"
              >
                <X className="w-4 h-4 text-gray-600" />
              </button>
            </div>

            {/* Cart Items - scrollable */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
              {cart.length === 0 ? (
                <div className="text-center py-12">
                  <ShoppingCart className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-400 text-sm">Votre panier est vide</p>
                </div>
              ) : (
                cart.map((item) => (
                  <div
                    key={item.product.id}
                    className="flex items-center gap-3 bg-gray-50 rounded-xl p-3"
                  >
                    <div className="w-12 h-12 rounded-lg bg-gray-200 shrink-0 flex items-center justify-center overflow-hidden">
                      {item.product.image_url ? (
                        <Image
                          src={item.product.image_url}
                          alt={item.product.name}
                          width={48}
                          height={48}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <Package className="w-5 h-5 text-gray-400" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-semibold text-gray-900 truncate">
                        {item.product.name}
                      </h4>
                      <p className="text-violet-600 text-xs font-medium">
                        {Math.round(item.product.price)} FCFA
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={() => updateQuantity(item.product.id, -1)}
                        className="w-7 h-7 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center transition"
                        title="Retirer"
                      >
                        <Minus className="w-3 h-3 text-gray-600" />
                      </button>
                      <span className="text-sm font-bold text-gray-900 w-6 text-center">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => updateQuantity(item.product.id, 1)}
                        className="w-7 h-7 rounded-full bg-violet-100 hover:bg-violet-200 flex items-center justify-center transition"
                        title="Ajouter"
                      >
                        <Plus className="w-3 h-3 text-violet-600" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Checkout Footer - fixed at bottom */}
            {cart.length > 0 && (
              <div className="shrink-0 border-t border-gray-200 bg-white px-5 py-4 pb-6 space-y-4">
                {/* Total */}
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">Total</span>
                  <span className="text-lg font-bold text-gray-900">
                    {Math.round(total)} FCFA
                  </span>
                </div>

                {!user ? (
                  <Link
                    href="/login"
                    className="block text-center bg-violet-600 hover:bg-violet-700 text-white font-semibold py-3 rounded-xl transition text-sm"
                  >
                    Se connecter pour commander
                  </Link>
                ) : checkoutStep === "cart" ? (
                  <div className="space-y-3">
                    {/* Adresse de livraison */}
                    <div>
                      <div className="flex items-center gap-1 mb-1.5">
                        <MapPin className="w-3 h-3 text-gray-400" />
                        <span className="text-xs font-medium text-gray-500">Adresse de livraison</span>
                      </div>
                      {addresses.length === 0 ? (
                        <Link
                          href="/settings/addresses"
                          className="text-xs text-violet-600 hover:underline"
                        >
                          + Ajouter une adresse de livraison
                        </Link>
                      ) : (
                        <div className="space-y-1.5">
                          {addresses.map((addr) => (
                            <button
                              key={addr.id}
                              type="button"
                              onClick={() => setSelectedAddressId(addr.id)}
                              className={`w-full text-left text-xs rounded-xl border px-3 py-2 transition ${
                                selectedAddressId === addr.id
                                  ? "border-violet-400 bg-violet-50 text-violet-900"
                                  : "border-gray-200 bg-gray-50 text-gray-600 hover:border-gray-300"
                              }`}
                            >
                              <div className="font-medium">{addr.label || addr.full_name}</div>
                              <div className="text-gray-400 mt-0.5">{addr.address}, {addr.city}</div>
                            </button>
                          ))}
                          <Link
                            href="/settings/addresses"
                            className="text-xs text-violet-600 hover:underline block"
                          >
                            + Gérer mes adresses
                          </Link>
                        </div>
                      )}
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-500 mb-1.5 block">
                        Numéro Orange Money
                      </label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                          type="tel"
                          value={phone}
                          onChange={(e) => {
                            setPhone(e.target.value);
                            setPhoneError("");
                          }}
                          placeholder="07XXXXXX"
                          className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-400/50 focus:border-orange-400 transition"
                        />
                      </div>
                      {phoneError && (
                        <p className="text-red-500 text-xs mt-1.5 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" />
                          {phoneError}
                        </p>
                      )}
                    </div>
                    {paymentError && (
                      <p className="text-red-500 text-xs flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        {paymentError}
                      </p>
                    )}
                    <button
                      onClick={handleOrder}
                      disabled={ordering}
                      className="w-full inline-flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-bold py-3.5 rounded-xl transition text-sm shadow-lg shadow-orange-500/25"
                    >
                      {ordering ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Création de la commande...
                        </>
                      ) : (
                        <>
                          <Phone className="w-4 h-4" />
                          Payer {Math.round(total)} FCFA via Orange Money
                        </>
                      )}
                    </button>
                  </div>
                ) : checkoutStep === "ussd" ? (
                  <div className="space-y-3">
                    <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 text-center">
                      <p className="text-sm text-orange-700 font-medium mb-2">
                        Composez ce code USSD sur votre téléphone :
                      </p>
                      <p className="text-2xl font-bold text-orange-600 font-mono tracking-wide">
                        {ussdCode}
                      </p>
                      <p className="text-xs text-orange-500/70 mt-2">
                        Vous recevrez un code OTP par SMS
                      </p>
                    </div>
                    <button
                      onClick={() => setCheckoutStep("otp")}
                      className="w-full bg-violet-600 hover:bg-violet-700 text-white font-bold py-3.5 rounded-xl transition text-sm shadow-lg shadow-violet-500/25"
                    >
                      J&apos;ai reçu mon code OTP
                    </button>
                    <button
                      onClick={resetCheckout}
                      className="w-full text-gray-400 hover:text-gray-600 text-xs py-1 transition"
                    >
                      Annuler
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div>
                      <label className="text-xs font-medium text-gray-500 mb-1.5 block">
                        Code OTP reçu par SMS
                      </label>
                      <input
                        type="text"
                        inputMode="numeric"
                        value={otp}
                        onChange={(e) => setOtp(e.target.value)}
                        placeholder="Entrez le code OTP"
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-green-400/50 focus:border-green-400 transition text-center tracking-widest font-mono"
                        maxLength={10}
                      />
                    </div>
                    {paymentError && (
                      <p className="text-red-500 text-xs flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        {paymentError}
                      </p>
                    )}
                    <button
                      onClick={handleConfirmOTP}
                      disabled={confirming || !otp.trim()}
                      className="w-full inline-flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-bold py-3.5 rounded-xl transition text-sm shadow-lg shadow-green-500/25"
                    >
                      {confirming ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Vérification en cours...
                        </>
                      ) : (
                        <>
                          <Check className="w-4 h-4" />
                          Confirmer le paiement
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => {
                        setCheckoutStep("ussd");
                        setPaymentError("");
                      }}
                      className="w-full text-gray-400 hover:text-gray-600 text-xs py-1 transition"
                    >
                      ← Revoir le code USSD
                    </button>
                  </div>
                )}
                <p className="text-gray-400 text-xs text-center flex items-center justify-center gap-1">
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
