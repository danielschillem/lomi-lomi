import { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Alert,
  TouchableOpacity,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { getMyReservations, cancelReservation } from "@/lib/api";
import { useTheme } from "@/lib/theme-context";
import PremiumGate from "@/app/components/PremiumGate";

interface Reservation {
  id: number;
  place_name: string;
  date: string;
  time: string;
  guests: number;
  status: string;
}

function ReservationsScreenInner() {
  const { colors } = useTheme();
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await getMyReservations();
      setReservations(Array.isArray(res) ? (res as unknown as Reservation[]) : []);
    } catch {
      setReservations([]);
    }
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleCancel = (r: Reservation) => {
    Alert.alert("Annuler", `Annuler la réservation au "${r.place_name}" ?`, [
      { text: "Non", style: "cancel" },
      {
        text: "Annuler",
        style: "destructive",
        onPress: async () => {
          try { await cancelReservation(r.id); load(); } catch { /* empty */ }
        },
      },
    ]);
  };

  const statusLabel = (s: string) => {
    switch (s) {
      case "pending": return "En attente";
      case "confirmed": return "Confirmée";
      case "cancelled": return "Annulée";
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

  if (reservations.length === 0) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, justifyContent: "center", alignItems: "center" }}>
        <Ionicons name="restaurant-outline" size={64} color={colors.border} />
        <Text style={{ color: colors.textMuted, fontSize: 16, marginTop: 16 }}>Aucune réservation</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <FlatList
        data={reservations}
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
              <Text style={[styles.placeName, { color: colors.text }]}>{item.place_name}</Text>
              <View style={[styles.statusBadge, { backgroundColor: statusColor(item.status) + "20" }]}>
                <Text style={[styles.statusText, { color: statusColor(item.status) }]}>
                  {statusLabel(item.status)}
                </Text>
              </View>
            </View>
            <View style={styles.infoRow}>
              <Ionicons name="calendar" size={14} color={colors.accent} />
              <Text style={{ color: colors.textSecondary, fontSize: 14 }}>{item.date} à {item.time}</Text>
            </View>
            <View style={styles.infoRow}>
              <Ionicons name="people" size={14} color={colors.accent} />
              <Text style={{ color: colors.textSecondary, fontSize: 14 }}>
                {item.guests} personne{item.guests > 1 ? "s" : ""}
              </Text>
            </View>
            {(item.status === "pending" || item.status === "confirmed") && (
              <TouchableOpacity style={styles.cancelBtn} onPress={() => handleCancel(item)}>
                <Text style={styles.cancelText}>Annuler</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: { margin: 12, marginBottom: 0, borderRadius: 12, padding: 16 },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  placeName: { fontSize: 16, fontWeight: "600", flex: 1 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  statusText: { fontSize: 12, fontWeight: "600" },
  infoRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 6 },
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

export default function ReservationsScreen() {
  return (
    <PremiumGate feature="Réservations" icon="restaurant-outline" tone="#22c55e">
      <ReservationsScreenInner />
    </PremiumGate>
  );
}
