import { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  TextInput,
  RefreshControl,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { getWellnessProviders } from "@/lib/api";
import { useTheme } from "@/lib/theme-context";

interface WellnessService {
  id: number;
  name: string;
  duration: number;
  price: number;
  is_duo: boolean;
  category: string;
}

interface Provider {
  id: number;
  name: string;
  description: string;
  category: string;
  image_url: string;
  phone: string;
  address: string;
  city: string;
  rating: number;
  review_count: number;
  mobile_service: boolean;
  is_verified: boolean;
  services: WellnessService[];
}

const CATEGORIES: { value: string; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { value: "", label: "Tous", icon: "sparkles-outline" },
  { value: "spa", label: "Spa & Hammam", icon: "water-outline" },
  { value: "massage_salon", label: "Massage salon", icon: "home-outline" },
  { value: "massage_home", label: "À domicile", icon: "location-outline" },
  { value: "aesthetics", label: "Esthétique", icon: "star-outline" },
  { value: "yoga", label: "Yoga", icon: "people-outline" },
  { value: "coaching", label: "Coaching", icon: "ribbon-outline" },
];

export default function BienEtreScreen() {
  const { colors } = useTheme();
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [category, setCategory] = useState("");
  const [city, setCity] = useState("");
  const [mobileOnly, setMobileOnly] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await getWellnessProviders({ category: category || undefined, city: city || undefined, mobile: mobileOnly || undefined });
      setProviders(res as unknown as Provider[]);
    } catch { setProviders([]); }
  }, [category, city, mobileOnly]);

  useEffect(() => {
    setLoading(true);
    load().finally(() => setLoading(false));
  }, [load]);

  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const minPrice = (services?: WellnessService[]) => {
    if (!services || services.length === 0) return null;
    return Math.min(...services.map((s) => s.price));
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Ionicons name="sparkles" size={18} color="#10b981" />
          <Text style={[styles.headerTitle, { color: colors.text }]}>Bien-être</Text>
        </View>
        <TouchableOpacity onPress={() => router.push("/bookings")} style={styles.rdvBtn}>
          <Ionicons name="calendar-outline" size={20} color={colors.textMuted} />
        </TouchableOpacity>
      </View>

      <View style={[styles.searchRow, { backgroundColor: colors.cardSecondary, borderColor: colors.border }]}>
        <Ionicons name="search" size={16} color={colors.textMuted} style={styles.searchIcon} />
        <TextInput
          style={[styles.searchInput, { color: colors.inputText }]}
          placeholder="Rechercher par ville…"
          placeholderTextColor={colors.placeholder}
          value={city}
          onChangeText={setCity}
        />
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
        {CATEGORIES.map((cat) => {
          const active = category === cat.value;
          return (
            <TouchableOpacity
              key={cat.value || "all"}
              style={[
                styles.chip,
                { backgroundColor: colors.cardSecondary, borderColor: colors.border },
                active && { backgroundColor: "rgba(16,185,129,0.15)", borderColor: "rgba(16,185,129,0.4)" },
              ]}
              onPress={() => setCategory(cat.value)}
            >
              <Ionicons name={cat.icon} size={14} color={active ? "#10b981" : colors.textMuted} />
              <Text style={[styles.chipText, { color: colors.textMuted }, active && { color: "#10b981" }]}>{cat.label}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <TouchableOpacity style={styles.mobileToggle} onPress={() => setMobileOnly(!mobileOnly)}>
        <Ionicons name={mobileOnly ? "checkbox" : "square-outline"} size={18} color={mobileOnly ? "#10b981" : colors.textMuted} />
        <Ionicons name="location-outline" size={14} color={colors.textMuted} />
        <Text style={[styles.mobileToggleText, { color: colors.textMuted }]}>À domicile uniquement</Text>
      </TouchableOpacity>

      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#10b981" />}
      >
        {loading ? (
          <View style={styles.center}><ActivityIndicator color="#10b981" size="large" /></View>
        ) : providers.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="sparkles-outline" size={48} color={colors.border} />
            <Text style={{ color: colors.text, fontSize: 16, fontWeight: "700", marginTop: 8 }}>Aucun prestataire</Text>
            <Text style={{ color: colors.textMuted, fontSize: 13, textAlign: "center" }}>Les prestataires bien-être seront bientôt disponibles.</Text>
          </View>
        ) : (
          providers.map((provider) => {
            const min = minPrice(provider.services);
            return (
              <TouchableOpacity
                key={provider.id}
                style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
                onPress={() => router.push({ pathname: "/wellness/[id]", params: { id: String(provider.id) } })}
                activeOpacity={0.85}
              >
                <View style={[styles.imageWrap, { backgroundColor: colors.cardSecondary }]}>
                  {provider.image_url ? (
                    <Image source={{ uri: provider.image_url }} style={styles.image} resizeMode="cover" />
                  ) : (
                    <View style={styles.imagePlaceholder}>
                      <Ionicons name="sparkles-outline" size={42} color={colors.border} />
                    </View>
                  )}
                  {provider.is_verified ? (
                    <View style={[styles.imgBadge, { right: 10, backgroundColor: "rgba(16,185,129,0.95)" }]}>
                      <Ionicons name="checkmark-circle" size={11} color="#fff" />
                      <Text style={styles.imgBadgeText}>Vérifié</Text>
                    </View>
                  ) : null}
                  {provider.mobile_service ? (
                    <View style={[styles.imgBadge, { left: 10, backgroundColor: "rgba(124,58,237,0.95)" }]}>
                      <Ionicons name="location" size={11} color="#fff" />
                      <Text style={styles.imgBadgeText}>À domicile</Text>
                    </View>
                  ) : null}
                </View>

                <View style={styles.cardBody}>
                  <View style={styles.titleRow}>
                    <Text style={[styles.providerName, { color: colors.text }]} numberOfLines={1}>{provider.name}</Text>
                    {provider.rating > 0 ? (
                      <View style={styles.ratingRow}>
                        <Ionicons name="star" size={12} color="#facc15" />
                        <Text style={styles.ratingText}>{provider.rating.toFixed(1)}</Text>
                        <Text style={{ color: colors.textMuted, fontSize: 11 }}>({provider.review_count})</Text>
                      </View>
                    ) : null}
                  </View>

                  <Text style={{ color: colors.textMuted, fontSize: 11, marginBottom: 6 }}>
                    {CATEGORIES.find((c) => c.value === provider.category)?.label || provider.category}
                  </Text>

                  <Text style={{ color: colors.textSecondary, fontSize: 12, lineHeight: 18 }} numberOfLines={2}>{provider.description}</Text>

                  {provider.city ? (
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 8 }}>
                      <Ionicons name="location" size={11} color={colors.textMuted} />
                      <Text style={{ color: colors.textMuted, fontSize: 11 }}>{provider.city}</Text>
                    </View>
                  ) : null}

                  <View style={[styles.cardFooter, { borderTopColor: colors.border }]}>
                    <Text style={{ color: colors.textMuted, fontSize: 11 }}>
                      {provider.services?.length || 0} service{(provider.services?.length || 0) > 1 ? "s" : ""}
                    </Text>
                    {min !== null ? (
                      <Text style={{ color: "#10b981", fontSize: 13, fontWeight: "700" }}>À partir de {Math.round(min)} FCFA</Text>
                    ) : null}
                  </View>
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: 56,
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backBtn: { padding: 6 },
  rdvBtn: { padding: 6 },
  headerCenter: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6 },
  headerTitle: { fontWeight: "700", fontSize: 16 },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 12,
    paddingHorizontal: 12,
    borderWidth: StyleSheet.hairlineWidth,
  },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, paddingVertical: 12, fontSize: 14 },
  chipsRow: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4, gap: 8 },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    marginRight: 8,
  },
  chipText: { fontSize: 12, fontWeight: "500" },
  mobileToggle: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 16, paddingVertical: 12 },
  mobileToggleText: { fontSize: 13 },
  scroll: { padding: 16, paddingBottom: 60 },
  center: { padding: 60, alignItems: "center" },
  empty: { alignItems: "center", paddingVertical: 60, gap: 8 },
  card: { borderRadius: 16, overflow: "hidden", marginBottom: 16, borderWidth: StyleSheet.hairlineWidth },
  imageWrap: { width: "100%", height: 180 },
  image: { width: "100%", height: "100%" },
  imagePlaceholder: { width: "100%", height: "100%", alignItems: "center", justifyContent: "center" },
  imgBadge: {
    position: "absolute",
    top: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 10,
  },
  imgBadgeText: { color: "#fff", fontSize: 10, fontWeight: "700" },
  cardBody: { padding: 14 },
  titleRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 4 },
  providerName: { fontWeight: "600", fontSize: 15, flex: 1 },
  ratingRow: { flexDirection: "row", alignItems: "center", gap: 3 },
  ratingText: { color: "#facc15", fontSize: 12, fontWeight: "600" },
  cardFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});
