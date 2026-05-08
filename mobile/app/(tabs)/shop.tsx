import { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Image,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Alert,
  TextInput,
  Modal,
} from "react-native";
import { router } from "expo-router";
import PremiumGate from "@/app/components/PremiumGate";
import { Ionicons } from "@expo/vector-icons";
import { getProducts, createOrder, getOMUssdCode, confirmOMPayment } from "@/lib/api";
import { useTheme } from "@/lib/theme-context";

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

function ShopScreenInner() {
  const { colors } = useTheme();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [showCart, setShowCart] = useState(false);
  const [payPhone, setPayPhone] = useState("");
  const [ordering, setOrdering] = useState(false);
  const [checkoutStep, setCheckoutStep] = useState<"cart" | "ussd" | "otp">("cart");
  const [ussdCode, setUssdCode] = useState("");
  const [currentOrderId, setCurrentOrderId] = useState<number | null>(null);
  const [otp, setOtp] = useState("");
  const [confirming, setConfirming] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await getProducts();
      setProducts(Array.isArray(res) ? (res as unknown as Product[]) : []);
    } catch {
      setProducts([]);
    }
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const onRefresh = () => { setRefreshing(true); load(); };

  const addToCart = (product: Product) => {
    setCart((prev) => {
      const existing = prev.find((c) => c.product.id === product.id);
      if (existing) return prev.map((c) => c.product.id === product.id ? { ...c, quantity: c.quantity + 1 } : c);
      return [...prev, { product, quantity: 1 }];
    });
  };

  const removeFromCart = (productId: number) => {
    setCart((prev) => {
      const existing = prev.find((c) => c.product.id === productId);
      if (existing && existing.quantity > 1) return prev.map((c) => c.product.id === productId ? { ...c, quantity: c.quantity - 1 } : c);
      return prev.filter((c) => c.product.id !== productId);
    });
  };

  const totalPrice = cart.reduce((sum, c) => sum + c.product.price * c.quantity, 0);
  const totalItems = cart.reduce((sum, c) => sum + c.quantity, 0);

  const handleCheckout = async () => {
    if (cart.length === 0) return;
    const cleanPhone = payPhone.replace(/\s/g, "");
    const digits = cleanPhone.replace(/\+/g, "");
    if (!cleanPhone || digits.length < 8 || digits.length > 15) {
      Alert.alert("Erreur", "Entrez un numéro Orange Money valide (ex: 07XXXXXX)");
      return;
    }
    setOrdering(true);
    try {
      const orderRes = await createOrder({ items: cart.map((c) => ({ product_id: c.product.id, quantity: c.quantity })) });
      const order = orderRes as { id: number };
      setCurrentOrderId(order.id);
      const ussdRes = await getOMUssdCode(order.id);
      const ussd = ussdRes as { ussd_code: string };
      setUssdCode(ussd.ussd_code);
      setCheckoutStep("ussd");
    } catch (e: unknown) {
      Alert.alert("Erreur", (e as Error).message);
    }
    setOrdering(false);
  };

  const handleConfirmOTP = async () => {
    if (!currentOrderId || !otp.trim() || !payPhone.trim()) return;
    setConfirming(true);
    try {
      const cleanPhone = payPhone.replace(/\s/g, "");
      const res = await confirmOMPayment(currentOrderId, cleanPhone, otp.trim());
      const pay = res as { status?: string; message?: string; error?: string };
      if (pay.status === "paid") {
        Alert.alert("Succès", "Paiement confirmé ! Commande en cours de traitement.");
        setCart([]);
        setShowCart(false);
        setPayPhone("");
        setOtp("");
        setCheckoutStep("cart");
        setCurrentOrderId(null);
        router.push("/orders");
      } else {
        Alert.alert("Échec", pay.message || pay.error || "Paiement échoué. Vérifiez le code OTP.");
      }
    } catch (e: unknown) {
      Alert.alert("Erreur", (e as Error).message);
    }
    setConfirming(false);
  };

  const resetCheckout = () => {
    setCheckoutStep("cart");
    setUssdCode("");
    setOtp("");
    setCurrentOrderId(null);
  };

  const formatPrice = (price: number) => price.toLocaleString("fr-FR") + " FCFA";

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <FlatList
        data={products}
        keyExtractor={(item) => item.id.toString()}
        numColumns={2}
        contentContainerStyle={{ padding: 8 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={() => router.push({ pathname: "/product/[id]", params: { id: item.id } })}
          >
            <Image
              source={{ uri: item.image_url || "https://via.placeholder.com/150/1a1a1a/666?text=Produit" }}
              style={[styles.image, { backgroundColor: colors.cardSecondary }]}
            />
            <Text style={[styles.productName, { color: colors.text }]} numberOfLines={1}>
              {item.name}
            </Text>
            <Text style={[styles.price, { color: colors.accent }]}>{formatPrice(item.price)}</Text>
            {item.stock > 0 ? (
              <TouchableOpacity style={[styles.addBtn, { backgroundColor: colors.accent }]} onPress={() => addToCart(item)}>
                <Ionicons name="add" size={18} color="#fff" />
                <Text style={styles.addText}>Ajouter</Text>
              </TouchableOpacity>
            ) : (
              <Text style={[styles.outOfStock, { color: colors.error }]}>Rupture</Text>
            )}
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={{ flex: 1, justifyContent: "center", alignItems: "center", padding: 40 }}>
            <Ionicons name="bag-outline" size={64} color={colors.border} />
            <Text style={{ color: colors.textMuted, fontSize: 16, marginTop: 16 }}>Aucun produit disponible</Text>
          </View>
        }
      />

      {totalItems > 0 && (
        <TouchableOpacity style={styles.fab} onPress={() => setShowCart(true)}>
          <Ionicons name="cart" size={24} color="#fff" />
          <View style={styles.fabBadge}>
            <Text style={styles.fabBadgeText}>{totalItems}</Text>
          </View>
        </TouchableOpacity>
      )}

      <Modal visible={showCart} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                {checkoutStep === "cart" ? "Panier" : checkoutStep === "ussd" ? "Code USSD" : "Confirmation"}
              </Text>
              <TouchableOpacity onPress={() => { setShowCart(false); resetCheckout(); }}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            {checkoutStep === "cart" && (
              <>
                <FlatList
                  data={cart}
                  keyExtractor={(item) => item.product.id.toString()}
                  renderItem={({ item }) => (
                    <View style={[styles.cartRow, { borderBottomColor: colors.border }]}>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.cartName, { color: colors.text }]}>{item.product.name}</Text>
                        <Text style={[styles.cartPrice, { color: colors.textSecondary }]}>
                          {formatPrice(item.product.price)} × {item.quantity}
                        </Text>
                      </View>
                      <View style={styles.qtyRow}>
                        <TouchableOpacity onPress={() => removeFromCart(item.product.id)}>
                          <Ionicons name="remove-circle" size={28} color={colors.error} />
                        </TouchableOpacity>
                        <Text style={[styles.qtyText, { color: colors.text }]}>{item.quantity}</Text>
                        <TouchableOpacity onPress={() => addToCart(item.product)}>
                          <Ionicons name="add-circle" size={28} color={colors.accent} />
                        </TouchableOpacity>
                      </View>
                    </View>
                  )}
                />
                <View style={[styles.totalRow, { borderTopColor: colors.border }]}>
                  <Text style={[styles.totalLabel, { color: colors.text }]}>Total</Text>
                  <Text style={[styles.totalPrice, { color: colors.accent }]}>{formatPrice(totalPrice)}</Text>
                </View>
                <TextInput
                  style={[styles.phoneInput, { backgroundColor: colors.inputBg, color: colors.inputText }]}
                  value={payPhone}
                  onChangeText={setPayPhone}
                  placeholder="07XXXXXX"
                  placeholderTextColor={colors.placeholder}
                  keyboardType="phone-pad"
                />
                <TouchableOpacity
                  style={[styles.checkoutBtn, { backgroundColor: colors.orange }, ordering && { opacity: 0.5 }]}
                  onPress={handleCheckout}
                  disabled={ordering}
                >
                  {ordering ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <>
                      <Ionicons name="phone-portrait" size={20} color="#fff" />
                      <Text style={styles.checkoutText}>Commander {formatPrice(totalPrice)}</Text>
                    </>
                  )}
                </TouchableOpacity>
              </>
            )}

            {checkoutStep === "ussd" && (
              <View style={{ alignItems: "center", paddingVertical: 20 }}>
                <Text style={{ color: colors.orange, fontSize: 14, marginBottom: 12, textAlign: "center" }}>
                  Composez ce code USSD sur votre téléphone :
                </Text>
                <View style={[styles.ussdBox, { backgroundColor: colors.inputBg }]}>
                  <Text style={{ color: colors.orange, fontSize: 24, fontWeight: "bold", fontFamily: "monospace", textAlign: "center" }}>
                    {ussdCode}
                  </Text>
                </View>
                <Text style={{ color: colors.textSecondary, fontSize: 12, textAlign: "center", marginBottom: 24 }}>
                  Vous recevrez un code OTP par SMS après validation
                </Text>
                <TouchableOpacity
                  style={[styles.checkoutBtn, { backgroundColor: colors.accent, width: "100%" }]}
                  onPress={() => setCheckoutStep("otp")}
                >
                  <Ionicons name="checkmark-circle" size={20} color="#fff" />
                  <Text style={styles.checkoutText}>J&apos;ai reçu mon code OTP</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={resetCheckout} style={{ marginTop: 16 }}>
                  <Text style={{ color: colors.textMuted, fontSize: 13 }}>Annuler</Text>
                </TouchableOpacity>
              </View>
            )}

            {checkoutStep === "otp" && (
              <View style={{ paddingVertical: 20 }}>
                <Text style={{ color: colors.textSecondary, fontSize: 13, marginBottom: 8 }}>Code OTP reçu par SMS</Text>
                <TextInput
                  style={[styles.phoneInput, { backgroundColor: colors.inputBg, color: colors.inputText, textAlign: "center", fontSize: 20, letterSpacing: 4 }]}
                  value={otp}
                  onChangeText={setOtp}
                  placeholder="Code OTP"
                  placeholderTextColor={colors.placeholder}
                  keyboardType="number-pad"
                  maxLength={10}
                />
                <TouchableOpacity
                  style={[styles.checkoutBtn, { backgroundColor: "#16a34a" }, (confirming || !otp.trim()) && { opacity: 0.5 }]}
                  onPress={handleConfirmOTP}
                  disabled={confirming || !otp.trim()}
                >
                  {confirming ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <>
                      <Ionicons name="checkmark-done" size={20} color="#fff" />
                      <Text style={styles.checkoutText}>Confirmer le paiement</Text>
                    </>
                  )}
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setCheckoutStep("ussd")} style={{ marginTop: 16, alignItems: "center" }}>
                  <Text style={{ color: colors.textMuted, fontSize: 13 }}>← Revoir le code USSD</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    margin: 8,
    borderRadius: 12,
    overflow: "hidden",
    maxWidth: "48%",
    borderWidth: 1,
  },
  image: { width: "100%", height: 120 },
  productName: { fontSize: 14, fontWeight: "600", padding: 8, paddingBottom: 0 },
  price: { fontSize: 14, fontWeight: "bold", paddingHorizontal: 8, paddingTop: 4 },
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    margin: 8,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
  },
  addText: { color: "#fff", fontSize: 12, fontWeight: "600" },
  outOfStock: { fontSize: 12, textAlign: "center", padding: 8 },
  fab: {
    position: "absolute",
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#2563eb",
    justifyContent: "center",
    alignItems: "center",
    elevation: 8,
    shadowColor: "#2563eb",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  fabBadge: {
    position: "absolute",
    top: -2,
    right: -2,
    backgroundColor: "#ef4444",
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 4,
  },
  fabBadgeText: { color: "#fff", fontSize: 11, fontWeight: "bold" },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "flex-end" },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: "80%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  modalTitle: { fontSize: 20, fontWeight: "bold" },
  cartRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  cartName: { fontSize: 15, fontWeight: "500" },
  cartPrice: { fontSize: 13, marginTop: 2 },
  qtyRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  qtyText: { fontSize: 16, fontWeight: "bold", minWidth: 20, textAlign: "center" },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 16,
    borderTopWidth: 1,
    marginTop: 8,
  },
  totalLabel: { fontSize: 18, fontWeight: "600" },
  totalPrice: { fontSize: 20, fontWeight: "bold" },
  phoneInput: {
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    marginBottom: 12,
  },
  checkoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  checkoutText: { color: "#fff", fontSize: 16, fontWeight: "bold" },
  ussdBox: {
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
    marginBottom: 12,
  },
});

export default function ShopScreen() {
  return (
    <PremiumGate feature="Boutique" icon="bag-outline" tone="#f97316">
      <ShopScreenInner />
    </PremiumGate>
  );
}
