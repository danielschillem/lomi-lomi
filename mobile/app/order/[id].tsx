import { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { useLocalSearchParams, Stack } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { checkPaymentStatus, getOrderTracking } from "@/lib/api";

export default function OrderDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [payment, setPayment] = useState<Record<string, unknown> | null>(null);
  const [tracking, setTracking] = useState<Record<string, unknown> | null>(
    null,
  );
  const [loading, setLoading] = useState(true);

  const orderId = parseInt(id || "0", 10);

  useEffect(() => {
    (async () => {
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
    })();
  }, [orderId]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#7c3aed" />
      </View>
    );
  }

  const payStatus = (payment?.status as string) || "unknown";
  const trackStatus = (tracking?.status as string) || "";

  return (
    <ScrollView style={styles.container}>
      <Stack.Screen options={{ title: `Commande #${orderId}` }} />

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Paiement</Text>
        <View style={styles.row}>
          <Ionicons
            name={payStatus === "paid" ? "checkmark-circle" : "time"}
            size={24}
            color={payStatus === "paid" ? "#22c55e" : "#f59e0b"}
          />
          <Text style={styles.label}>
            {payStatus === "paid"
              ? "Payée"
              : payStatus === "pending"
                ? "En attente"
                : payStatus}
          </Text>
        </View>
        {payment?.transaction_id && (
          <Text style={styles.detail}>
            Transaction: {payment.transaction_id as string}
          </Text>
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
});
