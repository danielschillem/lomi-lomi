import { useEffect, useState, useRef, useCallback } from "react";
import {
  ScrollView,
  View,
  Text,
  Image,
  StyleSheet,
  Animated,
  PanResponder,
  Dimensions,
  TouchableOpacity,
  RefreshControl,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { discover, likeUser, passUser, updateLocation } from "@/lib/api";
import * as Location from "expo-location";
import { useFocusEffect, useIsFocused } from "@react-navigation/native";
import { useWS } from "@/lib/ws-context";
import { useTheme } from "@/lib/theme-context";
import ScreenState from "@/app/components/ScreenState";
import PremiumGate from "@/app/components/PremiumGate";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.25;

interface Profile {
  id: number;
  username: string;
  avatar_url: string;
  bio?: string;
  age?: number;
  city?: string;
  distance?: number;
  interests?: string;
  photos?: { id: number; url: string }[];
}

function DiscoverScreenInner() {
  const { colors } = useTheme();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [matchPopup, setMatchPopup] = useState<string | null>(null);
  const [hasRealtimeUpdates, setHasRealtimeUpdates] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isFocused = useIsFocused();
  const { onMessage } = useWS();
  const position = useRef(new Animated.ValueXY()).current;

  const loadProfiles = useCallback(async () => {
    try {
      const res = await discover();
      setProfiles(Array.isArray(res) ? (res as unknown as Profile[]) : []);
      setError(null);
    } catch (err) {
      setProfiles([]);
      setError((err as Error)?.message || "Impossible de charger les profils");
    }
    setLoading(false);
    setRefreshing(false);
    setHasRealtimeUpdates(false);
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === "granted") {
          const loc = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
          });
          await updateLocation({
            latitude: loc.coords.latitude,
            longitude: loc.coords.longitude,
          });
        }
      } catch {
        /* GPS optional */
      }
    })();
    loadProfiles();
  }, [loadProfiles]);

  useFocusEffect(
    useCallback(() => {
      loadProfiles();
    }, [loadProfiles]),
  );

  useEffect(() => {
    if (!isFocused) return;
    const interval = setInterval(() => {
      loadProfiles();
    }, 25000);
    return () => clearInterval(interval);
  }, [isFocused, loadProfiles]);

  useEffect(() => {
    if (!isFocused) return;
    const unsub = onMessage((msg) => {
      if (
        msg.type === "user_created" ||
        msg.type === "profile_updated" ||
        msg.type === "match_created"
      ) {
        setHasRealtimeUpdates(true);
      }
    });
    return unsub;
  }, [isFocused, onMessage]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderMove: (_, gesture) => {
        position.setValue({ x: gesture.dx, y: gesture.dy });
      },
      onPanResponderRelease: (_, gesture) => {
        if (gesture.dx > SWIPE_THRESHOLD) {
          swipeRight();
        } else if (gesture.dx < -SWIPE_THRESHOLD) {
          swipeLeft();
        } else {
          resetPosition();
        }
      },
    }),
  ).current;

  const swipeRight = async () => {
    const profile = profiles[currentIndex];
    if (!profile) return;
    Animated.spring(position, {
      toValue: { x: SCREEN_WIDTH + 100, y: 0 },
      useNativeDriver: false,
    }).start(() => {
      nextCard();
    });
    try {
      const res = await likeUser(profile.id);
      if ((res as { matched?: boolean; is_match?: boolean }).matched || (res as { matched?: boolean; is_match?: boolean }).is_match) {
        setMatchPopup(profile.username);
        setTimeout(() => setMatchPopup(null), 3000);
      }
    } catch {
      setError("Like impossible pour le moment");
    }
  };

  const swipeLeft = async () => {
    const profile = profiles[currentIndex];
    if (!profile) return;
    Animated.spring(position, {
      toValue: { x: -SCREEN_WIDTH - 100, y: 0 },
      useNativeDriver: false,
    }).start(() => {
      nextCard();
    });
    try {
      await passUser(profile.id);
    } catch {
      setError("Action indisponible, réessaie");
    }
  };

  const nextCard = () => {
    setCurrentIndex((prev) => prev + 1);
    position.setValue({ x: 0, y: 0 });
  };

  const resetPosition = () => {
    Animated.spring(position, {
      toValue: { x: 0, y: 0 },
      useNativeDriver: false,
    }).start();
  };

  const rotate = position.x.interpolate({
    inputRange: [-SCREEN_WIDTH, 0, SCREEN_WIDTH],
    outputRange: ["-15deg", "0deg", "15deg"],
  });

  const likeOpacity = position.x.interpolate({
    inputRange: [0, SCREEN_WIDTH / 4],
    outputRange: [0, 1],
    extrapolate: "clamp",
  });

  const nopeOpacity = position.x.interpolate({
    inputRange: [-SCREEN_WIDTH / 4, 0],
    outputRange: [1, 0],
    extrapolate: "clamp",
  });

  if (loading) {
    return (
      <ScreenState
        mode="loading"
        title="Chargement..."
        subtitle="Récupération des profils"
      />
    );
  }

  const current = profiles[currentIndex];
  const onRefresh = () => {
    setRefreshing(true);
    setCurrentIndex(0);
    loadProfiles();
  };

  if (!current) {
    if (error) {
      return (
        <ScreenState
          mode="error"
          title="Erreur de chargement"
          subtitle={error}
          buttonLabel="Réessayer"
          onPressButton={() => {
            setLoading(true);
            setRefreshing(true);
            loadProfiles();
          }}
        />
      );
    }
    return (
      <ScrollView
        style={{ flex: 1, backgroundColor: colors.background }}
        contentContainerStyle={{
          flexGrow: 1,
          backgroundColor: colors.background,
          justifyContent: "center",
          alignItems: "center",
        }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.accent}
          />
        }
      >
        {hasRealtimeUpdates && (
          <TouchableOpacity style={styles.updatesBanner} onPress={onRefresh}>
            <Ionicons name="flash-outline" size={16} color="#fff" />
            <Text style={styles.updatesBannerText}>
              Nouveaux profils disponibles - Appuie pour actualiser
            </Text>
          </TouchableOpacity>
        )}
        <Ionicons name="heart-dislike" size={64} color={colors.border} />
        <Text style={{ color: colors.textMuted, fontSize: 16, marginTop: 16 }}>
          Plus de profils pour le moment
        </Text>
        <TouchableOpacity
          style={styles.reloadBtn}
          onPress={() => {
            setCurrentIndex(0);
            setRefreshing(true);
            loadProfiles();
          }}
        >
          <Text style={styles.reloadText}>Recharger</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{
        flexGrow: 1,
        backgroundColor: colors.background,
        alignItems: "center",
        paddingBottom: 24,
      }}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={colors.accent}
        />
      }
    >
      {hasRealtimeUpdates && (
        <TouchableOpacity style={styles.updatesBanner} onPress={onRefresh}>
          <Ionicons name="flash-outline" size={16} color="#fff" />
          <Text style={styles.updatesBannerText}>
            Nouveaux profils disponibles - Appuie pour actualiser
          </Text>
        </TouchableOpacity>
      )}
      {error ? (
        <Text style={styles.errorBanner}>{error}</Text>
      ) : null}
      {matchPopup && (
        <View style={styles.matchPopup}>
          <Text style={styles.matchText}> Match avec {matchPopup} !</Text>
        </View>
      )}

      {/* Card */}
      <Animated.View
        {...panResponder.panHandlers}
        style={[
          styles.card,
          {
            backgroundColor: colors.card,
            transform: [
              { translateX: position.x },
              { translateY: position.y },
              { rotate },
            ],
          },
        ]}
      >
        <Animated.View
          style={[styles.stamp, styles.likeStamp, { opacity: likeOpacity }]}
        >
          <Text style={styles.stampText}>LIKE </Text>
        </Animated.View>
        <Animated.View
          style={[styles.stamp, styles.nopeStamp, { opacity: nopeOpacity }]}
        >
          <Text style={styles.stampText}>NOPE ✕</Text>
        </Animated.View>

        <Image
          source={{
            uri:
              current.avatar_url ||
              "https://via.placeholder.com/400x500/1a1a1a/666?text=No+Photo",
          }}
          style={[styles.image, { backgroundColor: colors.cardSecondary }]}
        />
        <View style={styles.info}>
          <Text style={[styles.name, { color: colors.text }]}>
            {current.username}
            {current.age ? `, ${current.age}` : ""}
          </Text>
          <View style={styles.metaRow}>
            {current.city ? (
              <Text style={[styles.city, { color: colors.textSecondary }]}>
                <Ionicons name="location-outline" size={14} color={colors.textMuted} />{" "}
                {current.city}
              </Text>
            ) : null}
            {current.distance != null && current.distance >= 0 ? (
              <Text style={[styles.distance, { color: colors.accent }]}>
                <Ionicons name="navigate-outline" size={13} color={colors.accent} />{" "}
                {current.distance} km
              </Text>
            ) : null}
          </View>
          {current.bio ? (
            <Text style={[styles.bio, { color: colors.textSecondary }]} numberOfLines={2}>
              {current.bio}
            </Text>
          ) : null}
          {current.interests ? (
            <View style={styles.tagsRow}>
              {current.interests
                .split(",")
                .slice(0, 4)
                .map((tag, i) => (
                  <View key={i} style={styles.tag}>
                    <Text style={styles.tagText}>{tag.trim()}</Text>
                  </View>
                ))}
            </View>
          ) : null}
        </View>
      </Animated.View>

      {/* Buttons */}
      <View style={styles.buttons}>
        <TouchableOpacity
          style={[styles.actionBtn, styles.nopeBtn]}
          onPress={swipeLeft}
        >
          <Ionicons name="close" size={32} color="#ef4444" />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionBtn, styles.likeBtn]}
          onPress={swipeRight}
        >
          <Ionicons name="heart" size={32} color="#2563eb" />
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  card: {
    width: SCREEN_WIDTH - 32,
    height: "70%",
    borderRadius: 20,
    overflow: "hidden",
    marginTop: 16,
  },
  image: { width: "100%", height: "75%" },
  info: { padding: 16 },
  name: { fontSize: 24, fontWeight: "bold" },
  metaRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 4,
    alignItems: "center",
  },
  city: { fontSize: 14 },
  distance: { fontSize: 13, fontWeight: "600" },
  bio: { fontSize: 14, marginTop: 6 },
  tagsRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 8 },
  tag: {
    backgroundColor: "rgba(37,99,235,0.15)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  tagText: { color: "#60a5fa", fontSize: 12, fontWeight: "500" },
  stamp: {
    position: "absolute",
    top: 50,
    zIndex: 10,
    padding: 12,
    borderWidth: 3,
    borderRadius: 10,
  },
  likeStamp: {
    left: 20,
    borderColor: "#2563eb",
    transform: [{ rotate: "-15deg" }],
  },
  nopeStamp: {
    right: 20,
    borderColor: "#ef4444",
    transform: [{ rotate: "15deg" }],
  },
  stampText: { fontSize: 28, fontWeight: "bold", color: "#fff" },
  buttons: {
    flexDirection: "row",
    gap: 32,
    marginTop: 24,
  },
  actionBtn: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
  },
  nopeBtn: { borderColor: "#ef4444", backgroundColor: "rgba(239,68,68,0.1)" },
  likeBtn: { borderColor: "#2563eb", backgroundColor: "rgba(37,99,235,0.1)" },
  matchPopup: {
    position: "absolute",
    top: 60,
    zIndex: 100,
    backgroundColor: "#2563eb",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 20,
  },
  matchText: { color: "#fff", fontSize: 18, fontWeight: "bold" },
  reloadBtn: {
    marginTop: 24,
    backgroundColor: "#2563eb",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  reloadText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  updatesBanner: {
    marginTop: 12,
    backgroundColor: "#2563eb",
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  updatesBannerText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
  errorBanner: {
    marginTop: 10,
    color: "#fca5a5",
    fontSize: 12,
    backgroundColor: "rgba(239,68,68,0.15)",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
});

export default function DiscoverScreen() {
  return (
    <PremiumGate feature="Découverte" icon="heart-outline" tone="#ec4899">
      <DiscoverScreenInner />
    </PremiumGate>
  );
}
