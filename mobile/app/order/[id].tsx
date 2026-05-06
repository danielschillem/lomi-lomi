import { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
  Linking,
  Modal,
  TextInput,
} from "react-native";
import { useLocalSearchParams, Stack } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import {
  checkPaymentStatus,
  getOrderTracking,
  initiatePayment,
} from "@/lib/api";

export default function OrderDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [payment, setPayment] = useState<Record<string, any> | null>(null);
  const [tracking, setTracking] = useState<Record<string, any> | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [retrying, setRetrying] = useState(false);
  const [retryModalVisible, setRetryModalVisible] = useState(false);
  const [retryPhone, setRetryPhone] = useState("");

  const orderId = parseInt(id || "0", 10);
  const isValidOrderId = Number.isFinite(orderId) && orderId > 0;

  const loadData = async () => {
    setLoadError(null);
    if (!isValidOrderId) {
      setPayment(null);
      setTracking(null);
      setLoading(false);
      return;
    }
    try {
      const [pay, track] = await Promise.all([
        checkPaymentStatus(orderId).catch(() => null),
        getOrderTracking(orderId).catch(() => null),
      ]);
      setPayment(pay);
      setTracking(track);
    } catch (e: unknown) {
      setLoadError((e as Error).message || "Impossible de charger la commande.");
    }
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, [isValidOrderId, orderId]);

  const payStatus = (payment?.status as string) || "unknown";
  const trackStatus = (tracking?.status as string) || "";

  const canRetry =
    payStatus === "pending" ||
    payStatus === "payment_failed" ||
    payStatus === "payment_expired";

  const statusIcon = (): { name: string; color: string } => {
    switch (payStatus) {
      case "paid":
        return { name: "checkmark-circle", color: "#22c55e" };
      case "pending":
        return { name: "time", color: "#f59e0b" };
      case "payment_failed":
        return { name: "close-circle", color: "#ef4444" };
      case "payment_expired":
        return { name: "timer-outline", color: "#6b7280" };
      case "canceled":
        return { name: "ban", color: "#ef4444" };
      case "preparing":
        return { name: "construct", color: "#8b5cf6" };
      case "shipped":
        return { name: "airplane", color: "#3b82f6" };
      case "delivered":
        return { name: "checkmark-done-circle", color: "#22c55e" };
      default:
        return { name: "help-circle", color: "#666" };
    }
  };

  const statusLabel = (): string => {
    switch (payStatus) {
      case "paid":
        return "Payée";
      case "pending":
        return "En attente de paiement";
      case "payment_failed":
        return "Échec du paiement";
      case "payment_expired":
        return "Lien de paiement expiré";
      case "canceled":
        return "Annulée";
      case "preparing":
        return "En préparation";
      case "shipped":
        return "Expédiée";
      case "delivered":
        return "Livrée";
      default:
        return payStatus;
    }
  };

  const handleRetry = () => {
    setRetryModalVisible(true);
  };

  const confirmRetry = async () => {
    if (!retryPhone || retryPhone.replace(/[+\s]/g, "").length < 8) {
      Alert.alert("Erreur", "Numéro invalide");
      return;
    }
    setRetrying(true);
    try {
      const res = await initiatePayment({
        order_id: orderId,
        phone: retryPhone.trim(),
      });
      const pay = res as { payment_url?: string; ussd_code?: string; message?: string };
      if (pay.payment_url) {
        await Linking.openURL(pay.payment_url);
      } else if (pay.ussd_code) {
        Alert.alert(
          "Code USSD",
          `Composez ${pay.ussd_code} puis confirmez le paiement Orange Money.`,
        );
      } else {
        Alert.alert("Succès", pay.message || "Paiement simulé !");
      }
      setRetryModalVisible(false);
      setRetryPhone("");
      setLoading(true);
      loadData();
    } catch (e: unknown) {
      Alert.alert("Erreur", (e as Error).message);
    }
    setRetrying(false);
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#7c3aed" />
      </View>
    );
  }

  if (!isValidOrderId) {
    return (
      <View style={styles.center}>
        <Text style={styles.emptyText}>Commande introuvable</Text>
      </View>
    );
  }

  if (loadError && !payment && !tracking) {
    return (
      <View style={styles.center}>
        <Text style={styles.emptyText}>{loadError}</Text>
        <TouchableOpacity style={styles.retryLoadBtn} onPress={() => {
          setLoading(true);
          loadData();
        }}>
          <Text style={styles.retryLoadText}>Réessayer</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const icon = statusIcon();

  return (
    <ScrollView style={styles.container}>
      <Stack.Screen options={{ title: `Commande #${orderId}` }} />

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Paiement</Text>
        <View style={styles.row}>
          <Ionicons
            name={icon.name as keyof typeof Ionicons.glyphMap}
            size={24}
            color={icon.color}
          />
          <Text style={[styles.label, { color: icon.color }]}>
            {statusLabel()}
          </Text>
        </View>
        {payment?.transaction_id && (
          <Text style={styles.detail}>
            Transaction: {payment.transaction_id as string}
          </Text>
        )}
        {canRetry && (
          <TouchableOpacity
            style={styles.retryBtn}
            onPress={handleRetry}
            disabled={retrying}
          >
            {retrying ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Ionicons name="refresh" size={16} color="#fff" />
                <Text style={styles.retryText}>
                  {payStatus === "pending"
                    ? "Payer via Orange Money"
                    : "Réessayer le paiement"}
                </Text>
              </>
            )}
          </TouchableOpacity>
        )}
      </View>

      {tracking && (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Suivi</Text>
          <View style={styles.row}>
            <Ionicons name="navigate" size={24} color="#7c3aed" />
            <Text style={styles.label}>{trackStatus || "En préparation"}</Text>
          </View>
        </View>
      )}

      <Modal visible={retryModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Paiement Orange Money</Text>
            <Text style={styles.modalDesc}>Entrez votre numéro Orange Money</Text>
            <TextInput
              style={styles.modalInput}
              value={retryPhone}
              onChangeText={setRetryPhone}
              placeholder="07XXXXXX"
              placeholderTextColor="#666"
              keyboardType="phone-pad"
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setRetryModalVisible(false)}
                disabled={retrying}
              >
                <Text style={styles.modalCancelText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalConfirmBtn, retrying && { opacity: 0.5 }]}
                onPress={confirmRetry}
                disabled={retrying}
              >
                {retrying ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.modalConfirmText}>Valider</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0a0a0a", padding: 16 },
  center: {
    flex: 1,
    backgroundColor: "#0a0a0a",
    justifyContent: "center",
    alignItems: "center",
  },
  emptyText: { color: "#666", fontSize: 15, textAlign: "center", paddingHorizontal: 24 },
  retryLoadBtn: {
    marginTop: 12,
    backgroundColor: "#7c3aed",
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  retryLoadText: { color: "#fff", fontSize: 14, fontWeight: "600" },
  card: {
    backgroundColor: "#111",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    color: "#999",
    fontSize: 13,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 12,
  },
  row: { flexDirection: "row", alignItems: "center", gap: 10 },
  label: { color: "#fff", fontSize: 16, fontWeight: "500" },
  detail: { color: "#666", fontSize: 13, marginTop: 8 },
  retryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#f97316",
    paddingVertical: 12,
    borderRadius: 10,
    marginTop: 16,
  },
  retryText: { color: "#fff", fontSize: 14, fontWeight: "600" },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    padding: 20,
  },
  modalCard: {
    backgroundColor: "#111",
    borderRadius: 12,
    padding: 16,
  },
  modalTitle: { color: "#fff", fontSize: 16, fontWeight: "700" },
  modalDesc: { color: "#999", fontSize: 13, marginTop: 4, marginBottom: 12 },
  modalInput: {
    backgroundColor: "#1a1a1a",
    color: "#fff",
    borderRadius: 10,
    padding: 12,
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 8,
    marginTop: 14,
  },
  modalCancelBtn: {
    borderWidth: 1,
    borderColor: "#333",
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  modalCancelText: { color: "#bbb", fontSize: 13, fontWeight: "600" },
  modalConfirmBtn: {
    backgroundColor: "#f97316",
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    minWidth: 78,
    alignItems: "center",
  },
  modalConfirmText: { color: "#fff", fontSize: 13, fontWeight: "700" },
});
