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
import { useTheme } from "@/lib/theme-context";

export default function RideDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useTheme();
  const [ride, setRide] = useState<Record<string, any> | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const rideId = parseInt(id || "0", 10);
  const isValidRideId = Number.isFinite(rideId) && rideId > 0;

  const loadRide = async () => {
    setLoadError(null);
    if (!isValidRideId) {
      setRide(null);
      setLoading(false);
      return;
    }
    try {
      const res = await getVTCRide(rideId);
      setRide(res);
    } catch (e: unknown) {
      setLoadError((e as Error).message || "Impossible de charger cette course.");
    }
    setLoading(false);
  };

  useEffect(() => {
    void loadRide();
  }, [isValidRideId, rideId]);

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
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  if (!isValidRideId) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.textMuted, fontSize: 15, textAlign: "center", paddingHorizontal: 24 }}>Course introuvable</Text>
      </View>
    );
  }

  if (loadError && !ride) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.textMuted, fontSize: 15, textAlign: "center", paddingHorizontal: 24 }}>{loadError}</Text>
        <TouchableOpacity
          style={[styles.retryLoadBtn, { backgroundColor: colors.accent }]}
          onPress={() => {
            setLoading(true);
            void loadRide();
          }}
        >
          <Text style={styles.retryLoadText}>Réessayer</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!ride) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.textMuted, fontSize: 15, textAlign: "center", paddingHorizontal: 24 }}>Course introuvable</Text>
      </View>
    );
  }

  const r = ride;
  const canCancel = r.status === "requested" || r.status === "accepted";

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ title: `Course #${rideId}` }} />

      <View style={[styles.card, { backgroundColor: colors.card }]}>
        <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>Trajet</Text>
        <View style={styles.routeRow}>
          <Ionicons name="ellipse" size={10} color="#22c55e" />
          <Text style={{ color: colors.text, fontSize: 15 }}>
            {(r.pickup_address as string) || "Départ"}
          </Text>
        </View>
        <View style={[styles.line, { backgroundColor: colors.border }]} />
        <View style={styles.routeRow}>
          <Ionicons name="ellipse" size={10} color="#ef4444" />
          <Text style={{ color: colors.text, fontSize: 15 }}>
            {(r.dropoff_address as string) || "Arrivée"}
          </Text>
        </View>
      </View>

      <View style={[styles.card, { backgroundColor: colors.card }]}>
        <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>Statut</Text>
        <Text style={{ color: colors.accent, fontSize: 18, fontWeight: "600" }}>{(r.status as string) || "-"}</Text>
      </View>

      {r.driver_name && (
        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>Chauffeur</Text>
          <Text style={{ color: colors.text, fontSize: 16 }}>{r.driver_name as string}</Text>
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
  container: { flex: 1, padding: 16 },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  card: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  sectionTitle: {
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
  line: {
    width: 2,
    height: 20,
    marginLeft: 4,
    marginVertical: 2,
  },
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
  retryLoadBtn: {
    marginTop: 12,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  retryLoadText: { color: "#fff", fontSize: 14, fontWeight: "600" },
});
