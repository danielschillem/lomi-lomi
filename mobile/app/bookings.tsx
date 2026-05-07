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
import { useTheme } from "@/lib/theme-context";

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
  const { colors } = useTheme();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await getMyWellnessBookings();
      setBookings(Array.isArray(res) ? (res as unknown as Booking[]) : []);
    } catch {
      setBookings([]);
    }
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleCancel = (b: Booking) => {
    Alert.alert("Annuler", `Annuler le rendez-vous "${b.service_name}" ?`, [
      { text: "Non", style: "cancel" },
      {
        text: "Annuler",
        style: "destructive",
        onPress: async () => {
          try { await cancelWellnessBooking(b.id); load(); } catch { /* empty */ }
        },
      },
    ]);
  };

  const statusLabel = (s: string) => {
    switch (s) {
      case "pending": return "En attente";
      case "confirmed": return "Confirmé";
      case "completed": return "Terminé";
      case "cancelled": return "Annulé";
      default: return s;
    }
  };

  const statusColor = (s: string) => {
    switch (s) {
      case "confirmed": return "#22c55e";
      case "pending": return "#f59e0b";
      case "cancelled": return "#ef4444";
      default: return colors.textMuted;
    }
  };

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  if (bookings.length === 0) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, justifyContent: "center", alignItems: "center" }}>
        <Ionicons name="calendar-outline" size={64} color={colors.border} />
        <Text style={{ color: colors.textMuted, fontSize: 16, marginTop: 16 }}>Aucun rendez-vous</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <FlatList
        data={bookings}
        keyExtractor={(item) => item.id.toString()}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); load(); }}
            tintColor={colors.accent}
          />
        }
        renderItem={({ item }) => (
          <View style={[styles.card, { backgroundColor: colors.card }]}>
            <View style={styles.cardHeader}>
              <Text style={[styles.serviceName, { color: colors.text }]}>{item.service_name}</Text>
              <View style={[styles.statusBadge, { backgroundColor: statusColor(item.status) + "20" }]}>
                <Text style={[styles.statusText, { color: statusColor(item.status) }]}>
                  {statusLabel(item.status)}
                </Text>
              </View>
            </View>
            <Text style={{ color: colors.textMuted, fontSize: 14, marginTop: 2 }}>{item.provider_name}</Text>
            <View style={styles.infoRow}>
              <Ionicons name="calendar" size={14} color={colors.accent} />
              <Text style={{ color: colors.textSecondary, fontSize: 14 }}>{item.date} à {item.time}</Text>
            </View>
            {(item.status === "pending" || item.status === "confirmed") ? (
              <TouchableOpacity style={styles.cancelBtn} onPress={() => handleCancel(item)}>
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
  card: { margin: 12, marginBottom: 0, borderRadius: 12, padding: 16 },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  serviceName: { fontSize: 16, fontWeight: "600", flex: 1 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  statusText: { fontSize: 12, fontWeight: "600" },
  infoRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 8 },
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
