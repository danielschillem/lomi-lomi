import { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Linking,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { getOrders, initiatePayment } from "@/lib/api";

interface Order {
  id: number;
  total_amount: number;
  status: string;
  created_at: string;
  items: { product_name: string; quantity: number; price: number }[];
}

export default function OrdersScreen() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await getOrders();
      setOrders(Array.isArray(res) ? (res as unknown as Order[]) : []);
    } catch {
      setOrders([]);
    }
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const statusColor = (s: string) => {
    switch (s) {
      case "paid":
        return "#22c55e";
      case "delivered":
        return "#3b82f6";
      case "pending":
        return "#f59e0b";
      case "preparing":
        return "#8b5cf6";
      case "shipped":
        return "#3b82f6";
      case "payment_failed":
      case "canceled":
        return "#ef4444";
      case "payment_expired":
        return "#6b7280";
      default:
        return "#666";
    }
  };

  const statusLabel = (s: string) => {
    switch (s) {
      case "pending":
        return "En attente";
      case "paid":
        return "Payée";
      case "preparing":
        return "En préparation";
      case "shipped":
        return "Expédiée";
      case "delivered":
        return "Livrée";
      case "payment_failed":
        return "Échec paiement";
      case "payment_expired":
        return "Expiré";
      case "canceled":
        return "Annulée";
      case "confirmed":
        return "Confirmée";
      default:
        return s;
    }
  };

  const canRetryPayment = (s: string) =>
    s === "pending" || s === "payment_failed" || s === "payment_expired";

  const handleRetry = async (orderId: number) => {
    Alert.prompt(
      "Paiement Orange Money",
      "Entrez votre numéro Orange Money",
      async (phone) => {
        if (!phone || phone.replace(/[+\s]/g, "").length < 8) {
          Alert.alert("Erreur", "Numéro invalide");
          return;
        }
        try {
          const res = await initiatePayment({
            order_id: orderId,
            phone: phone.trim(),
          });
          const pay = res as { payment_url?: string; message?: string };
          if (pay.payment_url) {
            await Linking.openURL(pay.payment_url);
          } else {
            Alert.alert("Succès", pay.message || "Paiement simulé !");
          }
          load();
        } catch (e: unknown) {
          Alert.alert("Erreur", (e as Error).message);
        }
      },
      "plain-text",
      "",
      "phone-pad",
    );
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const formatPrice = (price: number) =>
    price.toLocaleString("fr-FR") + " FCFA";

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#7c3aed" />
      </View>
    );
  }

  if (orders.length === 0) {
    return (
      <View style={styles.center}>
        <Ionicons name="receipt-outline" size={64} color="#333" />
        <Text style={styles.emptyText}>Aucune commande</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={orders}
        keyExtractor={(item) => item.id.toString()}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              load();
            }}
            tintColor="#7c3aed"
          />
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.card}
            onPress={() =>
              router.push({
                pathname: "/order/[id]",
                params: { id: item.id },
              })
            }
          >
            <View style={styles.cardHeader}>
              <Text style={styles.orderId}>Commande #{item.id}</Text>
              <View
                style={[
                  styles.statusBadge,
                  { backgroundColor: statusColor(item.status) + "20" },
                ]}
              >
                <Text
                  style={[
                    styles.statusText,
                    { color: statusColor(item.status) },
                  ]}
                >
                  {statusLabel(item.status)}
                </Text>
              </View>
            </View>
            <Text style={styles.date}>{formatDate(item.created_at)}</Text>
            <View style={styles.cardFooter}>
              <Text style={styles.total}>{formatPrice(item.total_amount)}</Text>
              {canRetryPayment(item.status) && (
                <TouchableOpacity
                  style={styles.retryBtn}
                  onPress={() => handleRetry(item.id)}
                >
                  <Ionicons name="refresh" size={14} color="#f97316" />
                  <Text style={styles.retryText}>
                    {item.status === "pending" ? "Payer" : "Réessayer"}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </TouchableOpacity>
        )}
      />
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
  },
  emptyText: { color: "#666", fontSize: 16, marginTop: 16 },
  card: {
    margin: 12,
    marginBottom: 0,
    backgroundColor: "#111",
    borderRadius: 12,
    padding: 16,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  orderId: { color: "#fff", fontSize: 16, fontWeight: "600" },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  statusText: { fontSize: 12, fontWeight: "600" },
  date: { color: "#666", fontSize: 13, marginTop: 4 },
  total: {
    color: "#7c3aed",
    fontSize: 18,
    fontWeight: "bold",
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 8,
  },
  retryBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: "#f9731620",
  },
  retryText: {
    color: "#f97316",
    fontSize: 12,
    fontWeight: "600",
  },
});
