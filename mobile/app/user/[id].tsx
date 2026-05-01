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

export default function UserProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user: me } = useAuth();
  const [profile, setProfile] = useState<Record<string, unknown> | null>(null);
  const [photos, setPhotos] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);

  const userId = parseInt(id || "0", 10);

  useEffect(() => {
    (async () => {
      try {
        const [p, ph] = await Promise.all([
          getPublicProfile(userId),
          getPhotos(userId).catch(() => []),
        ]);
        setProfile(p);
        setPhotos(Array.isArray(ph) ? ph : []);
      } catch {
        setPhotos([]);
      }
      setLoading(false);
    })();
  }, [userId]);

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
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#7c3aed" />
      </View>
    );
  }

  if (!profile) {
    return (
      <View style={styles.center}>
        <Text style={styles.emptyText}>Profil introuvable</Text>
      </View>
    );
  }

  const p = profile;

  return (
    <ScrollView style={styles.container}>
      <Stack.Screen options={{ title: (p.username as string) || "Profil" }} />

      <Image
        source={{
          uri:
            (p.avatar_url as string) ||
            "https://via.placeholder.com/400/1a1a1a/666?text=?",
        }}
        style={styles.heroImage}
      />

      <View style={styles.body}>
        <Text style={styles.name}>
          {p.username as string}
          {p.age ? `, ${p.age}` : ""}
        </Text>
        {p.city && (
          <View style={styles.row}>
            <Ionicons name="location" size={16} color="#7c3aed" />
            <Text style={styles.city}>{p.city as string}</Text>
          </View>
        )}
        {p.bio && <Text style={styles.bio}>{p.bio as string}</Text>}

        {/* Photos */}
        {photos.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Photos</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {photos.map((photo, i) => (
                <Image
                  key={i}
                  source={{ uri: photo.url as string }}
                  style={styles.photoThumb}
                />
              ))}
            </ScrollView>
          </View>
        )}

        {/* Actions */}
        {me?.id !== userId && (
          <View style={styles.actions}>
            <TouchableOpacity style={styles.msgBtn} onPress={handleMessage}>
              <Ionicons name="chatbubble" size={20} color="#fff" />
              <Text style={styles.msgText}>Envoyer un message</Text>
            </TouchableOpacity>

            <View style={styles.safetyRow}>
              <TouchableOpacity style={styles.safetyBtn} onPress={handleReport}>
                <Ionicons name="flag" size={18} color="#f59e0b" />
                <Text style={styles.safetyText}>Signaler</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.safetyBtn} onPress={handleBlock}>
                <Ionicons name="ban" size={18} color="#ef4444" />
                <Text style={[styles.safetyText, { color: "#ef4444" }]}>
                  Bloquer
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0a0a0a" },
  center: {
    flex: 1,
    backgroundColor: "#0a0a0a",
    justifyContent: "center",
    alignItems: "center",
  },
  emptyText: { color: "#666", fontSize: 16 },
  heroImage: { width: "100%", height: 350, backgroundColor: "#1a1a1a" },
  body: { padding: 20 },
  name: { color: "#fff", fontSize: 26, fontWeight: "bold" },
  row: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 4 },
  city: { color: "#999", fontSize: 15 },
  bio: { color: "#ccc", fontSize: 15, lineHeight: 22, marginTop: 12 },
  section: { marginTop: 24 },
  sectionTitle: {
    color: "#999",
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
    backgroundColor: "#1a1a1a",
  },
  actions: { marginTop: 24, gap: 12 },
  msgBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#7c3aed",
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
    borderColor: "#333",
    borderRadius: 12,
    gap: 6,
  },
  safetyText: { color: "#f59e0b", fontSize: 14, fontWeight: "500" },
});
