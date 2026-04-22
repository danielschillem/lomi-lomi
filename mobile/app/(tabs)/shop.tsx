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
import { Ionicons } from "@expo/vector-icons";
import { getProducts, createOrder, initiatePayment } from "@/lib/api";

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

export default function ShopScreen() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [showCart, setShowCart] = useState(false);
  const [payPhone, setPayPhone] = useState("");
  const [ordering, setOrdering] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await getProducts();
      setProducts(res as unknown as Product[]);
    } catch {
      /* empty */
    }
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const onRefresh = () => {
    setRefreshing(true);
    load();
  };

  const addToCart = (product: Product) => {
    setCart((prev) => {
      const existing = prev.find((c) => c.product.id === product.id);
      if (existing) {
        return prev.map((c) =>
          c.product.id === product.id ? { ...c, quantity: c.quantity + 1 } : c,
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
  };

  const removeFromCart = (productId: number) => {
    setCart((prev) => {
      const existing = prev.find((c) => c.product.id === productId);
      if (existing && existing.quantity > 1) {
        return prev.map((c) =>
          c.product.id === productId ? { ...c, quantity: c.quantity - 1 } : c,
        );
      }
      return prev.filter((c) => c.product.id !== productId);
    });
  };

  const totalPrice = cart.reduce(
    (sum, c) => sum + c.product.price * c.quantity,
    0,
  );
  const totalItems = cart.reduce((sum, c) => sum + c.quantity, 0);

  const handleCheckout = async () => {
    if (cart.length === 0) return;
    if (!payPhone.trim()) {
      Alert.alert("Erreur", "Entrez votre numéro Orange Money");
      return;
    }
    setOrdering(true);
    try {
      const orderRes = await createOrder({
        items: cart.map((c) => ({
          product_id: c.product.id,
          quantity: c.quantity,
        })),
      });
      const order = orderRes as { id: number };
      const payRes = await initiatePayment({
        order_id: order.id,
        phone: payPhone.trim(),
      });
      const pay = payRes as { payment_url?: string; status?: string };

      if (pay.payment_url) {
        Alert.alert(
          "Paiement Orange Money",
          "Vous allez être redirigé vers Orange Money pour finaliser le paiement.",
        );
      } else {
        Alert.alert("Commande créée", "Votre commande a été enregistrée !");
      }

      setCart([]);
      setShowCart(false);
      setPayPhone("");
      router.push("/orders");
    } catch (e: unknown) {
      Alert.alert("Erreur", (e as Error).message);
    }
    setOrdering(false);
  };

  const formatPrice = (price: number) => {
    return price.toLocaleString("fr-FR") + " FCFA";
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#7c3aed" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={products}
        keyExtractor={(item) => item.id.toString()}
        numColumns={2}
        contentContainerStyle={styles.grid}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#7c3aed"
          />
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.card}
            onPress={() =>
              router.push({
                pathname: "/product/[id]",
                params: { id: item.id },
              })
            }
          >
            <Image
              source={{
                uri:
                  item.image_url ||
                  "https://via.placeholder.com/150/1a1a1a/666?text=Produit",
              }}
              style={styles.image}
            />
            <Text style={styles.productName} numberOfLines={1}>
              {item.name}
            </Text>
            <Text style={styles.price}>{formatPrice(item.price)}</Text>
            {item.stock > 0 ? (
              <TouchableOpacity
                style={styles.addBtn}
                onPress={() => addToCart(item)}
              >
                <Ionicons name="add" size={18} color="#fff" />
                <Text style={styles.addText}>Ajouter</Text>
              </TouchableOpacity>
            ) : (
              <Text style={styles.outOfStock}>Rupture</Text>
            )}
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={styles.center}>
            <Ionicons name="bag-outline" size={64} color="#333" />
            <Text style={styles.emptyText}>Aucun produit disponible</Text>
          </View>
        }
      />

      {/* Cart FAB */}
      {totalItems > 0 && (
        <TouchableOpacity style={styles.fab} onPress={() => setShowCart(true)}>
          <Ionicons name="cart" size={24} color="#fff" />
          <View style={styles.fabBadge}>
            <Text style={styles.fabBadgeText}>{totalItems}</Text>
          </View>
        </TouchableOpacity>
      )}

      {/* Cart Modal */}
      <Modal visible={showCart} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Panier</Text>
              <TouchableOpacity onPress={() => setShowCart(false)}>
                <Ionicons name="close" size={24} color="#fff" />
              </TouchableOpacity>
            </View>

            <FlatList
              data={cart}
              keyExtractor={(item) => item.product.id.toString()}
              renderItem={({ item }) => (
                <View style={styles.cartRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.cartName}>{item.product.name}</Text>
                    <Text style={styles.cartPrice}>
                      {formatPrice(item.product.price)} × {item.quantity}
                    </Text>
                  </View>
                  <View style={styles.qtyRow}>
                    <TouchableOpacity
                      onPress={() => removeFromCart(item.product.id)}
                    >
                      <Ionicons
                        name="remove-circle"
                        size={28}
                        color="#ef4444"
                      />
                    </TouchableOpacity>
                    <Text style={styles.qtyText}>{item.quantity}</Text>
                    <TouchableOpacity onPress={() => addToCart(item.product)}>
                      <Ionicons name="add-circle" size={28} color="#7c3aed" />
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            />

            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Total</Text>
              <Text style={styles.totalPrice}>{formatPrice(totalPrice)}</Text>
            </View>

            <TextInput
              style={styles.phoneInput}
              value={payPhone}
              onChangeText={setPayPhone}
              placeholder="Numéro Orange Money (ex: 0777123456)"
              placeholderTextColor="#666"
              keyboardType="phone-pad"
            />

            <TouchableOpacity
              style={[styles.checkoutBtn, ordering && { opacity: 0.5 }]}
              onPress={handleCheckout}
              disabled={ordering}
            >
              {ordering ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Ionicons name="card" size={20} color="#fff" />
                  <Text style={styles.checkoutText}>
                    Payer via Orange Money
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0a0a0a" },
  center: {
    flex: 1,
    backgroundColor: "#0a0a0a",
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
  },
  emptyText: { color: "#666", fontSize: 16, marginTop: 16 },
  grid: { padding: 8 },
  card: {
    flex: 1,
    margin: 8,
    backgroundColor: "#1a1a1a",
    borderRadius: 12,
    overflow: "hidden",
    maxWidth: "48%",
  },
  image: { width: "100%", height: 120, backgroundColor: "#222" },
  productName: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
    padding: 8,
    paddingBottom: 0,
  },
  price: {
    color: "#7c3aed",
    fontSize: 14,
    fontWeight: "bold",
    paddingHorizontal: 8,
    paddingTop: 4,
  },
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#7c3aed",
    margin: 8,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
  },
  addText: { color: "#fff", fontSize: 12, fontWeight: "600" },
  outOfStock: {
    color: "#ef4444",
    fontSize: 12,
    textAlign: "center",
    padding: 8,
  },
  fab: {
    position: "absolute",
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#7c3aed",
    justifyContent: "center",
    alignItems: "center",
    elevation: 8,
    shadowColor: "#7c3aed",
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
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#0a0a0a",
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
  modalTitle: { color: "#fff", fontSize: 20, fontWeight: "bold" },
  cartRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#1a1a1a",
  },
  cartName: { color: "#fff", fontSize: 15, fontWeight: "500" },
  cartPrice: { color: "#999", fontSize: 13, marginTop: 2 },
  qtyRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  qtyText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
    minWidth: 20,
    textAlign: "center",
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: "#333",
    marginTop: 8,
  },
  totalLabel: { color: "#fff", fontSize: 18, fontWeight: "600" },
  totalPrice: { color: "#7c3aed", fontSize: 20, fontWeight: "bold" },
  phoneInput: {
    backgroundColor: "#1a1a1a",
    color: "#fff",
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    marginBottom: 12,
  },
  checkoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#7c3aed",
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  checkoutText: { color: "#fff", fontSize: 16, fontWeight: "bold" },
});
