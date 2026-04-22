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
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { getMyWellnessBookings, cancelWellnessBooking } from "@/lib/api";

interface Booking {
  id: number;
  service_name: string;
  provider_name: string;
  date: string;
  time: string;
  status: string;
  notes?: string;
}

export default function BookingsScreen() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await getMyWellnessBookings();
      setBookings(res as unknown as Booking[]);
    } catch {
      /* empty */
    }
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleCancel = (b: Booking) => {
    Alert.alert("Annuler", `Annuler le rendez-vous "${b.service_name}" ?`, [
      { text: "Non", style: "cancel" },
      {
        text: "Annuler",
        style: "destructive",
        onPress: async () => {
          try {
            await cancelWellnessBooking(b.id);
            load();
          } catch {
            /* empty */
          }
        },
      },
    ]);
  };

  const statusLabel = (s: string) => {
    switch (s) {
      case "pending":
        return "En attente";
      case "confirmed":
        return "Confirmé";
      case "completed":
        return "Terminé";
      case "cancelled":
        return "Annulé";
      default:
        return s;
    }
  };

  const statusColor = (s: string) => {
    switch (s) {
      case "confirmed":
        return "#22c55e";
      case "pending":
        return "#f59e0b";
      case "cancelled":
        return "#ef4444";
      default:
        return "#666";
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#7c3aed" />
      </View>
    );
  }

  if (bookings.length === 0) {
    return (
      <View style={styles.center}>
        <Ionicons name="calendar-outline" size={64} color="#333" />
        <Text style={styles.emptyText}>Aucun rendez-vous</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={bookings}
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
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.serviceName}>{item.service_name}</Text>
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
            <Text style={styles.providerName}>{item.provider_name}</Text>
            <View style={styles.infoRow}>
              <Ionicons name="calendar" size={14} color="#7c3aed" />
              <Text style={styles.infoText}>
                {item.date} à {item.time}
              </Text>
            </View>
            {item.status === "pending" || item.status === "confirmed" ? (
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => handleCancel(item)}
              >
                <Text style={styles.cancelText}>Annuler</Text>
              </TouchableOpacity>
            ) : null}
          </View>
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
  serviceName: { color: "#fff", fontSize: 16, fontWeight: "600", flex: 1 },
  providerName: { color: "#999", fontSize: 14, marginTop: 2 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  statusText: { fontSize: 12, fontWeight: "600" },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 8,
  },
  infoText: { color: "#ccc", fontSize: 14 },
  cancelBtn: {
    alignSelf: "flex-start",
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#ef4444",
    marginTop: 10,
  },
  cancelText: { color: "#ef4444", fontSize: 13, fontWeight: "500" },
});
