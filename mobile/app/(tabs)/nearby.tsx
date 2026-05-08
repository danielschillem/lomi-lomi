import { useEffect, useState, useRef, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Animated,
  Easing,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import * as Location from "expo-location";
import PremiumGate from "@/app/components/PremiumGate";
import { updateLocation, nearbyUsers } from "@/lib/api";
import { useWS } from "@/lib/ws-context";
import { useTheme } from "@/lib/theme-context";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const RADAR_SIZE = SCREEN_WIDTH - 64;
const RADAR_CENTER = RADAR_SIZE / 2;

interface NearbyUser {
  id: number;
  username: string;
  avatar_url: string;
  is_online: boolean;
  distance: number;
  angle: number;
}

function NearbyScreenInner() {
  const { colors } = useTheme();
  const [users, setUsers] = useState<NearbyUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [radius, setRadius] = useState(10);
  const [hasLocation, setHasLocation] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const watchRef = useRef<Location.LocationSubscription | null>(null);
  const lastPushRef = useRef<number>(0);
  const { onMessage } = useWS();
  const spinAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const spin = Animated.loop(
      Animated.timing(spinAnim, {
        toValue: 1,
        duration: 4000,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    spin.start();

    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 0.6, duration: 1500, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 0.3, duration: 1500, useNativeDriver: true }),
      ]),
    );
    pulse.start();

    return () => { spin.stop(); pulse.stop(); };
  }, [spinAnim, pulseAnim]);

  const loadNearby = useCallback(async () => {
    try {
      const res = await nearbyUsers(radius);
      setUsers(res.users || []);
    } catch {
      setUsers([]);
    }
  }, [radius]);

  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") {
          setError("Permission de localisation refusée");
          setLoading(false);
          return;
        }
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        await updateLocation({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });
        watchRef.current = await Location.watchPositionAsync(
          { accuracy: Location.Accuracy.Balanced, timeInterval: 8000, distanceInterval: 20 },
          async (position) => {
            const now = Date.now();
            if (now - lastPushRef.current < 7000) return;
            lastPushRef.current = now;
            await updateLocation({ latitude: position.coords.latitude, longitude: position.coords.longitude }).catch(() => {});
            await loadNearby();
          },
        );
        setHasLocation(true);
        await loadNearby();
      } catch {
        setError("Impossible d'obtenir la position GPS");
      }
      setLoading(false);
    })();
    return () => { if (watchRef.current) { watchRef.current.remove(); watchRef.current = null; } };
  }, [loadNearby]);

  useEffect(() => {
    if (!hasLocation) return;
    const interval = setInterval(loadNearby, 12000);
    return () => clearInterval(interval);
  }, [hasLocation, loadNearby]);

  useEffect(() => {
    if (!hasLocation) return;
    const unsub = onMessage((msg) => { if (msg.type === "profile_updated") loadNearby(); });
    return unsub;
  }, [hasLocation, onMessage, loadNearby]);

  const changeRadius = async (newRadius: number) => {
    setRadius(newRadius);
    try {
      const res = await nearbyUsers(newRadius);
      setUsers(res.users || []);
    } catch { /* empty */ }
  };

  const spinRotate = spinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  const getUserPosition = (user: NearbyUser) => {
    const maxR = RADAR_CENTER - 24;
    const ratio = Math.min(user.distance / radius, 1);
    const r = ratio * maxR;
    const angleRad = (user.angle - 90) * (Math.PI / 180);
    const x = RADAR_CENTER + r * Math.cos(angleRad) - 16;
    const y = RADAR_CENTER + r * Math.sin(angleRad) - 16;
    return { left: x, top: y };
  };

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, justifyContent: "center", alignItems: "center", padding: 32 }}>
        <ActivityIndicator size="large" color={colors.accent} />
        <Text style={{ color: colors.textSecondary, fontSize: 14, marginTop: 16 }}>
          Recherche de position GPS...
        </Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, justifyContent: "center", alignItems: "center", padding: 32 }}>
        <Ionicons name="location-outline" size={64} color={colors.textMuted} />
        <Text style={{ color: colors.textSecondary, fontSize: 16, marginTop: 16, textAlign: "center" }}>{error}</Text>
        <TouchableOpacity
          style={[styles.retryBtn, { backgroundColor: colors.accent }]}
          onPress={() => {
            setError(null);
            setLoading(true);
            Location.requestForegroundPermissionsAsync().then(({ status }) => {
              if (status === "granted") {
                Location.getCurrentPositionAsync({}).then((loc) => {
                  updateLocation({ latitude: loc.coords.latitude, longitude: loc.coords.longitude }).then(() => {
                    setHasLocation(true);
                    loadNearby().then(() => setLoading(false));
                  });
                });
              } else {
                setError("Permission refusée");
                setLoading(false);
              }
            });
          }}
        >
          <Text style={styles.retryText}>Réessayer</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background, alignItems: "center" }}>
      {/* Radius selector */}
      <View style={styles.radiusRow}>
        {[5, 10, 25, 50].map((r) => (
          <TouchableOpacity
            key={r}
            style={[
              styles.radiusBtn,
              { backgroundColor: colors.cardSecondary },
              radius === r && { backgroundColor: colors.accent },
            ]}
            onPress={() => changeRadius(r)}
          >
            <Text style={[styles.radiusBtnText, { color: colors.textMuted }, radius === r && { color: "#fff" }]}>
              {r} km
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Radar — intentionally kept dark for visual effect */}
      <View style={styles.radarContainer}>
        <View style={[styles.radarCircle, styles.circle1]} />
        <View style={[styles.radarCircle, styles.circle2]} />
        <View style={[styles.radarCircle, styles.circle3]} />
        <View style={[styles.radarCircle, styles.circle4]} />
        <View style={styles.crossH} />
        <View style={styles.crossV} />
        <Animated.View style={[styles.sweep, { transform: [{ rotate: spinRotate }], opacity: pulseAnim }]} />
        <View style={styles.centerDot}>
          <View style={styles.centerDotInner} />
        </View>
        {users.map((user) => {
          const pos = getUserPosition(user);
          return (
            <TouchableOpacity
              key={user.id}
              style={[styles.userDot, pos]}
              onPress={() => router.push(`/user/${user.id}`)}
            >
              {user.avatar_url ? (
                <Image source={{ uri: user.avatar_url }} style={styles.userAvatar} />
              ) : (
                <View style={styles.userAvatarPlaceholder}>
                  <Ionicons name="person" size={16} color="#999" />
                </View>
              )}
              {user.is_online && <View style={styles.onlineDot} />}
            </TouchableOpacity>
          );
        })}
        <Text style={[styles.distLabel, { top: 4, left: RADAR_CENTER - 20 }]}>{radius} km</Text>
        <Text style={[styles.distLabel, { top: RADAR_CENTER / 2 - 6, left: RADAR_CENTER - 15 }]}>
          {Math.round(radius / 2)} km
        </Text>
      </View>

      <Text style={{ color: colors.textSecondary, fontSize: 14, marginTop: 12, marginBottom: 8 }}>
        {users.length === 0
          ? "Aucun utilisateur à proximité"
          : `${users.length} personne${users.length > 1 ? "s" : ""} dans un rayon de ${radius} km`}
      </Text>

      {users.length > 0 && (
        <View style={{ width: "100%", paddingHorizontal: 16 }}>
          {users.slice(0, 5).map((user) => (
            <TouchableOpacity
              key={user.id}
              style={[styles.userRow, { borderBottomColor: colors.border }]}
              onPress={() => router.push(`/user/${user.id}`)}
            >
              {user.avatar_url ? (
                <Image source={{ uri: user.avatar_url }} style={[styles.userListAvatar, { backgroundColor: colors.cardSecondary }]} />
              ) : (
                <View style={[styles.userListAvatar, styles.userAvatarPlaceholder]}>
                  <Ionicons name="person" size={18} color={colors.textMuted} />
                </View>
              )}
              <View style={{ flex: 1 }}>
                <Text style={{ color: colors.text, fontSize: 15, fontWeight: "600" }}>{user.username}</Text>
                <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: 2 }}>{user.distance} km</Text>
              </View>
              {user.is_online && (
                <View style={styles.onlineBadge}>
                  <Text style={styles.onlineBadgeText}>En ligne</Text>
                </View>
              )}
              <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  retryBtn: {
    marginTop: 24,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  retryText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  radiusRow: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  radiusBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: "center",
  },
  radiusBtnText: { fontSize: 13, fontWeight: "600" },
  radarContainer: {
    width: RADAR_SIZE,
    height: RADAR_SIZE,
    borderRadius: RADAR_SIZE / 2,
    backgroundColor: "#0f0f1a",
    borderWidth: 1,
    borderColor: "#2a2a4a",
    marginTop: 8,
    position: "relative",
    overflow: "hidden",
  },
  radarCircle: {
    position: "absolute",
    borderWidth: 1,
    borderColor: "rgba(37,99,235,0.2)",
    borderRadius: 9999,
  },
  circle1: {
    width: RADAR_SIZE * 0.25,
    height: RADAR_SIZE * 0.25,
    left: RADAR_CENTER - (RADAR_SIZE * 0.25) / 2,
    top: RADAR_CENTER - (RADAR_SIZE * 0.25) / 2,
  },
  circle2: {
    width: RADAR_SIZE * 0.5,
    height: RADAR_SIZE * 0.5,
    left: RADAR_CENTER - (RADAR_SIZE * 0.5) / 2,
    top: RADAR_CENTER - (RADAR_SIZE * 0.5) / 2,
  },
  circle3: {
    width: RADAR_SIZE * 0.75,
    height: RADAR_SIZE * 0.75,
    left: RADAR_CENTER - (RADAR_SIZE * 0.75) / 2,
    top: RADAR_CENTER - (RADAR_SIZE * 0.75) / 2,
  },
  circle4: {
    width: RADAR_SIZE,
    height: RADAR_SIZE,
    left: 0,
    top: 0,
    borderColor: "rgba(37,99,235,0.15)",
  },
  crossH: {
    position: "absolute",
    top: RADAR_CENTER,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: "rgba(37,99,235,0.12)",
  },
  crossV: {
    position: "absolute",
    left: RADAR_CENTER,
    top: 0,
    bottom: 0,
    width: 1,
    backgroundColor: "rgba(37,99,235,0.12)",
  },
  sweep: {
    position: "absolute",
    width: RADAR_SIZE / 2,
    height: RADAR_SIZE / 2,
    left: RADAR_CENTER,
    top: 0,
    borderBottomLeftRadius: RADAR_SIZE / 2,
    backgroundColor: "rgba(37,99,235,0.3)",
    transformOrigin: "bottom left",
  },
  centerDot: {
    position: "absolute",
    left: RADAR_CENTER - 8,
    top: RADAR_CENTER - 8,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: "rgba(37,99,235,0.4)",
    justifyContent: "center",
    alignItems: "center",
  },
  centerDotInner: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#2563eb" },
  userDot: { position: "absolute", width: 32, height: 32 },
  userAvatar: { width: 32, height: 32, borderRadius: 16, borderWidth: 2, borderColor: "#2563eb" },
  userAvatarPlaceholder: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#1a1a1a",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#333",
  },
  onlineDot: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#22c55e",
    borderWidth: 2,
    borderColor: "#0f0f1a",
  },
  distLabel: { position: "absolute", color: "rgba(37,99,235,0.5)", fontSize: 10 },
  userRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    gap: 12,
  },
  userListAvatar: { width: 40, height: 40, borderRadius: 20 },
  onlineBadge: {
    backgroundColor: "rgba(34,197,94,0.15)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  onlineBadgeText: { color: "#22c55e", fontSize: 11, fontWeight: "600" },
});

export default function NearbyScreen() {
  return (
    <PremiumGate feature="Radar" icon="radio-outline" tone="#06b6d4">
      <NearbyScreenInner />
    </PremiumGate>
  );
}
