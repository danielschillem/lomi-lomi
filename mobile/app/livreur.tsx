import { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  RefreshControl,
  Alert,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";
import {
  getAvailableDeliveries,
  getMyDeliveries,
  acceptDelivery,
  updateDeliveryStatus,
  updateDeliveryLocation,
  type DeliveryTracking,
  type DeliveryStatus,
} from "@/lib/api";
import { useTheme } from "@/lib/theme-context";

const STATUS_LABEL: Record<DeliveryStatus, string> = {
  pending: "En attente",
  accepted: "Acceptée",
  picking_up: "En route vers le vendeur",
  picked_up: "Colis récupéré",
  delivering: "En route vers le client",
  delivered: "Livré",
  canceled: "Annulée",
};

const STATUS_BG: Record<DeliveryStatus, string> = {
  pending: "rgba(245, 158, 11, 0.15)",
  accepted: "rgba(59, 130, 246, 0.15)",
  picking_up: "rgba(124, 58, 237, 0.15)",
  picked_up: "rgba(99, 102, 241, 0.15)",
  delivering: "rgba(249, 115, 22, 0.15)",
  delivered: "rgba(34, 197, 94, 0.15)",
  canceled: "rgba(107, 114, 128, 0.15)",
};

const STATUS_FG: Record<DeliveryStatus, string> = {
  pending: "#fbbf24",
  accepted: "#60a5fa",
  picking_up: "#60a5fa",
  picked_up: "#818cf8",
  delivering: "#fb923c",
  delivered: "#22c55e",
  canceled: "#9ca3af",
};

const NEXT_STATUS: Partial<Record<DeliveryStatus, { status: DeliveryStatus; label: string }>> = {
  accepted: { status: "picking_up", label: "Je pars récupérer le colis" },
  picking_up: { status: "picked_up", label: "Colis récupéré" },
  picked_up: { status: "delivering", label: "Je pars livrer le client" },
  delivering: { status: "delivered", label: "Livraison effectuée" },
};

interface AvailableCardProps {
  d: DeliveryTracking;
  onAccept: (id: number) => Promise<void>;
  cardBg: string;
  textColor: string;
  mutedColor: string;
  accentColor: string;
}

function AvailableCard({ d, onAccept, cardBg, textColor, mutedColor, accentColor }: AvailableCardProps) {
  const [loading, setLoading] = useState(false);
  return (
    <View style={[styles.card, { backgroundColor: cardBg }]}>
      <View style={styles.cardHeader}>
        <Text style={[styles.missionNumber, { color: mutedColor }]}>Mission #{d.id}</Text>
        <View style={[styles.statusBadge, { backgroundColor: STATUS_BG[d.status] }]}>
          <Text style={[styles.statusText, { color: STATUS_FG[d.status] }]}>{STATUS_LABEL[d.status]}</Text>
        </View>
      </View>

      <View style={styles.row}>
        <Ionicons name="cube" size={16} color="#fb923c" />
        <View style={{ flex: 1, marginLeft: 8 }}>
          <Text style={[styles.rowLabel, { color: mutedColor }]}>Enlèvement</Text>
          <Text style={[styles.rowValue, { color: textColor }]}>{d.pickup_address || "–"}</Text>
        </View>
      </View>

      <View style={styles.row}>
        <Ionicons name="location" size={16} color="#22c55e" />
        <View style={{ flex: 1, marginLeft: 8 }}>
          <Text style={[styles.rowLabel, { color: mutedColor }]}>Livraison</Text>
          <Text style={[styles.rowValue, { color: textColor }]}>{d.dropoff_address || "–"}</Text>
        </View>
      </View>

      {d.note ? (
        <View style={styles.noteBox}>
          <Text style={[styles.noteText, { color: mutedColor }]}>{d.note}</Text>
        </View>
      ) : null}

      <TouchableOpacity
        style={[styles.actionBtn, { backgroundColor: accentColor }, loading && styles.actionBtnDisabled]}
        onPress={async () => {
          setLoading(true);
          try { await onAccept(d.id); } finally { setLoading(false); }
        }}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <>
            <Ionicons name="car" size={16} color="#fff" />
            <Text style={styles.actionBtnText}>Accepter la mission</Text>
          </>
        )}
      </TouchableOpacity>
    </View>
  );
}

interface ActiveCardProps {
  d: DeliveryTracking;
  onStatusUpdate: (id: number, s: DeliveryStatus) => Promise<void>;
  isSendingLocation: boolean;
  cardBg: string;
  textColor: string;
  mutedColor: string;
  borderColor: string;
  accentColor: string;
}

function ActiveCard({ d, onStatusUpdate, isSendingLocation, cardBg, textColor, mutedColor, borderColor, accentColor }: ActiveCardProps) {
  const [loading, setLoading] = useState(false);
  const next = NEXT_STATUS[d.status];

  return (
    <View style={[styles.card, styles.cardActive, { backgroundColor: cardBg, borderColor: accentColor }]}>
      <View style={styles.cardHeader}>
        <Text style={[styles.missionNumber, { color: mutedColor }]}>Mission #{d.id} · Cmd #{d.order_id}</Text>
        <View style={[styles.statusBadge, { backgroundColor: STATUS_BG[d.status] }]}>
          <Text style={[styles.statusText, { color: STATUS_FG[d.status] }]}>{STATUS_LABEL[d.status]}</Text>
        </View>
      </View>

      <View style={styles.row}>
        <Ionicons name="cube" size={16} color="#fb923c" />
        <Text style={[styles.rowValue, { flex: 1, marginLeft: 8, color: textColor }]}>{d.pickup_address || "–"}</Text>
      </View>

      <View style={styles.row}>
        <Ionicons name="location" size={16} color="#22c55e" />
        <Text style={[styles.rowValue, { flex: 1, marginLeft: 8, color: textColor }]}>{d.dropoff_address || "–"}</Text>
      </View>

      {isSendingLocation ? (
        <View style={styles.gpsRow}>
          <Ionicons name="navigate" size={14} color="#60a5fa" />
          <Text style={styles.gpsText}>Partage GPS actif</Text>
        </View>
      ) : null}

      {next ? (
        <TouchableOpacity
          style={[styles.actionBtn, { backgroundColor: accentColor }, loading && styles.actionBtnDisabled]}
          onPress={async () => {
            setLoading(true);
            try { await onStatusUpdate(d.id, next.status); } finally { setLoading(false); }
          }}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="chevron-forward" size={16} color="#fff" />
              <Text style={styles.actionBtnText}>{next.label}</Text>
            </>
          )}
        </TouchableOpacity>
      ) : null}

      {d.status === "delivered" ? (
        <View style={[styles.completedRow, { borderTopColor: borderColor }]}>
          <Ionicons name="checkmark-circle" size={18} color="#22c55e" />
          <Text style={styles.completedText}>Mission terminée !</Text>
        </View>
      ) : null}
    </View>
  );
}

export default function LivreurScreen() {
  const { colors } = useTheme();
  const [tab, setTab] = useState<"available" | "mine">("available");
  const [available, setAvailable] = useState<DeliveryTracking[]>([]);
  const [mine, setMine] = useState<DeliveryTracking[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sendingLocationFor, setSendingLocationFor] = useState<number | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadData = useCallback(async () => {
    setError(null);
    try {
      const [avail, myList] = await Promise.all([getAvailableDeliveries(), getMyDeliveries()]);
      setAvailable(avail);
      setMine(myList);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Erreur de chargement");
    }
  }, []);

  useEffect(() => { loadData().finally(() => setLoading(false)); }, [loadData]);

  useEffect(() => {
    const active = mine.find((d) => d.status !== "delivered" && d.status !== "canceled" && d.status !== "pending");
    const stop = () => { if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; } };

    if (!active) { setSendingLocationFor(null); stop(); return stop; }

    setSendingLocationFor(active.id);
    let cancelled = false;
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted" || cancelled) return;
      stop();
      intervalRef.current = setInterval(async () => {
        try {
          const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
          updateDeliveryLocation(active.id, pos.coords.latitude, pos.coords.longitude).catch(() => {});
        } catch { /* ignore */ }
      }, 5000);
    })();

    return () => { cancelled = true; stop(); };
  }, [mine]);

  const handleAccept = async (deliveryId: number) => {
    try {
      await acceptDelivery(deliveryId);
      await loadData();
      setTab("mine");
    } catch (e: unknown) {
      Alert.alert("Erreur", e instanceof Error ? e.message : "Impossible d'accepter la mission");
    }
  };

  const handleStatusUpdate = async (deliveryId: number, status: DeliveryStatus) => {
    try {
      await updateDeliveryStatus(deliveryId, status);
      setMine((prev) => prev.map((d) => (d.id === deliveryId ? { ...d, status } : d)));
      if (status === "delivered") await loadData();
    } catch (e: unknown) {
      Alert.alert("Erreur", e instanceof Error ? e.message : "Mise à jour échouée");
    }
  };

  const onRefresh = async () => { setRefreshing(true); await loadData(); setRefreshing(false); };

  const activeMissions = mine.filter((d) => d.status !== "delivered" && d.status !== "canceled");
  const historyMissions = mine.filter((d) => d.status === "delivered" || d.status === "canceled");

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Espace livreur</Text>
          {sendingLocationFor ? (
            <View style={styles.gpsHeaderRow}>
              <Ionicons name="navigate" size={11} color="#60a5fa" />
              <Text style={styles.gpsHeaderText}>GPS actif · Mission #{sendingLocationFor}</Text>
            </View>
          ) : null}
        </View>
        <TouchableOpacity onPress={loadData} style={styles.refreshBtn}>
          <Ionicons name="refresh" size={22} color={colors.textMuted} />
        </TouchableOpacity>
      </View>

      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, { backgroundColor: colors.cardSecondary }, tab === "available" && { backgroundColor: colors.accent }]}
          onPress={() => setTab("available")}
        >
          <Text style={[styles.tabText, { color: colors.textMuted }, tab === "available" && { color: "#fff" }]}>
            Disponibles {available.length > 0 ? `(${available.length})` : ""}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, { backgroundColor: colors.cardSecondary }, tab === "mine" && { backgroundColor: colors.accent }]}
          onPress={() => setTab("mine")}
        >
          <Text style={[styles.tabText, { color: colors.textMuted }, tab === "mine" && { color: "#fff" }]}>
            Mes missions {activeMissions.length > 0 ? `(${activeMissions.length})` : ""}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accentLight} />}
      >
        {loading ? (
          <View style={styles.center}><ActivityIndicator color={colors.accentLight} size="large" /></View>
        ) : null}

        {error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {!loading && tab === "available" ? (
          available.length === 0 ? (
            <View style={styles.empty}>
              <Ionicons name="cube-outline" size={48} color={colors.border} />
              <Text style={[styles.emptyText, { color: colors.textMuted }]}>Aucune mission disponible pour l&apos;instant</Text>
            </View>
          ) : (
            available.map((d) => (
              <AvailableCard
                key={d.id} d={d} onAccept={handleAccept}
                cardBg={colors.card} textColor={colors.text} mutedColor={colors.textMuted} accentColor={colors.accent}
              />
            ))
          )
        ) : null}

        {!loading && tab === "mine" ? (
          <>
            {activeMissions.length > 0 ? (
              <>
                <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>Missions actives</Text>
                {activeMissions.map((d) => (
                  <ActiveCard
                    key={d.id} d={d} onStatusUpdate={handleStatusUpdate} isSendingLocation={sendingLocationFor === d.id}
                    cardBg={colors.card} textColor={colors.text} mutedColor={colors.textMuted} borderColor={colors.border} accentColor={colors.accent}
                  />
                ))}
              </>
            ) : null}

            {historyMissions.length > 0 ? (
              <>
                <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>Historique</Text>
                {historyMissions.map((d) => (
                  <View key={d.id} style={[styles.historyCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.historyTitle, { color: colors.text }]}>Mission #{d.id}</Text>
                      <Text style={[styles.historySubtitle, { color: colors.textMuted }]} numberOfLines={1}>{d.dropoff_address}</Text>
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: STATUS_BG[d.status] }]}>
                      <Text style={[styles.statusText, { color: STATUS_FG[d.status] }]}>{STATUS_LABEL[d.status]}</Text>
                    </View>
                  </View>
                ))}
              </>
            ) : null}

            {activeMissions.length === 0 && historyMissions.length === 0 ? (
              <View style={styles.empty}>
                <Ionicons name="car-outline" size={48} color={colors.border} />
                <Text style={[styles.emptyText, { color: colors.textMuted }]}>Aucune mission pour l&apos;instant</Text>
                <TouchableOpacity onPress={() => setTab("available")}>
                  <Text style={[styles.linkText, { color: colors.accentLight }]}>Voir les missions disponibles</Text>
                </TouchableOpacity>
              </View>
            ) : null}
          </>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: 56,
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backBtn: { padding: 6 },
  refreshBtn: { padding: 6 },
  headerTitle: { fontWeight: "700", fontSize: 16, textAlign: "center" },
  gpsHeaderRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 4, marginTop: 2 },
  gpsHeaderText: { color: "#60a5fa", fontSize: 11 },
  tabs: { flexDirection: "row", paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8, gap: 8 },
  tab: { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: "center" },
  tabText: { fontSize: 13, fontWeight: "600" },
  scroll: { padding: 16, paddingBottom: 60 },
  center: { padding: 40, alignItems: "center" },
  empty: { alignItems: "center", paddingVertical: 60, gap: 10 },
  emptyText: { fontSize: 14 },
  linkText: { fontSize: 13, marginTop: 4 },
  errorBox: {
    backgroundColor: "rgba(239,68,68,0.1)",
    borderColor: "rgba(239,68,68,0.3)",
    borderWidth: 1,
    padding: 12,
    borderRadius: 10,
    marginBottom: 12,
  },
  errorText: { color: "#ef4444", fontSize: 13 },
  sectionTitle: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1,
    textTransform: "uppercase",
    marginTop: 16,
    marginBottom: 10,
  },
  card: { borderRadius: 14, padding: 14, marginBottom: 12, borderWidth: StyleSheet.hairlineWidth, borderColor: "transparent" },
  cardActive: { borderWidth: 1 },
  cardHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 },
  missionNumber: { fontSize: 12, fontWeight: "500" },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  statusText: { fontSize: 11, fontWeight: "600" },
  row: { flexDirection: "row", alignItems: "flex-start", paddingVertical: 4 },
  rowLabel: { fontSize: 11 },
  rowValue: { fontSize: 13, lineHeight: 18 },
  noteBox: { backgroundColor: "rgba(128,128,128,0.08)", padding: 10, borderRadius: 8, marginVertical: 8 },
  noteText: { fontSize: 12, fontStyle: "italic" },
  gpsRow: { flexDirection: "row", alignItems: "center", gap: 6, paddingTop: 6 },
  gpsText: { color: "#60a5fa", fontSize: 11 },
  actionBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: 12, borderRadius: 10, gap: 8, marginTop: 12 },
  actionBtnDisabled: { opacity: 0.6 },
  actionBtnText: { color: "#fff", fontSize: 14, fontWeight: "600" },
  completedRow: { flexDirection: "row", alignItems: "center", gap: 8, paddingTop: 12, marginTop: 8, borderTopWidth: StyleSheet.hairlineWidth },
  completedText: { color: "#22c55e", fontSize: 13, fontWeight: "600" },
  historyCard: { flexDirection: "row", alignItems: "center", padding: 12, borderRadius: 12, marginBottom: 8, borderWidth: StyleSheet.hairlineWidth, gap: 12 },
  historyTitle: { fontSize: 13, fontWeight: "600" },
  historySubtitle: { fontSize: 11, marginTop: 2 },
});
