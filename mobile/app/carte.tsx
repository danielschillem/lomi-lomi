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

export default function CarteScreen() {
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState("");
  const [city, setCity] = useState("");
  const [places, setPlaces] = useState<Place[]>([]);

  useEffect(() => {
    setLoading(true);
    getPlaces({
      category: category || undefined,
      city: city || undefined,
    })
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
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Carte des lieux</Text>
      <Text style={styles.subtitle}>Explorer les adresses partenaires et endroits populaires.</Text>

      <View style={styles.searchRow}>
        <Ionicons name="search" size={16} color="#9ca3af" />
        <TextInput
          style={styles.searchInput}
          value={city}
          onChangeText={setCity}
          placeholder="Filtrer par ville..."
          placeholderTextColor="#666"
        />
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
        {CATEGORIES.map((cat) => {
          const active = category === cat.value;
          return (
            <TouchableOpacity
              key={cat.value || "all"}
              style={[styles.filterChip, active && styles.filterChipActive]}
              onPress={() => setCategory(cat.value)}
            >
              <Ionicons name={cat.icon} size={14} color={active ? "#ec4899" : "#9ca3af"} />
              <Text style={[styles.filterText, active && styles.filterTextActive]}>{cat.label}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <Text style={styles.count}>{countLabel}</Text>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#ec4899" />
        </View>
      ) : places.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="location-outline" size={44} color="#444" />
          <Text style={styles.emptyTitle}>Aucun lieu trouvé</Text>
          <Text style={styles.emptyText}>Essayez un autre filtre de ville ou catégorie.</Text>
        </View>
      ) : (
        places.map((place) => (
          <TouchableOpacity
            key={place.id}
            style={styles.card}
            onPress={() =>
              router.push({
                pathname: "/place/[id]",
                params: { id: String(place.id) },
              })
            }
          >
            <Image
              source={{
                uri: place.image_url || "https://via.placeholder.com/400/1a1a1a/666?text=Lieu",
              }}
              style={styles.image}
            />
            <View style={styles.cardBody}>
              <View style={styles.rowBetween}>
                <Text style={styles.name} numberOfLines={1}>
                  {place.name}
                </Text>
                {place.rating ? (
                  <View style={styles.rating}>
                    <Ionicons name="star" size={11} color="#facc15" />
                    <Text style={styles.ratingText}>{place.rating.toFixed(1)}</Text>
                  </View>
                ) : null}
              </View>
              <Text style={styles.meta} numberOfLines={1}>
                {[place.city, place.category].filter(Boolean).join(" - ")}
              </Text>
              {place.address ? (
                <Text style={styles.address} numberOfLines={1}>
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
  container: { flex: 1, backgroundColor: "#0a0a0a" },
  content: { padding: 16, paddingBottom: 44 },
  title: { color: "#fff", fontSize: 22, fontWeight: "700" },
  subtitle: { color: "#9ca3af", marginTop: 4, marginBottom: 12, fontSize: 13 },
  searchRow: {
    backgroundColor: "#16161a",
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#222",
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  searchInput: { color: "#fff", flex: 1, fontSize: 14 },
  filters: { paddingTop: 12, paddingBottom: 8, gap: 8 },
  filterChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#16161a",
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#222",
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  filterChipActive: {
    borderColor: "rgba(236,72,153,0.45)",
    backgroundColor: "rgba(236,72,153,0.12)",
  },
  filterText: { color: "#9ca3af", fontSize: 12, fontWeight: "500" },
  filterTextActive: { color: "#ec4899" },
  count: { color: "#9ca3af", fontSize: 12, marginBottom: 10 },
  center: { paddingVertical: 60, alignItems: "center" },
  empty: { alignItems: "center", paddingVertical: 60, gap: 8 },
  emptyTitle: { color: "#e5e7eb", fontSize: 16, fontWeight: "700" },
  emptyText: { color: "#6b7280", fontSize: 13, textAlign: "center" },
  card: {
    backgroundColor: "#16161a",
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#222",
    overflow: "hidden",
    marginBottom: 12,
  },
  image: { width: "100%", height: 150, backgroundColor: "#1a1a1a" },
  cardBody: { padding: 12 },
  rowBetween: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  name: { color: "#fff", fontSize: 15, fontWeight: "600", flex: 1 },
  rating: { flexDirection: "row", alignItems: "center", gap: 4 },
  ratingText: { color: "#facc15", fontSize: 12, fontWeight: "700" },
  meta: { color: "#9ca3af", fontSize: 12, marginTop: 2 },
  address: { color: "#cbd5e1", fontSize: 12, marginTop: 6 },
});
