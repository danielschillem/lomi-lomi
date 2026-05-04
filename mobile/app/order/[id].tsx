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
  const [payment, setPayment] = useState<Record<string, unknown> | null>(null);
  const [tracking, setTracking] = useState<Record<string, unknown> | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [retrying, setRetrying] = useState(false);

  const orderId = parseInt(id || "0", 10);

  const loadData = async () => {
    try {
      const [pay, track] = await Promise.all([
        checkPaymentStatus(orderId).catch(() => null),
        getOrderTracking(orderId).catch(() => null),
      ]);
      setPayment(pay);
      setTracking(track);
    } catch {
      /* empty */
    }
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, [orderId]);

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
    Alert.prompt(
      "Paiement Orange Money",
      "Entrez votre numéro Orange Money",
      async (phone) => {
        if (!phone || phone.replace(/[+\s]/g, "").length < 8) {
          Alert.alert("Erreur", "Numéro invalide");
          return;
        }
        setRetrying(true);
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
          setLoading(true);
          loadData();
        } catch (e: unknown) {
          Alert.alert("Erreur", (e as Error).message);
        }
        setRetrying(false);
      },
      "plain-text",
      "",
      "phone-pad",
    );
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#7c3aed" />
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
});
