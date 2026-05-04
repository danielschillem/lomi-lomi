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
  picking_up: "#a78bfa",
  picked_up: "#818cf8",
  delivering: "#fb923c",
  delivered: "#22c55e",
  canceled: "#9ca3af",
};

const NEXT_STATUS: Partial<
  Record<DeliveryStatus, { status: DeliveryStatus; label: string }>
> = {
  accepted: { status: "picking_up", label: "Je pars récupérer le colis" },
  picking_up: { status: "picked_up", label: "Colis récupéré" },
  picked_up: { status: "delivering", label: "Je pars livrer le client" },
  delivering: { status: "delivered", label: "Livraison effectuée" },
};

interface AvailableCardProps {
  d: DeliveryTracking;
  onAccept: (id: number) => Promise<void>;
}

function AvailableCard({ d, onAccept }: AvailableCardProps) {
  const [loading, setLoading] = useState(false);
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.missionNumber}>Mission #{d.id}</Text>
        <View
          style={[styles.statusBadge, { backgroundColor: STATUS_BG[d.status] }]}
        >
          <Text style={[styles.statusText, { color: STATUS_FG[d.status] }]}>
            {STATUS_LABEL[d.status]}
          </Text>
        </View>
      </View>

      <View style={styles.row}>
        <Ionicons name="cube" size={16} color="#fb923c" />
        <View style={{ flex: 1, marginLeft: 8 }}>
          <Text style={styles.rowLabel}>Enlèvement</Text>
          <Text style={styles.rowValue}>{d.pickup_address || "–"}</Text>
        </View>
      </View>

      <View style={styles.row}>
        <Ionicons name="location" size={16} color="#22c55e" />
        <View style={{ flex: 1, marginLeft: 8 }}>
          <Text style={styles.rowLabel}>Livraison</Text>
          <Text style={styles.rowValue}>{d.dropoff_address || "–"}</Text>
        </View>
      </View>

      {d.note ? (
        <View style={styles.noteBox}>
          <Text style={styles.noteText}>{d.note}</Text>
        </View>
      ) : null}

      <TouchableOpacity
        style={[styles.actionBtn, loading && styles.actionBtnDisabled]}
        onPress={async () => {
          setLoading(true);
          try {
            await onAccept(d.id);
          } finally {
            setLoading(false);
          }
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
}

function ActiveCard({
  d,
  onStatusUpdate,
  isSendingLocation,
}: ActiveCardProps) {
  const [loading, setLoading] = useState(false);
  const next = NEXT_STATUS[d.status];

  return (
    <View style={[styles.card, styles.cardActive]}>
      <View style={styles.cardHeader}>
        <Text style={styles.missionNumber}>
          Mission #{d.id} · Cmd #{d.order_id}
        </Text>
        <View
          style={[styles.statusBadge, { backgroundColor: STATUS_BG[d.status] }]}
        >
          <Text style={[styles.statusText, { color: STATUS_FG[d.status] }]}>
            {STATUS_LABEL[d.status]}
          </Text>
        </View>
      </View>

      <View style={styles.row}>
        <Ionicons name="cube" size={16} color="#fb923c" />
        <Text style={[styles.rowValue, { flex: 1, marginLeft: 8 }]}>
          {d.pickup_address || "–"}
        </Text>
      </View>

      <View style={styles.row}>
        <Ionicons name="location" size={16} color="#22c55e" />
        <Text style={[styles.rowValue, { flex: 1, marginLeft: 8 }]}>
          {d.dropoff_address || "–"}
        </Text>
      </View>

      {isSendingLocation ? (
        <View style={styles.gpsRow}>
          <Ionicons name="navigate" size={14} color="#a78bfa" />
          <Text style={styles.gpsText}>Partage GPS actif</Text>
        </View>
      ) : null}

      {next ? (
        <TouchableOpacity
          style={[styles.actionBtn, loading && styles.actionBtnDisabled]}
          onPress={async () => {
            setLoading(true);
            try {
              await onStatusUpdate(d.id, next.status);
            } finally {
              setLoading(false);
            }
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
        <View style={styles.completedRow}>
          <Ionicons name="checkmark-circle" size={18} color="#22c55e" />
          <Text style={styles.completedText}>Mission terminée !</Text>
        </View>
      ) : null}
    </View>
  );
}

export default function LivreurScreen() {
  const [tab, setTab] = useState<"available" | "mine">("available");
  const [available, setAvailable] = useState<DeliveryTracking[]>([]);
  const [mine, setMine] = useState<DeliveryTracking[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sendingLocationFor, setSendingLocationFor] = useState<number | null>(
    null,
  );
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadData = useCallback(async () => {
    setError(null);
    try {
      const [avail, myList] = await Promise.all([
        getAvailableDeliveries(),
        getMyDeliveries(),
      ]);
      setAvailable(avail);
      setMine(myList);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Erreur de chargement");
    }
  }, []);

  useEffect(() => {
    loadData().finally(() => setLoading(false));
  }, [loadData]);

  // Send GPS location every 5s for the active mission
  useEffect(() => {
    const active = mine.find(
      (d) =>
        d.status !== "delivered" &&
        d.status !== "canceled" &&
        d.status !== "pending",
    );

    const stop = () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };

    if (!active) {
      setSendingLocationFor(null);
      stop();
      return stop;
    }

    setSendingLocationFor(active.id);

    let cancelled = false;
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted" || cancelled) return;
      stop();
      intervalRef.current = setInterval(async () => {
        try {
          const pos = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
          });
          updateDeliveryLocation(
            active.id,
            pos.coords.latitude,
            pos.coords.longitude,
          ).catch(() => {});
        } catch {
          // ignore — we'll try again next tick
        }
      }, 5000);
    })();

    return () => {
      cancelled = true;
      stop();
    };
  }, [mine]);

  const handleAccept = async (deliveryId: number) => {
    try {
      await acceptDelivery(deliveryId);
      await loadData();
      setTab("mine");
    } catch (e: unknown) {
      Alert.alert(
        "Erreur",
        e instanceof Error ? e.message : "Impossible d'accepter la mission",
      );
    }
  };

  const handleStatusUpdate = async (
    deliveryId: number,
    status: DeliveryStatus,
  ) => {
    try {
      await updateDeliveryStatus(deliveryId, status);
      setMine((prev) =>
        prev.map((d) => (d.id === deliveryId ? { ...d, status } : d)),
      );
      if (status === "delivered") await loadData();
    } catch (e: unknown) {
      Alert.alert(
        "Erreur",
        e instanceof Error ? e.message : "Mise à jour échouée",
      );
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const activeMissions = mine.filter(
    (d) => d.status !== "delivered" && d.status !== "canceled",
  );
  const historyMissions = mine.filter(
    (d) => d.status === "delivered" || d.status === "canceled",
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#e5e7eb" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Espace livreur</Text>
          {sendingLocationFor ? (
            <View style={styles.gpsHeaderRow}>
              <Ionicons name="navigate" size={11} color="#a78bfa" />
              <Text style={styles.gpsHeaderText}>
                GPS actif · Mission #{sendingLocationFor}
              </Text>
            </View>
          ) : null}
        </View>
        <TouchableOpacity onPress={loadData} style={styles.refreshBtn}>
          <Ionicons name="refresh" size={22} color="#9ca3af" />
        </TouchableOpacity>
      </View>

      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, tab === "available" && styles.tabActive]}
          onPress={() => setTab("available")}
        >
          <Text
            style={[styles.tabText, tab === "available" && styles.tabTextActive]}
          >
            Disponibles{" "}
            {available.length > 0 ? `(${available.length})` : ""}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, tab === "mine" && styles.tabActive]}
          onPress={() => setTab("mine")}
        >
          <Text
            style={[styles.tabText, tab === "mine" && styles.tabTextActive]}
          >
            Mes missions{" "}
            {activeMissions.length > 0 ? `(${activeMissions.length})` : ""}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#a78bfa"
          />
        }
      >
        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator color="#a78bfa" size="large" />
          </View>
        ) : null}

        {error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {!loading && tab === "available" ? (
          available.length === 0 ? (
            <View style={styles.empty}>
              <Ionicons name="cube-outline" size={48} color="#3a3a3a" />
              <Text style={styles.emptyText}>
                Aucune mission disponible pour l&apos;instant
              </Text>
            </View>
          ) : (
            available.map((d) => (
              <AvailableCard key={d.id} d={d} onAccept={handleAccept} />
            ))
          )
        ) : null}

        {!loading && tab === "mine" ? (
          <>
            {activeMissions.length > 0 ? (
              <>
                <Text style={styles.sectionTitle}>Missions actives</Text>
                {activeMissions.map((d) => (
                  <ActiveCard
                    key={d.id}
                    d={d}
                    onStatusUpdate={handleStatusUpdate}
                    isSendingLocation={sendingLocationFor === d.id}
                  />
                ))}
              </>
            ) : null}

            {historyMissions.length > 0 ? (
              <>
                <Text style={styles.sectionTitle}>Historique</Text>
                {historyMissions.map((d) => (
                  <View key={d.id} style={styles.historyCard}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.historyTitle}>Mission #{d.id}</Text>
                      <Text style={styles.historySubtitle} numberOfLines={1}>
                        {d.dropoff_address}
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.statusBadge,
                        { backgroundColor: STATUS_BG[d.status] },
                      ]}
                    >
                      <Text
                        style={[
                          styles.statusText,
                          { color: STATUS_FG[d.status] },
                        ]}
                      >
                        {STATUS_LABEL[d.status]}
                      </Text>
                    </View>
                  </View>
                ))}
              </>
            ) : null}

            {activeMissions.length === 0 && historyMissions.length === 0 ? (
              <View style={styles.empty}>
                <Ionicons name="car-outline" size={48} color="#3a3a3a" />
                <Text style={styles.emptyText}>
                  Aucune mission pour l&apos;instant
                </Text>
                <TouchableOpacity onPress={() => setTab("available")}>
                  <Text style={styles.linkText}>
                    Voir les missions disponibles
                  </Text>
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
  container: { flex: 1, backgroundColor: "#0a0a0a" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: 56,
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#222",
  },
  backBtn: { padding: 6 },
  refreshBtn: { padding: 6 },
  headerTitle: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 16,
    textAlign: "center",
  },
  gpsHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    marginTop: 2,
  },
  gpsHeaderText: { color: "#a78bfa", fontSize: 11 },
  tabs: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    gap: 8,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    backgroundColor: "#16161a",
    borderRadius: 10,
    alignItems: "center",
  },
  tabActive: { backgroundColor: "#7c3aed" },
  tabText: { color: "#9ca3af", fontSize: 13, fontWeight: "600" },
  tabTextActive: { color: "#fff" },
  scroll: { padding: 16, paddingBottom: 60 },
  center: { padding: 40, alignItems: "center" },
  empty: { alignItems: "center", paddingVertical: 60, gap: 10 },
  emptyText: { color: "#6b7280", fontSize: 14 },
  linkText: { color: "#a78bfa", fontSize: 13, marginTop: 4 },
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
    color: "#9ca3af",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1,
    textTransform: "uppercase",
    marginTop: 16,
    marginBottom: 10,
  },
  card: {
    backgroundColor: "#16161a",
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#222",
  },
  cardActive: { borderColor: "#7c3aed", borderWidth: 1 },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  missionNumber: { color: "#9ca3af", fontSize: 12, fontWeight: "500" },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  statusText: { fontSize: 11, fontWeight: "600" },
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingVertical: 4,
  },
  rowLabel: { color: "#9ca3af", fontSize: 11 },
  rowValue: { color: "#e5e7eb", fontSize: 13, lineHeight: 18 },
  noteBox: {
    backgroundColor: "rgba(255,255,255,0.04)",
    padding: 10,
    borderRadius: 8,
    marginVertical: 8,
  },
  noteText: { color: "#d1d5db", fontSize: 12, fontStyle: "italic" },
  gpsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingTop: 6,
  },
  gpsText: { color: "#a78bfa", fontSize: 11 },
  actionBtn: {
    backgroundColor: "#7c3aed",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 10,
    gap: 8,
    marginTop: 12,
  },
  actionBtnDisabled: { opacity: 0.6 },
  actionBtnText: { color: "#fff", fontSize: 14, fontWeight: "600" },
  completedRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingTop: 12,
    marginTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#222",
  },
  completedText: { color: "#22c55e", fontSize: 13, fontWeight: "600" },
  historyCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#16161a",
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#222",
    gap: 12,
  },
  historyTitle: { color: "#e5e7eb", fontSize: 13, fontWeight: "600" },
  historySubtitle: { color: "#9ca3af", fontSize: 11, marginTop: 2 },
});
