import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { getPlaces } from "@/lib/api";
import { useTheme } from "@/lib/theme-context";
import PremiumGate from "@/app/components/PremiumGate";

type Place = {
  id: number;
  name: string;
  description?: string;
  category?: string;
  address?: string;
  city?: string;
  image_url?: string;
  rating?: number;
};

const CATEGORIES = [
  { value: "", label: "Tous", icon: "location-outline" as const },
  { value: "hotel", label: "Hôtels", icon: "bed-outline" as const },
  { value: "restaurant", label: "Restaurants", icon: "restaurant-outline" as const },
  { value: "loisirs", label: "Loisirs", icon: "game-controller-outline" as const },
  { value: "wellness", label: "Bien-être", icon: "sparkles-outline" as const },
];

function CarteScreenInner() {
  const { colors } = useTheme();
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState("");
  const [city, setCity] = useState("");
  const [places, setPlaces] = useState<Place[]>([]);

  useEffect(() => {
    setLoading(true);
    getPlaces({ category: category || undefined, city: city || undefined })
      .then((res) => setPlaces((Array.isArray(res) ? res : []) as Place[]))
      .catch(() => setPlaces([]))
      .finally(() => setLoading(false));
  }, [category, city]);

  const countLabel = useMemo(() => {
    if (loading) return "Chargement...";
    const n = places.length;
    return `${n} lieu${n > 1 ? "x" : ""} trouvé${n > 1 ? "s" : ""}`;
  }, [loading, places.length]);

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={styles.content}>
      <Text style={{ color: colors.text, fontSize: 22, fontWeight: "700" }}>Carte des lieux</Text>
      <Text style={{ color: colors.textMuted, marginTop: 4, marginBottom: 12, fontSize: 13 }}>
        Explorer les adresses partenaires et endroits populaires.
      </Text>

      <View style={[styles.searchRow, { backgroundColor: colors.cardSecondary, borderColor: colors.border }]}>
        <Ionicons name="search" size={16} color={colors.textMuted} />
        <TextInput
          style={[styles.searchInput, { color: colors.inputText }]}
          value={city}
          onChangeText={setCity}
          placeholder="Filtrer par ville..."
          placeholderTextColor={colors.placeholder}
        />
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
        {CATEGORIES.map((cat) => {
          const active = category === cat.value;
          return (
            <TouchableOpacity
              key={cat.value || "all"}
              style={[
                styles.filterChip,
                { backgroundColor: colors.cardSecondary, borderColor: colors.border },
                active && { borderColor: "rgba(236,72,153,0.45)", backgroundColor: "rgba(236,72,153,0.12)" },
              ]}
              onPress={() => setCategory(cat.value)}
            >
              <Ionicons name={cat.icon} size={14} color={active ? "#ec4899" : colors.textMuted} />
              <Text style={[styles.filterText, { color: colors.textMuted }, active && { color: "#ec4899" }]}>{cat.label}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <Text style={{ color: colors.textMuted, fontSize: 12, marginBottom: 10 }}>{countLabel}</Text>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#ec4899" />
        </View>
      ) : places.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="location-outline" size={44} color={colors.border} />
          <Text style={{ color: colors.text, fontSize: 16, fontWeight: "700" }}>Aucun lieu trouvé</Text>
          <Text style={{ color: colors.textMuted, fontSize: 13, textAlign: "center" }}>Essayez un autre filtre de ville ou catégorie.</Text>
        </View>
      ) : (
        places.map((place) => (
          <TouchableOpacity
            key={place.id}
            style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={() => router.push({ pathname: "/place/[id]", params: { id: String(place.id) } })}
          >
            <Image
              source={{ uri: place.image_url || "https://via.placeholder.com/400/cccccc/999?text=Lieu" }}
              style={[styles.image, { backgroundColor: colors.cardSecondary }]}
            />
            <View style={styles.cardBody}>
              <View style={styles.rowBetween}>
                <Text style={{ color: colors.text, fontSize: 15, fontWeight: "600", flex: 1 }} numberOfLines={1}>
                  {place.name}
                </Text>
                {place.rating ? (
                  <View style={styles.ratingRow}>
                    <Ionicons name="star" size={11} color="#facc15" />
                    <Text style={styles.ratingText}>{place.rating.toFixed(1)}</Text>
                  </View>
                ) : null}
              </View>
              <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: 2 }} numberOfLines={1}>
                {[place.city, place.category].filter(Boolean).join(" - ")}
              </Text>
              {place.address ? (
                <Text style={{ color: colors.textSecondary, fontSize: 12, marginTop: 6 }} numberOfLines={1}>
                  {place.address}
                </Text>
              ) : null}
            </View>
          </TouchableOpacity>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 44 },
  searchRow: {
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
  },
  searchInput: { flex: 1, fontSize: 14 },
  filters: { paddingTop: 12, paddingBottom: 8, gap: 8 },
  filterChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  filterText: { fontSize: 12, fontWeight: "500" },
  center: { paddingVertical: 60, alignItems: "center" },
  empty: { alignItems: "center", paddingVertical: 60, gap: 8 },
  card: { borderRadius: 14, borderWidth: StyleSheet.hairlineWidth, overflow: "hidden", marginBottom: 12 },
  image: { width: "100%", height: 150 },
  cardBody: { padding: 12 },
  rowBetween: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  ratingRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  ratingText: { color: "#facc15", fontSize: 12, fontWeight: "700" },
});

export default function CarteScreen() {
  return (
    <PremiumGate feature="Lieux" icon="map-outline" tone="#14b8a6">
      <CarteScreenInner />
    </PremiumGate>
  );
}
