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
import { useTheme } from "@/lib/theme-context";

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
  const { colors } = useTheme();
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
      setPosition({ latitude: current.coords.latitude, longitude: current.coords.longitude });
    })().catch(() => {});
  }, []);

  useEffect(() => { loadShares(); }, [loadShares]);

  const myActiveShares = useMemo(
    () => shares.filter((s) => s.sender_id === user?.id && s.is_active),
    [shares, user?.id],
  );

  useEffect(() => {
    let watcher: ExpoLocation.LocationSubscription | null = null;
    if (!permissionGranted || myActiveShares.length === 0) return;
    ExpoLocation.watchPositionAsync(
      { accuracy: ExpoLocation.Accuracy.Balanced, timeInterval: 15000, distanceInterval: 20 },
      (loc) => {
        const latitude = loc.coords.latitude;
        const longitude = loc.coords.longitude;
        setPosition({ latitude, longitude });
        myActiveShares.forEach((share) => {
          void updateLocationShare(share.id, { latitude, longitude }).catch(() => {});
        });
      },
    ).then((sub) => { watcher = sub; }).catch(() => {});
    return () => { watcher?.remove(); };
  }, [permissionGranted, myActiveShares]);

  const onRefresh = async () => { setRefreshing(true); await loadShares(); setRefreshing(false); };

  const handleStart = async () => {
    const target = parseInt(receiverId, 10);
    if (!target || target <= 0) { Alert.alert("Erreur", "Entrez un identifiant destinataire valide."); return; }
    if (!position) { Alert.alert("Erreur", "Position indisponible. Activez la localisation."); return; }
    setStarting(true);
    try {
      await startLocationShare({
        receiver_id: target, target_user_id: target,
        latitude: position.latitude, longitude: position.longitude,
        duration, duration_minutes: duration,
      });
      setReceiverId("");
      await loadShares();
      Alert.alert("Succès", "Partage de position démarré.");
    } catch (e: unknown) {
      Alert.alert("Erreur", (e as Error).message || "Impossible de démarrer le partage.");
    } finally { setStarting(false); }
  };

  const handleStop = async (id: number) => {
    try { await stopLocationShare(id); await loadShares(); }
    catch (e: unknown) { Alert.alert("Erreur", (e as Error).message || "Impossible d'arrêter le partage."); }
  };

  const sharedWithMe = shares.filter((s) => s.receiver_id === user?.id && s.is_active);

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={styles.content}>
      <Text style={{ color: colors.text, fontSize: 22, fontWeight: "700", marginBottom: 4 }}>Partage de position</Text>

      <View style={[styles.card, { backgroundColor: colors.card }]}>
        <Text style={{ color: colors.text, fontSize: 15, fontWeight: "600" }}>Votre position</Text>
        {position ? (
          <Text style={{ color: colors.accentLight, fontFamily: "monospace", fontSize: 13 }}>
            {position.latitude.toFixed(6)}, {position.longitude.toFixed(6)}
          </Text>
        ) : (
          <Text style={{ color: colors.textMuted, fontSize: 13 }}>
            {permissionGranted ? "Localisation en cours..." : "Permission de localisation refusée"}
          </Text>
        )}
      </View>

      <View style={[styles.card, { backgroundColor: colors.card }]}>
        <Text style={{ color: colors.text, fontSize: 15, fontWeight: "600" }}>Démarrer un partage</Text>
        <TextInput
          style={[styles.input, { backgroundColor: colors.inputBg, color: colors.inputText }]}
          value={receiverId}
          onChangeText={setReceiverId}
          placeholder="ID utilisateur destinataire"
          placeholderTextColor={colors.placeholder}
          keyboardType="number-pad"
        />
        <View style={styles.durationRow}>
          {DURATIONS.map((d) => {
            const active = duration === d;
            return (
              <TouchableOpacity
                key={d}
                style={[styles.durationChip, { borderColor: colors.border }, active && { borderColor: colors.accent, backgroundColor: "rgba(124,58,237,0.2)" }]}
                onPress={() => setDuration(d)}
              >
                <Text style={[{ color: colors.textMuted, fontSize: 12 }, active && { color: colors.accentLight, fontWeight: "600" }]}>{d} min</Text>
              </TouchableOpacity>
            );
          })}
        </View>
        <TouchableOpacity style={[styles.primaryBtn, { backgroundColor: colors.accent }]} onPress={handleStart} disabled={starting}>
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

      <View style={[styles.card, { backgroundColor: colors.card }]}>
        <Text style={{ color: colors.text, fontSize: 15, fontWeight: "600" }}>Mes partages actifs ({myActiveShares.length})</Text>
        {loading ? (
          <ActivityIndicator color={colors.accent} />
        ) : myActiveShares.length === 0 ? (
          <Text style={{ color: colors.textMuted, fontSize: 13 }}>Aucun partage actif.</Text>
        ) : (
          myActiveShares.map((share) => (
            <View key={share.id} style={[styles.rowCard, { backgroundColor: colors.cardSecondary }]}>
              <View style={{ flex: 1 }}>
                <Text style={{ color: colors.text, fontSize: 14, fontWeight: "500" }}>
                  Vers {share.receiver?.username || `#${share.receiver_id}`}
                </Text>
                <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: 2 }}>
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

      <View style={[styles.card, { backgroundColor: colors.card }]}>
        <Text style={{ color: colors.text, fontSize: 15, fontWeight: "600" }}>Partagés avec moi ({sharedWithMe.length})</Text>
        {sharedWithMe.length === 0 ? (
          <Text style={{ color: colors.textMuted, fontSize: 13 }}>Aucun partage reçu.</Text>
        ) : (
          sharedWithMe.map((share) => (
            <View key={share.id} style={[styles.rowCard, { backgroundColor: colors.cardSecondary }]}>
              <Text style={{ color: colors.text, fontSize: 14, fontWeight: "500" }}>
                {share.sender?.username || `Utilisateur #${share.sender_id}`}
              </Text>
              <Text style={{ color: colors.textMuted, fontSize: 12 }}>
                {share.latitude?.toFixed(6)}, {share.longitude?.toFixed(6)}
              </Text>
            </View>
          ))
        )}
      </View>

      <TouchableOpacity onPress={onRefresh} style={styles.refreshBtn}>
        <Ionicons name="refresh" size={16} color={colors.accentLight} />
        <Text style={{ color: colors.accentLight, fontSize: 13, fontWeight: "600" }}>
          {refreshing ? "Actualisation..." : "Actualiser"}
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 40, gap: 12 },
  card: { borderRadius: 12, padding: 14, gap: 10 },
  input: { borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10 },
  durationRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  durationChip: { borderRadius: 20, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 6 },
  primaryBtn: {
    marginTop: 4,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 10,
    paddingVertical: 12,
  },
  primaryBtnText: { color: "#fff", fontWeight: "600" },
  rowCard: { borderRadius: 10, padding: 12, flexDirection: "row", alignItems: "center", gap: 8 },
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
  refreshBtn: { flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 6, paddingVertical: 12 },
});
