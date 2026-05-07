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
  Modal,
  TextInput,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { getOrders, initiatePayment } from "@/lib/api";
import ScreenState from "@/app/components/ScreenState";
import { isValidPhone, normalizePhone } from "@/lib/validation";
import { useTheme } from "@/lib/theme-context";

interface Order {
  id: number;
  total_amount: number;
  status: string;
  created_at: string;
  items: { product_name: string; quantity: number; price: number }[];
}

export default function OrdersScreen() {
  const { colors } = useTheme();
  const PAGE_SIZE = 20;
  const [orders, setOrders] = useState<Order[]>([]);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [retryingOrderId, setRetryingOrderId] = useState<number | null>(null);
  const [retryModalVisible, setRetryModalVisible] = useState(false);
  const [retryPhone, setRetryPhone] = useState("");
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await getOrders();
      const rows = Array.isArray(res) ? (res as unknown as Order[]) : [];
      setOrders(rows);
      setVisibleCount(PAGE_SIZE);
      setError(null);
    } catch (err) {
      setOrders([]);
      setError((err as Error)?.message || "Impossible de charger les commandes");
    }
    setLoading(false);
    setRefreshing(false);
  }, [PAGE_SIZE]);

  useEffect(() => { load(); }, [load]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const onRefresh = () => { setRefreshing(true); setError(null); load(); };
  const loadMore = () => {
    if (visibleCount >= orders.length) return;
    setVisibleCount((prev) => prev + PAGE_SIZE);
  };

  const statusColor = (s: string) => {
    switch (s) {
      case "paid": return "#22c55e";
      case "delivered": return "#3b82f6";
      case "pending": return "#f59e0b";
      case "preparing": return "#8b5cf6";
      case "shipped": return "#3b82f6";
      case "payment_failed":
      case "canceled": return "#ef4444";
      case "payment_expired": return colors.textMuted;
      default: return colors.textMuted;
    }
  };

  const statusLabel = (s: string) => {
    switch (s) {
      case "pending": return "En attente";
      case "paid": return "Payée";
      case "preparing": return "En préparation";
      case "shipped": return "Expédiée";
      case "delivered": return "Livrée";
      case "payment_failed": return "Échec paiement";
      case "payment_expired": return "Expiré";
      case "canceled": return "Annulée";
      case "confirmed": return "Confirmée";
      default: return s;
    }
  };

  const canRetryPayment = (s: string) => s === "pending" || s === "payment_failed" || s === "payment_expired";

  const handleRetry = async (orderId: number) => {
    setRetryingOrderId(orderId);
    setRetryModalVisible(true);
  };

  const confirmRetry = async () => {
    if (!retryingOrderId) return;
    const cleanPhone = normalizePhone(retryPhone);
    if (!isValidPhone(cleanPhone)) { Alert.alert("Erreur", "Numéro invalide"); return; }
    try {
      const res = await initiatePayment({ order_id: retryingOrderId, phone: cleanPhone });
      const pay = res as { payment_url?: string; ussd_code?: string; message?: string };
      if (pay.payment_url) {
        await Linking.openURL(pay.payment_url);
      } else if (pay.ussd_code) {
        Alert.alert("Code USSD", `Composez ${pay.ussd_code} puis confirmez le paiement Orange Money.`);
      } else {
        Alert.alert("Succès", pay.message || "Paiement simulé !");
      }
      setRetryModalVisible(false);
      setRetryingOrderId(null);
      setRetryPhone("");
      load();
    } catch (e: unknown) {
      Alert.alert("Erreur", (e as Error).message);
    }
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
  };

  const formatPrice = (price: number) => price.toLocaleString("fr-FR") + " FCFA";

  if (loading) {
    return <ScreenState mode="loading" title="Chargement..." subtitle="Récupération des commandes" />;
  }

  if (error && orders.length === 0) {
    return (
      <ScreenState
        mode="error"
        title="Erreur de chargement"
        subtitle={error}
        buttonLabel="Réessayer"
        onPressButton={() => { setLoading(true); load(); }}
      />
    );
  }

  if (orders.length === 0) {
    return <ScreenState mode="empty" title="Aucune commande" subtitle="Tes commandes apparaîtront ici." />;
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <FlatList
        data={orders.slice(0, visibleCount)}
        keyExtractor={(item) => item.id.toString()}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />
        }
        onEndReached={loadMore}
        onEndReachedThreshold={0.4}
        ListFooterComponent={
          visibleCount < orders.length ? (
            <View style={styles.footer}>
              <ActivityIndicator size="small" color={colors.accent} />
            </View>
          ) : null
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.card, { backgroundColor: colors.card }]}
            onPress={() => router.push({ pathname: "/order/[id]", params: { id: item.id } })}
          >
            <View style={styles.cardHeader}>
              <Text style={{ color: colors.text, fontSize: 16, fontWeight: "600" }}>Commande #{item.id}</Text>
              <View style={[styles.statusBadge, { backgroundColor: statusColor(item.status) + "20" }]}>
                <Text style={[styles.statusText, { color: statusColor(item.status) }]}>
                  {statusLabel(item.status)}
                </Text>
              </View>
            </View>
            <Text style={{ color: colors.textMuted, fontSize: 13, marginTop: 4 }}>{formatDate(item.created_at)}</Text>
            <View style={styles.cardFooter}>
              <Text style={{ color: colors.accent, fontSize: 18, fontWeight: "bold" }}>{formatPrice(item.total_amount)}</Text>
              {canRetryPayment(item.status) && (
                <TouchableOpacity style={styles.retryBtn} onPress={() => handleRetry(item.id)}>
                  <Ionicons name="refresh" size={14} color="#f97316" />
                  <Text style={styles.retryText}>{item.status === "pending" ? "Payer" : "Réessayer"}</Text>
                </TouchableOpacity>
              )}
            </View>
          </TouchableOpacity>
        )}
      />
      <Modal visible={retryModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: colors.card }]}>
            <Text style={{ color: colors.text, fontSize: 16, fontWeight: "700" }}>Paiement Orange Money</Text>
            <Text style={{ color: colors.textMuted, fontSize: 13, marginTop: 4, marginBottom: 12 }}>Entrez votre numéro Orange Money</Text>
            <TextInput
              style={[styles.modalInput, { backgroundColor: colors.inputBg, color: colors.inputText }]}
              value={retryPhone}
              onChangeText={setRetryPhone}
              placeholder="07XXXXXX"
              placeholderTextColor={colors.placeholder}
              keyboardType="phone-pad"
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalCancelBtn, { borderColor: colors.border }]}
                onPress={() => setRetryModalVisible(false)}
              >
                <Text style={{ color: colors.textSecondary, fontSize: 13, fontWeight: "600" }}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalConfirmBtn, { backgroundColor: colors.orange }]} onPress={confirmRetry}>
                <Text style={styles.modalConfirmText}>Valider</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  footer: { paddingVertical: 14 },
  card: { margin: 12, marginBottom: 0, borderRadius: 12, padding: 16 },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  statusText: { fontSize: 12, fontWeight: "600" },
  cardFooter: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 8 },
  retryBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: "#f9731620",
  },
  retryText: { color: "#f97316", fontSize: 12, fontWeight: "600" },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "center", padding: 20 },
  modalCard: { borderRadius: 12, padding: 16 },
  modalInput: { borderRadius: 10, padding: 12, marginTop: 4 },
  modalActions: { flexDirection: "row", justifyContent: "flex-end", gap: 8, marginTop: 14 },
  modalCancelBtn: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 10 },
  modalConfirmBtn: { borderRadius: 8, paddingHorizontal: 14, paddingVertical: 10 },
  modalConfirmText: { color: "#fff", fontSize: 13, fontWeight: "700" },
});
