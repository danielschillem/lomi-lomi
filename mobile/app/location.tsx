import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as ExpoLocation from "expo-location";
import {
  getActiveLocationShares,
  startLocationShare,
  stopLocationShare,
  updateLocationShare,
} from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

type LocationShare = {
  id: number;
  sender_id: number;
  receiver_id: number;
  latitude?: number;
  longitude?: number;
  is_active?: boolean;
  expires_at?: string;
  sender?: { id: number; username?: string };
  receiver?: { id: number; username?: string };
};

const DURATIONS = [15, 30, 60, 120];

export default function LocationScreen() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [starting, setStarting] = useState(false);
  const [receiverId, setReceiverId] = useState("");
  const [duration, setDuration] = useState(30);
  const [shares, setShares] = useState<LocationShare[]>([]);
  const [position, setPosition] = useState<{ latitude: number; longitude: number } | null>(null);
  const [permissionGranted, setPermissionGranted] = useState(false);

  const loadShares = useCallback(async () => {
    try {
      const res = await getActiveLocationShares();
      setShares(Array.isArray(res) ? (res as LocationShare[]) : []);
    } catch {
      setShares([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    (async () => {
      const { status } = await ExpoLocation.requestForegroundPermissionsAsync();
      const granted = status === "granted";
      setPermissionGranted(granted);
      if (!granted) return;
      const current = await ExpoLocation.getCurrentPositionAsync({});
      setPosition({
        latitude: current.coords.latitude,
        longitude: current.coords.longitude,
      });
    })().catch(() => {});
  }, []);

  useEffect(() => {
    loadShares();
  }, [loadShares]);

  const myActiveShares = useMemo(
    () => shares.filter((s) => s.sender_id === user?.id && s.is_active),
    [shares, user?.id],
  );

  useEffect(() => {
    let watcher: ExpoLocation.LocationSubscription | null = null;
    if (!permissionGranted || myActiveShares.length === 0) return;
    ExpoLocation.watchPositionAsync(
      {
        accuracy: ExpoLocation.Accuracy.Balanced,
        timeInterval: 15000,
        distanceInterval: 20,
      },
      (loc) => {
        const latitude = loc.coords.latitude;
        const longitude = loc.coords.longitude;
        setPosition({ latitude, longitude });
        myActiveShares.forEach((share) => {
          void updateLocationShare(share.id, { latitude, longitude }).catch(() => {});
        });
      },
    )
      .then((sub) => {
        watcher = sub;
      })
      .catch(() => {});
    return () => {
      watcher?.remove();
    };
  }, [permissionGranted, myActiveShares]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadShares();
    setRefreshing(false);
  };

  const handleStart = async () => {
    const target = parseInt(receiverId, 10);
    if (!target || target <= 0) {
      Alert.alert("Erreur", "Entrez un identifiant destinataire valide.");
      return;
    }
    if (!position) {
      Alert.alert("Erreur", "Position indisponible. Activez la localisation.");
      return;
    }
    setStarting(true);
    try {
      await startLocationShare({
        receiver_id: target,
        target_user_id: target,
        latitude: position.latitude,
        longitude: position.longitude,
        duration,
        duration_minutes: duration,
      });
      setReceiverId("");
      await loadShares();
      Alert.alert("Succès", "Partage de position démarré.");
    } catch (e: unknown) {
      Alert.alert("Erreur", (e as Error).message || "Impossible de démarrer le partage.");
    } finally {
      setStarting(false);
    }
  };

  const handleStop = async (id: number) => {
    try {
      await stopLocationShare(id);
      await loadShares();
    } catch (e: unknown) {
      Alert.alert("Erreur", (e as Error).message || "Impossible d'arrêter le partage.");
    }
  };

  const sharedWithMe = shares.filter((s) => s.receiver_id === user?.id && s.is_active);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Partage de position</Text>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Votre position</Text>
        {position ? (
          <Text style={styles.mono}>
            {position.latitude.toFixed(6)}, {position.longitude.toFixed(6)}
          </Text>
        ) : (
          <Text style={styles.muted}>
            {permissionGranted ? "Localisation en cours..." : "Permission de localisation refusée"}
          </Text>
        )}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Démarrer un partage</Text>
        <TextInput
          style={styles.input}
          value={receiverId}
          onChangeText={setReceiverId}
          placeholder="ID utilisateur destinataire"
          placeholderTextColor="#666"
          keyboardType="number-pad"
        />
        <View style={styles.durationRow}>
          {DURATIONS.map((d) => {
            const active = duration === d;
            return (
              <TouchableOpacity
                key={d}
                style={[styles.durationChip, active && styles.durationChipActive]}
                onPress={() => setDuration(d)}
              >
                <Text style={[styles.durationText, active && styles.durationTextActive]}>{d} min</Text>
              </TouchableOpacity>
            );
          })}
        </View>
        <TouchableOpacity style={styles.primaryBtn} onPress={handleStart} disabled={starting}>
          {starting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="navigate" size={16} color="#fff" />
              <Text style={styles.primaryBtnText}>Partager ma position</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Mes partages actifs ({myActiveShares.length})</Text>
        {loading ? (
          <ActivityIndicator color="#7c3aed" />
        ) : myActiveShares.length === 0 ? (
          <Text style={styles.muted}>Aucun partage actif.</Text>
        ) : (
          myActiveShares.map((share) => (
            <View key={share.id} style={styles.rowCard}>
              <View style={{ flex: 1 }}>
                <Text style={styles.rowTitle}>
                  Vers {share.receiver?.username || `#${share.receiver_id}`}
                </Text>
                <Text style={styles.mutedSmall}>
                  Expire: {share.expires_at ? new Date(share.expires_at).toLocaleString("fr-FR") : "-"}
                </Text>
              </View>
              <TouchableOpacity style={styles.stopBtn} onPress={() => handleStop(share.id)}>
                <Ionicons name="stop-circle-outline" size={16} color="#ef4444" />
                <Text style={styles.stopText}>Stop</Text>
              </TouchableOpacity>
            </View>
          ))
        )}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Partagés avec moi ({sharedWithMe.length})</Text>
        {sharedWithMe.length === 0 ? (
          <Text style={styles.muted}>Aucun partage reçu.</Text>
        ) : (
          sharedWithMe.map((share) => (
            <View key={share.id} style={styles.rowCard}>
              <Text style={styles.rowTitle}>
                {share.sender?.username || `Utilisateur #${share.sender_id}`}
              </Text>
              <Text style={styles.mutedSmall}>
                {share.latitude?.toFixed(6)}, {share.longitude?.toFixed(6)}
              </Text>
            </View>
          ))
        )}
      </View>

      <TouchableOpacity onPress={onRefresh} style={styles.refreshBtn}>
        <Ionicons name="refresh" size={16} color="#a78bfa" />
        <Text style={styles.refreshText}>{refreshing ? "Actualisation..." : "Actualiser"}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0a0a0a" },
  content: { padding: 16, paddingBottom: 40, gap: 12 },
  title: { color: "#fff", fontSize: 22, fontWeight: "700", marginBottom: 4 },
  card: { backgroundColor: "#111", borderRadius: 12, padding: 14, gap: 10 },
  cardTitle: { color: "#e5e7eb", fontSize: 15, fontWeight: "600" },
  mono: { color: "#a78bfa", fontFamily: "monospace", fontSize: 13 },
  muted: { color: "#888", fontSize: 13 },
  mutedSmall: { color: "#888", fontSize: 12, marginTop: 2 },
  input: {
    backgroundColor: "#1a1a1a",
    color: "#fff",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  durationRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  durationChip: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#333",
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  durationChipActive: { borderColor: "#7c3aed", backgroundColor: "rgba(124,58,237,0.2)" },
  durationText: { color: "#aaa", fontSize: 12 },
  durationTextActive: { color: "#c4b5fd", fontWeight: "600" },
  primaryBtn: {
    marginTop: 4,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#7c3aed",
    borderRadius: 10,
    paddingVertical: 12,
  },
  primaryBtnText: { color: "#fff", fontWeight: "600" },
  rowCard: {
    backgroundColor: "#161616",
    borderRadius: 10,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  rowTitle: { color: "#e5e7eb", fontSize: 14, fontWeight: "500" },
  stopBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: "#ef4444",
    borderRadius: 8,
  },
  stopText: { color: "#ef4444", fontSize: 12, fontWeight: "600" },
  refreshBtn: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
    paddingVertical: 12,
  },
  refreshText: { color: "#a78bfa", fontSize: 13, fontWeight: "600" },
});
