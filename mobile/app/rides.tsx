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

interface Ride {
  id: number;
  pickup_address: string;
  dropoff_address: string;
  status: string;
  created_at: string;
  estimated_price?: number;
}

export default function RidesScreen() {
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

  useEffect(() => {
    load();
  }, [load]);

  const statusLabel = (s: string) => {
    switch (s) {
      case "requested":
        return "Demandée";
      case "accepted":
        return "Acceptée";
      case "in_progress":
        return "En cours";
      case "completed":
        return "Terminée";
      case "cancelled":
        return "Annulée";
      default:
        return s;
    }
  };

  const statusColor = (s: string) => {
    switch (s) {
      case "accepted":
      case "in_progress":
        return "#7c3aed";
      case "completed":
        return "#22c55e";
      case "cancelled":
        return "#ef4444";
      default:
        return "#f59e0b";
    }
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#7c3aed" />
      </View>
    );
  }

  if (rides.length === 0) {
    return (
      <View style={styles.center}>
        <Ionicons name="car-outline" size={64} color="#333" />
        <Text style={styles.emptyText}>Aucune course</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={rides}
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
                pathname: "/ride/[id]",
                params: { id: item.id },
              })
            }
          >
            <View style={styles.cardHeader}>
              <Ionicons name="car" size={20} color="#7c3aed" />
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
            <View style={styles.routeRow}>
              <Ionicons name="ellipse" size={8} color="#22c55e" />
              <Text style={styles.routeText} numberOfLines={1}>
                {item.pickup_address}
              </Text>
            </View>
            <View style={styles.routeRow}>
              <Ionicons name="ellipse" size={8} color="#ef4444" />
              <Text style={styles.routeText} numberOfLines={1}>
                {item.dropoff_address}
              </Text>
            </View>
            <Text style={styles.date}>{formatDate(item.created_at)}</Text>
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
    marginBottom: 10,
  },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  statusText: { fontSize: 12, fontWeight: "600" },
  routeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginVertical: 2,
  },
  routeText: { color: "#ccc", fontSize: 14, flex: 1 },
  date: { color: "#666", fontSize: 12, marginTop: 8 },
});
