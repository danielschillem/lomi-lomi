import { useEffect, useMemo, useState } from "react";
import {
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { getMySubscription } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { useTheme } from "@/lib/theme-context";

type IconName = keyof typeof Ionicons.glyphMap;

interface Shortcut {
  icon: IconName;
  label: string;
  route: string;
}

interface PrivateFeature extends Shortcut {
  tone: string;
}

const accountShortcuts: Shortcut[] = [
  { icon: "person-circle-outline", label: "Profil", route: "/(tabs)/profile" },
  { icon: "notifications-outline", label: "Notifications", route: "/(tabs)/notifications" },
  { icon: "settings-outline", label: "Paramètres", route: "/settings" },
];

const privateFeatures: PrivateFeature[] = [
  { icon: "heart-outline", label: "Découverte", route: "/(tabs)/discover", tone: "#ec4899" },
  { icon: "people-outline", label: "Matchs", route: "/(tabs)/matches", tone: "#8b5cf6" },
  { icon: "bag-outline", label: "Boutique", route: "/(tabs)/shop", tone: "#f97316" },
  { icon: "map-outline", label: "Lieux", route: "/carte", tone: "#14b8a6" },
  { icon: "calendar-outline", label: "Rendez-vous", route: "/bookings", tone: "#2563eb" },
  { icon: "restaurant-outline", label: "Réservations", route: "/reservations", tone: "#22c55e" },
  { icon: "sparkles-outline", label: "Bien-être", route: "/bien-etre", tone: "#10b981" },
  { icon: "calendar-number-outline", label: "Événements", route: "/evenements", tone: "#f59e0b" },
];

export default function TextMePlusScreen() {
  const { user, isPremium } = useAuth();
  const { colors } = useTheme();
  const [subscriptionLabel, setSubscriptionLabel] = useState(
    isPremium ? "Accès privé actif" : "Accès privé inactif",
  );

  useEffect(() => {
    if (!isPremium) return;
    getMySubscription()
      .then((res) => {
        setSubscriptionLabel(
          res?.ends_at
            ? `Actif jusqu'au ${new Date(res.ends_at).toLocaleDateString()}`
            : "Accès privé actif",
        );
      })
      .catch(() => {});
  }, [isPremium]);

  const avatarUrl = useMemo(
    () => String(user?.avatar_url || "https://via.placeholder.com/96/1a1a1a/666?text=?"),
    [user?.avatar_url],
  );

  const openPrivateFeature = (feature: PrivateFeature) => {
    router.push(feature.route as `/${string}`);
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={styles.content}
    >
      <View style={styles.header}>
        <Image
          source={{ uri: avatarUrl }}
          style={[styles.avatar, { backgroundColor: colors.cardSecondary }]}
        />
        <View style={styles.headerText}>
          <Text style={[styles.title, { color: colors.text }]}>TextMe+</Text>
          <Text style={[styles.status, { color: isPremium ? colors.success : colors.textMuted }]}>
            {subscriptionLabel}
          </Text>
        </View>
        <TouchableOpacity
          style={[
            styles.manageButton,
            { backgroundColor: isPremium ? colors.cardSecondary : colors.accent },
          ]}
          onPress={() => router.push("/premium")}
        >
          <Ionicons
            name={isPremium ? "ribbon-outline" : "lock-open-outline"}
            size={18}
            color={isPremium ? colors.text : "#fff"}
          />
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>Compte</Text>
        <View style={[styles.list, { borderColor: colors.border }]}>
          {accountShortcuts.map((item) => (
            <TouchableOpacity
              key={item.route}
              style={[styles.listRow, { borderBottomColor: colors.border }]}
              onPress={() => router.push(item.route as `/${string}`)}
            >
              <Ionicons name={item.icon} size={22} color={colors.accent} />
              <Text style={[styles.listLabel, { color: colors.text }]}>{item.label}</Text>
              <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>Accès privé</Text>
          {!isPremium ? (
            <TouchableOpacity
              style={[styles.subscribeChip, { backgroundColor: colors.accent }]}
              onPress={() => router.push("/premium")}
            >
              <Text style={styles.subscribeText}>Activer</Text>
            </TouchableOpacity>
          ) : null}
        </View>

        <View style={styles.grid}>
          {privateFeatures.map((feature) => (
            <TouchableOpacity
              key={feature.route}
              style={[
                styles.feature,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                },
              ]}
              onPress={() => openPrivateFeature(feature)}
            >
              <View style={[styles.featureIcon, { backgroundColor: `${feature.tone}20` }]}>
                <Ionicons name={feature.icon} size={22} color={feature.tone} />
              </View>
              <Text style={[styles.featureLabel, { color: colors.text }]} numberOfLines={1}>
                {feature.label}
              </Text>
              {!isPremium ? (
                <Ionicons
                  name="lock-closed"
                  size={15}
                  color={colors.textMuted}
                  style={styles.lockIcon}
                />
              ) : null}
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 32,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 24,
  },
  avatar: {
    width: 58,
    height: 58,
    borderRadius: 29,
  },
  headerText: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    fontSize: 32,
    fontWeight: "800",
  },
  status: {
    fontSize: 13,
    marginTop: 2,
  },
  manageButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  subscribeChip: {
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  subscribeText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "800",
  },
  list: {
    borderWidth: 1,
    borderRadius: 8,
    overflow: "hidden",
  },
  listRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    minHeight: 52,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
  },
  listLabel: {
    flex: 1,
    fontSize: 15,
    fontWeight: "600",
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  feature: {
    width: "48.5%",
    minHeight: 102,
    borderRadius: 8,
    borderWidth: 1,
    padding: 12,
    justifyContent: "space-between",
  },
  featureIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
  },
  featureLabel: {
    fontSize: 15,
    fontWeight: "700",
  },
  lockIcon: {
    position: "absolute",
    right: 12,
    top: 12,
  },
});
