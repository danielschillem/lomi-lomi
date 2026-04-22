import { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
} from "react-native";
import { useLocalSearchParams, Stack } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { getVTCRide, updateVTCRideStatus } from "@/lib/api";

export default function RideDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [ride, setRide] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);

  const rideId = parseInt(id || "0", 10);

  useEffect(() => {
    (async () => {
      try {
        const res = await getVTCRide(rideId);
        setRide(res);
      } catch {
        /* empty */
      }
      setLoading(false);
    })();
  }, [rideId]);

  const handleCancel = () => {
    Alert.alert("Annuler", "Annuler cette course ?", [
      { text: "Non", style: "cancel" },
      {
        text: "Annuler la course",
        style: "destructive",
        onPress: async () => {
          try {
            await updateVTCRideStatus(rideId, { status: "cancelled" });
            setRide((prev) => (prev ? { ...prev, status: "cancelled" } : prev));
          } catch {
            /* empty */
          }
        },
      },
    ]);
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#7c3aed" />
      </View>
    );
  }

  if (!ride) {
    return (
      <View style={styles.center}>
        <Text style={{ color: "#666" }}>Course introuvable</Text>
      </View>
    );
  }

  const r = ride;
  const canCancel = r.status === "requested" || r.status === "accepted";

  return (
    <ScrollView style={styles.container}>
      <Stack.Screen options={{ title: `Course #${rideId}` }} />

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Trajet</Text>
        <View style={styles.routeRow}>
          <Ionicons name="ellipse" size={10} color="#22c55e" />
          <Text style={styles.routeText}>
            {(r.pickup_address as string) || "Départ"}
          </Text>
        </View>
        <View style={styles.line} />
        <View style={styles.routeRow}>
          <Ionicons name="ellipse" size={10} color="#ef4444" />
          <Text style={styles.routeText}>
            {(r.dropoff_address as string) || "Arrivée"}
          </Text>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Statut</Text>
        <Text style={styles.status}>{(r.status as string) || "—"}</Text>
      </View>

      {r.driver_name && (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Chauffeur</Text>
          <Text style={styles.driverName}>{r.driver_name as string}</Text>
        </View>
      )}

      {canCancel && (
        <TouchableOpacity style={styles.cancelBtn} onPress={handleCancel}>
          <Ionicons name="close-circle" size={20} color="#ef4444" />
          <Text style={styles.cancelText}>Annuler la course</Text>
        </TouchableOpacity>
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
    marginBottom: 12,
  },
  sectionTitle: {
    color: "#999",
    fontSize: 13,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 10,
  },
  routeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  routeText: { color: "#fff", fontSize: 15 },
  line: {
    width: 2,
    height: 20,
    backgroundColor: "#333",
    marginLeft: 4,
    marginVertical: 2,
  },
  status: { color: "#7c3aed", fontSize: 18, fontWeight: "600" },
  driverName: { color: "#fff", fontSize: 16 },
  cancelBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 16,
    borderWidth: 1,
    borderColor: "#ef4444",
    borderRadius: 12,
    marginTop: 8,
  },
  cancelText: { color: "#ef4444", fontSize: 16, fontWeight: "600" },
});
