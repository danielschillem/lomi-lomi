import { useEffect, useState } from "react";
import {
  View,
  Text,
  Image,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useLocalSearchParams, Stack, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import {
  getPublicProfile,
  getPhotos,
  getOrCreateConversation,
  reportUser,
  blockUser,
} from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { useTheme } from "@/lib/theme-context";

export default function UserProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user: me } = useAuth();
  const { colors } = useTheme();
  const [profile, setProfile] = useState<Record<string, any> | null>(null);
  const [photos, setPhotos] = useState<Record<string, any>[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const userId = parseInt(id || "0", 10);
  const isValidUserId = Number.isFinite(userId) && userId > 0;

  const loadProfile = async () => {
    setLoadError(null);
    if (!isValidUserId) {
      setProfile(null);
      setPhotos([]);
      setLoading(false);
      return;
    }
    try {
      const [p, ph] = await Promise.all([
        getPublicProfile(userId),
        getPhotos(userId).catch(() => []),
      ]);
      setProfile(p);
      setPhotos(Array.isArray(ph) ? ph : []);
    } catch (e: unknown) {
      setProfile(null);
      setPhotos([]);
      setLoadError((e as Error).message || "Impossible de charger ce profil.");
    }
    setLoading(false);
  };

  useEffect(() => {
    void loadProfile();
  }, [isValidUserId, userId]);

  const handleMessage = async () => {
    try {
      const conv = await getOrCreateConversation(userId);
      const c = conv as { id: number };
      router.push({
        pathname: "/chat/[id]",
        params: {
          id: c.id,
          name: (profile?.username as string) || "Chat",
          recipientId: userId,
        },
      });
    } catch {
      /* empty */
    }
  };

  const handleReport = () => {
    Alert.alert("Signaler", "Signaler cet utilisateur ?", [
      { text: "Annuler", style: "cancel" },
      {
        text: "Signaler",
        style: "destructive",
        onPress: async () => {
          try {
            await reportUser({
              reported_id: userId,
              reason: "inappropriate",
              details: "Signalé depuis le profil",
            });
            Alert.alert("Merci", "Signalement envoyé");
          } catch {
            /* empty */
          }
        },
      },
    ]);
  };

  const handleBlock = () => {
    Alert.alert("Bloquer", "Bloquer cet utilisateur ?", [
      { text: "Annuler", style: "cancel" },
      {
        text: "Bloquer",
        style: "destructive",
        onPress: async () => {
          try {
            await blockUser({ blocked_id: userId });
            Alert.alert("Bloqué", "Utilisateur bloqué");
            router.back();
          } catch {
            /* empty */
          }
        },
      },
    ]);
  };

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  if (!isValidUserId) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.textMuted, fontSize: 16 }}>Profil introuvable</Text>
      </View>
    );
  }

  if (loadError && !profile) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.textMuted, fontSize: 16 }}>{loadError}</Text>
        <TouchableOpacity
          style={[styles.retryBtn, { backgroundColor: colors.accent }]}
          onPress={() => {
            setLoading(true);
            void loadProfile();
          }}
        >
          <Text style={styles.retryText}>Réessayer</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!profile) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.textMuted, fontSize: 16 }}>Profil introuvable</Text>
      </View>
    );
  }

  const p = profile;

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ title: (p.username as string) || "Profil" }} />

      <Image
        source={{
          uri:
            (p.avatar_url as string) ||
            "https://via.placeholder.com/400/1a1a1a/666?text=?",
        }}
        style={[styles.heroImage, { backgroundColor: colors.cardSecondary }]}
      />

      <View style={styles.body}>
        <Text style={[styles.name, { color: colors.text }]}>
          {p.username as string}
          {p.age ? `, ${p.age}` : ""}
        </Text>
        {p.city && (
          <View style={styles.row}>
            <Ionicons name="location" size={16} color={colors.accent} />
            <Text style={[styles.city, { color: colors.textMuted }]}>{p.city as string}</Text>
          </View>
        )}
        {p.bio && <Text style={[styles.bio, { color: colors.textSecondary }]}>{p.bio as string}</Text>}

        {/* Photos */}
        {photos.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>Photos</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {photos.map((photo, i) => (
                <Image
                  key={i}
                  source={{ uri: photo.url as string }}
                  style={[styles.photoThumb, { backgroundColor: colors.cardSecondary }]}
                />
              ))}
            </ScrollView>
          </View>
        )}

        {/* Actions */}
        {me?.id !== userId && (
          <View style={styles.actions}>
            <TouchableOpacity style={[styles.msgBtn, { backgroundColor: colors.accent }]} onPress={handleMessage}>
              <Ionicons name="chatbubble" size={20} color="#fff" />
              <Text style={styles.msgText}>Envoyer un message</Text>
            </TouchableOpacity>

            <View style={styles.safetyRow}>
              <TouchableOpacity style={[styles.safetyBtn, { borderColor: colors.border }]} onPress={handleReport}>
                <Ionicons name="flag" size={18} color="#f59e0b" />
                <Text style={{ color: "#f59e0b", fontSize: 14, fontWeight: "500" }}>Signaler</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.safetyBtn, { borderColor: colors.border }]} onPress={handleBlock}>
                <Ionicons name="ban" size={18} color="#ef4444" />
                <Text style={{ color: "#ef4444", fontSize: 14, fontWeight: "500" }}>Bloquer</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  heroImage: { width: "100%", height: 350 },
  body: { padding: 20 },
  name: { fontSize: 26, fontWeight: "bold" },
  row: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 4 },
  city: { fontSize: 15 },
  bio: { fontSize: 15, lineHeight: 22, marginTop: 12 },
  section: { marginTop: 24 },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 12,
  },
  photoThumb: {
    width: 100,
    height: 100,
    borderRadius: 8,
    marginRight: 8,
  },
  actions: { marginTop: 24, gap: 12 },
  msgBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  msgText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  safetyRow: { flexDirection: "row", gap: 12 },
  safetyBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderWidth: 1,
    borderRadius: 12,
    gap: 6,
  },
  retryBtn: {
    marginTop: 12,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  retryText: { color: "#fff", fontSize: 14, fontWeight: "600" },
});
