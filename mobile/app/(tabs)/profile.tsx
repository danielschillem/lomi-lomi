import { useEffect, useState } from "react";
import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/lib/auth-context";
import { getProfile } from "@/lib/api";

export default function ProfileScreen() {
  const { user, logout } = useAuth();
  const [profile, setProfile] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await getProfile();
        setProfile(res);
      } catch {
        /* empty */
      }
      setLoading(false);
    })();
  }, []);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#7c3aed" />
      </View>
    );
  }

  const p = profile || {};

  const menuItems = [
    {
      icon: "create-outline" as const,
      label: "Modifier le profil",
      route: "/edit-profile",
    },
    { icon: "images-outline" as const, label: "Mes photos", route: "/photos" },
    { icon: "bag-outline" as const, label: "Mes commandes", route: "/orders" },
    {
      icon: "calendar-outline" as const,
      label: "Mes rendez-vous",
      route: "/bookings",
    },
    {
      icon: "restaurant-outline" as const,
      label: "Mes réservations",
      route: "/reservations",
    },
    {
      icon: "location-outline" as const,
      label: "Mes adresses",
      route: "/addresses",
    },
    { icon: "car-outline" as const, label: "Mes courses", route: "/rides" },
    {
      icon: "settings-outline" as const,
      label: "Paramètres",
      route: "/settings",
    },
    {
      icon: "ban-outline" as const,
      label: "Utilisateurs bloqués",
      route: "/blocked",
    },
  ];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Image
          source={{
            uri:
              (p.avatar_url as string) ||
              "https://via.placeholder.com/120/1a1a1a/666?text=?",
          }}
          style={styles.avatar}
        />
        <Text style={styles.name}>{user?.username || "Utilisateur"}</Text>
        <Text style={styles.role}>
          {user?.role === "admin" ? "Administrateur" : "Membre"}
        </Text>
      </View>

      <View style={styles.stats}>
        <View style={styles.stat}>
          <Text style={styles.statNumber}>
            {(p.matches_count as number) || 0}
          </Text>
          <Text style={styles.statLabel}>Matchs</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statNumber}>
            {(p.likes_count as number) || 0}
          </Text>
          <Text style={styles.statLabel}>Likes</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statNumber}>
            {(p.visits_count as number) || 0}
          </Text>
          <Text style={styles.statLabel}>Visites</Text>
        </View>
      </View>

      {p.bio ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Bio</Text>
          <Text style={styles.bio}>{p.bio as string}</Text>
        </View>
      ) : null}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Infos</Text>
        {p.city && (
          <View style={styles.infoRow}>
            <Ionicons name="location" size={18} color="#7c3aed" />
            <Text style={styles.infoText}>{p.city as string}</Text>
          </View>
        )}
        {p.age && (
          <View style={styles.infoRow}>
            <Ionicons name="calendar" size={18} color="#7c3aed" />
            <Text style={styles.infoText}>{p.age as number} ans</Text>
          </View>
        )}
        <View style={styles.infoRow}>
          <Ionicons name="mail" size={18} color="#7c3aed" />
          <Text style={styles.infoText}>
            {(p.email as string) || user?.username}
          </Text>
        </View>
      </View>

      {/* Menu items */}
      <View style={styles.menu}>
        {menuItems.map((item) => (
          <TouchableOpacity
            key={item.route}
            style={styles.menuItem}
            onPress={() => router.push(item.route as `/${string}`)}
          >
            <Ionicons name={item.icon} size={22} color="#7c3aed" />
            <Text style={styles.menuText}>{item.label}</Text>
            <Ionicons name="chevron-forward" size={18} color="#444" />
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
        <Ionicons name="log-out-outline" size={20} color="#ef4444" />
        <Text style={styles.logoutText}>Se déconnecter</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0a0a0a" },
  content: { paddingBottom: 40 },
  center: {
    flex: 1,
    backgroundColor: "#0a0a0a",
    justifyContent: "center",
    alignItems: "center",
  },
  header: { alignItems: "center", paddingTop: 24, paddingBottom: 16 },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "#1a1a1a",
    borderWidth: 3,
    borderColor: "#7c3aed",
  },
  name: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#fff",
    marginTop: 12,
  },
  role: { fontSize: 14, color: "#7c3aed", marginTop: 2 },
  stats: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingVertical: 20,
    marginHorizontal: 16,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: "#1a1a1a",
  },
  stat: { alignItems: "center" },
  statNumber: { fontSize: 20, fontWeight: "bold", color: "#fff" },
  statLabel: { fontSize: 12, color: "#666", marginTop: 2 },
  section: {
    marginHorizontal: 16,
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#999",
    marginBottom: 12,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  bio: { fontSize: 15, color: "#ccc", lineHeight: 22 },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 8,
  },
  infoText: { fontSize: 15, color: "#ccc" },
  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 40,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: "#ef4444",
    borderRadius: 12,
  },
  logoutText: { color: "#ef4444", fontSize: 16, fontWeight: "600" },
  menu: {
    marginTop: 24,
    marginHorizontal: 16,
    backgroundColor: "#111",
    borderRadius: 12,
    overflow: "hidden",
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#1a1a1a",
    gap: 12,
  },
  menuText: { flex: 1, color: "#ccc", fontSize: 15 },
});
