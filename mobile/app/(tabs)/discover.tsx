import { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  Image,
  StyleSheet,
  Animated,
  PanResponder,
  Dimensions,
  ActivityIndicator,
  TouchableOpacity,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { discover, likeUser, passUser, updateLocation } from "@/lib/api";
import * as Location from "expo-location";

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

export default function DiscoverScreen() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [matchPopup, setMatchPopup] = useState<string | null>(null);
  const position = useRef(new Animated.ValueXY()).current;

  useEffect(() => {
    // Update GPS location silently before loading profiles
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
        /* GPS optional — continue without it */
      }
    })();
    loadProfiles();
  }, []);

  const loadProfiles = async () => {
    try {
      const res = await discover();
      setProfiles(Array.isArray(res) ? (res as unknown as Profile[]) : []);
    } catch {
      setProfiles([]);
    }
    setLoading(false);
  };

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
    Animated.spring(position, {
      toValue: { x: SCREEN_WIDTH + 100, y: 0 },
      useNativeDriver: false,
    }).start(() => {
      nextCard();
    });
    try {
      const res = await likeUser(profile.id);
      if (res.matched) {
        setMatchPopup(profile.username);
        setTimeout(() => setMatchPopup(null), 3000);
      }
    } catch {
      /* empty */
    }
  };

  const swipeLeft = async () => {
    const profile = profiles[currentIndex];
    Animated.spring(position, {
      toValue: { x: -SCREEN_WIDTH - 100, y: 0 },
      useNativeDriver: false,
    }).start(() => {
      nextCard();
    });
    try {
      await passUser(profile.id);
    } catch {
      /* empty */
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
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#7c3aed" />
      </View>
    );
  }

  const current = profiles[currentIndex];

  if (!current) {
    return (
      <View style={styles.center}>
        <Ionicons name="heart-dislike" size={64} color="#333" />
        <Text style={styles.emptyText}>Plus de profils pour le moment</Text>
        <TouchableOpacity
          style={styles.reloadBtn}
          onPress={() => {
            setCurrentIndex(0);
            setLoading(true);
            loadProfiles();
          }}
        >
          <Text style={styles.reloadText}>Recharger</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Match popup */}
      {matchPopup && (
        <View style={styles.matchPopup}>
          <Text style={styles.matchText}>🎉 Match avec {matchPopup} !</Text>
        </View>
      )}

      {/* Card */}
      <Animated.View
        {...panResponder.panHandlers}
        style={[
          styles.card,
          {
            transform: [
              { translateX: position.x },
              { translateY: position.y },
              { rotate },
            ],
          },
        ]}
      >
        {/* LIKE / NOPE overlays */}
        <Animated.View
          style={[styles.stamp, styles.likeStamp, { opacity: likeOpacity }]}
        >
          <Text style={styles.stampText}>LIKE 💜</Text>
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
          style={styles.image}
        />
        <View style={styles.info}>
          <Text style={styles.name}>
            {current.username}
            {current.age ? `, ${current.age}` : ""}
          </Text>
          <View style={styles.metaRow}>
            {current.city ? (
              <Text style={styles.city}>
                <Ionicons name="location-outline" size={14} color="#999" />{" "}
                {current.city}
              </Text>
            ) : null}
            {current.distance != null && current.distance >= 0 ? (
              <Text style={styles.distance}>
                <Ionicons name="navigate-outline" size={13} color="#7c3aed" />{" "}
                {current.distance} km
              </Text>
            ) : null}
          </View>
          {current.bio ? (
            <Text style={styles.bio} numberOfLines={2}>
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
          <Ionicons name="heart" size={32} color="#7c3aed" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0a0a0a", alignItems: "center" },
  center: {
    flex: 1,
    backgroundColor: "#0a0a0a",
    justifyContent: "center",
    alignItems: "center",
  },
  card: {
    width: SCREEN_WIDTH - 32,
    height: "70%",
    borderRadius: 20,
    overflow: "hidden",
    backgroundColor: "#1a1a1a",
    marginTop: 16,
    position: "absolute",
    top: 0,
  },
  image: { width: "100%", height: "75%", backgroundColor: "#1a1a1a" },
  info: { padding: 16 },
  name: { fontSize: 24, fontWeight: "bold", color: "#fff" },
  metaRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 4,
    alignItems: "center",
  },
  city: { fontSize: 14, color: "#999" },
  distance: { fontSize: 13, color: "#7c3aed", fontWeight: "600" },
  bio: { fontSize: 14, color: "#ccc", marginTop: 6 },
  tagsRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 8 },
  tag: {
    backgroundColor: "rgba(124,58,237,0.15)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  tagText: { color: "#a78bfa", fontSize: 12, fontWeight: "500" },
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
    borderColor: "#7c3aed",
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
    position: "absolute",
    bottom: 48,
    gap: 32,
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
  likeBtn: { borderColor: "#7c3aed", backgroundColor: "rgba(124,58,237,0.1)" },
  matchPopup: {
    position: "absolute",
    top: 60,
    zIndex: 100,
    backgroundColor: "#7c3aed",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 20,
  },
  matchText: { color: "#fff", fontSize: 18, fontWeight: "bold" },
  emptyText: { color: "#666", fontSize: 16, marginTop: 16 },
  reloadBtn: {
    marginTop: 24,
    backgroundColor: "#7c3aed",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  reloadText: { color: "#fff", fontSize: 16, fontWeight: "600" },
});
