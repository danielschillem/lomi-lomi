import { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { getMyVTCRides } from "@/lib/api";
import { useTheme } from "@/lib/theme-context";

interface Ride {
  id: number;
  pickup_address: string;
  dropoff_address: string;
  status: string;
  created_at: string;
  estimated_price?: number;
}

export default function RidesScreen() {
  const { colors } = useTheme();
  const [rides, setRides] = useState<Ride[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await getMyVTCRides();
      setRides(Array.isArray(res) ? (res as unknown as Ride[]) : []);
    } catch {
      setRides([]);
    }
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const statusLabel = (s: string) => {
    switch (s) {
      case "requested": return "Demandée";
      case "accepted": return "Acceptée";
      case "in_progress": return "En cours";
      case "completed": return "Terminée";
      case "cancelled": return "Annulée";
      default: return s;
    }
  };

  const statusColor = (s: string) => {
    switch (s) {
      case "accepted":
      case "in_progress": return colors.accent;
      case "completed": return "#22c55e";
      case "cancelled": return "#ef4444";
      default: return "#f59e0b";
    }
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
  };

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  if (rides.length === 0) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, justifyContent: "center", alignItems: "center" }}>
        <Ionicons name="car-outline" size={64} color={colors.border} />
        <Text style={{ color: colors.textMuted, fontSize: 16, marginTop: 16 }}>Aucune course</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <FlatList
        data={rides}
        keyExtractor={(item) => item.id.toString()}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); load(); }}
            tintColor={colors.accent}
          />
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.card, { backgroundColor: colors.card }]}
            onPress={() => router.push({ pathname: "/ride/[id]", params: { id: item.id } })}
          >
            <View style={styles.cardHeader}>
              <Ionicons name="car" size={20} color={colors.accent} />
              <View style={[styles.statusBadge, { backgroundColor: statusColor(item.status) + "20" }]}>
                <Text style={[styles.statusText, { color: statusColor(item.status) }]}>
                  {statusLabel(item.status)}
                </Text>
              </View>
            </View>
            <View style={styles.routeRow}>
              <Ionicons name="ellipse" size={8} color="#22c55e" />
              <Text style={[styles.routeText, { color: colors.textSecondary }]} numberOfLines={1}>
                {item.pickup_address}
              </Text>
            </View>
            <View style={styles.routeRow}>
              <Ionicons name="ellipse" size={8} color="#ef4444" />
              <Text style={[styles.routeText, { color: colors.textSecondary }]} numberOfLines={1}>
                {item.dropoff_address}
              </Text>
            </View>
            <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: 8 }}>{formatDate(item.created_at)}</Text>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: { margin: 12, marginBottom: 0, borderRadius: 12, padding: 16 },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  statusText: { fontSize: 12, fontWeight: "600" },
  routeRow: { flexDirection: "row", alignItems: "center", gap: 8, marginVertical: 2 },
  routeText: { fontSize: 14, flex: 1 },
});
