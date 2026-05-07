import { useMemo, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Image,
  ActivityIndicator,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { getOrCreateConversation, searchProfiles } from "@/lib/api";
import { useTheme } from "@/lib/theme-context";
import ScreenState from "@/app/components/ScreenState";

type SearchProfile = {
  id: number;
  username: string;
  avatar_url?: string;
  city?: string;
  bio?: string;
  is_online?: boolean;
  birth_date?: string;
  distance?: number;
};

export default function SearchProfilesScreen() {
  const { colors } = useTheme();
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<SearchProfile[]>([]);
  const [searched, setSearched] = useState(false);
  const [cityFilter, setCityFilter] = useState("");
  const [onlineOnly, setOnlineOnly] = useState(false);
  const [minAge, setMinAge] = useState("");
  const [maxAge, setMaxAge] = useState("");
  const [maxDistance, setMaxDistance] = useState("");

  const filteredResults = useMemo(() => {
    const min = Number(minAge || 0);
    const max = Number(maxAge || 0);
    const maxDist = Number(maxDistance || 0);
    const city = cityFilter.trim().toLowerCase();

    const ageFromBirthDate = (birthDate?: string) => {
      if (!birthDate) return 0;
      const d = new Date(birthDate);
      if (Number.isNaN(d.getTime())) return 0;
      const now = new Date();
      let age = now.getFullYear() - d.getFullYear();
      const m = now.getMonth() - d.getMonth();
      if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age--;
      return age;
    };

    return results.filter((p) => {
      if (city && !(p.city || "").toLowerCase().includes(city)) return false;
      if (onlineOnly && !p.is_online) return false;
      const age = ageFromBirthDate(p.birth_date);
      if (min > 0 && age > 0 && age < min) return false;
      if (max > 0 && age > 0 && age > max) return false;
      if (maxDist > 0 && typeof p.distance === "number" && p.distance > maxDist) return false;
      return true;
    });
  }, [results, cityFilter, onlineOnly, minAge, maxAge, maxDistance]);

  const runSearch = async () => {
    const q = query.trim();
    if (q.length < 2) {
      Alert.alert("Recherche", "Saisis au moins 2 caractères.");
      return;
    }
    setLoading(true);
    try {
      const res = await searchProfiles(q);
      const rows = Array.isArray(res) ? (res as unknown as SearchProfile[]) : [];
      setResults(rows);
      setSearched(true);
    } catch {
      setResults([]);
      setSearched(true);
      Alert.alert("Recherche", "Impossible de charger les profils.");
    }
    setLoading(false);
  };

  const openChat = async (profile: SearchProfile) => {
    try {
      const conv = await getOrCreateConversation(profile.id);
      const c = conv as { id: number };
      router.push({
        pathname: "/chat/[id]",
        params: { id: c.id, name: profile.username, recipientId: profile.id },
      });
    } catch {
      Alert.alert("Chat", "Impossible d'ouvrir la conversation.");
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ paddingHorizontal: 14, paddingTop: 12, paddingBottom: 8 }}>
        <TouchableOpacity
          style={[styles.quickBtn, { backgroundColor: colors.accent }]}
          onPress={() => router.push("/(tabs)/matches")}
        >
          <Ionicons name="people" size={16} color="#fff" />
          <Text style={styles.quickBtnText}>Voir mes matchs</Text>
        </TouchableOpacity>
      </View>

      <View style={[styles.searchRow, { backgroundColor: colors.inputBg, borderColor: colors.border }]}>
        <Ionicons name="search" size={18} color={colors.textMuted} />
        <TextInput
          style={[styles.searchInput, { color: colors.inputText }]}
          placeholder="Rechercher un profil (nom, ville...)"
          placeholderTextColor={colors.placeholder}
          value={query}
          onChangeText={setQuery}
          returnKeyType="search"
          onSubmitEditing={runSearch}
        />
        <TouchableOpacity style={[styles.searchBtn, { backgroundColor: colors.accent }]} onPress={runSearch}>
          {loading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.searchBtnText}>OK</Text>
          )}
        </TouchableOpacity>
      </View>

      <View style={[styles.filtersWrap, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.filtersTitle, { color: colors.text }]}>Filtres avancés</Text>
        <View style={styles.filtersRow}>
          <TextInput
            style={[styles.filterInput, { flex: 1.2, color: colors.inputText, backgroundColor: colors.inputBg, borderColor: colors.border }]}
            placeholder="Ville"
            placeholderTextColor={colors.placeholder}
            value={cityFilter}
            onChangeText={setCityFilter}
          />
          <TextInput
            style={[styles.filterInput, { color: colors.inputText, backgroundColor: colors.inputBg, borderColor: colors.border }]}
            placeholder="Âge min"
            placeholderTextColor={colors.placeholder}
            keyboardType="number-pad"
            value={minAge}
            onChangeText={setMinAge}
          />
          <TextInput
            style={[styles.filterInput, { color: colors.inputText, backgroundColor: colors.inputBg, borderColor: colors.border }]}
            placeholder="Âge max"
            placeholderTextColor={colors.placeholder}
            keyboardType="number-pad"
            value={maxAge}
            onChangeText={setMaxAge}
          />
        </View>
        <View style={styles.filtersRow}>
          <TextInput
            style={[styles.filterInput, { flex: 1.2, color: colors.inputText, backgroundColor: colors.inputBg, borderColor: colors.border }]}
            placeholder="Distance max (km)"
            placeholderTextColor={colors.placeholder}
            keyboardType="decimal-pad"
            value={maxDistance}
            onChangeText={setMaxDistance}
          />
          <TouchableOpacity
            style={[
              styles.toggleBtn,
              { borderColor: colors.border, backgroundColor: colors.inputBg },
              onlineOnly && { backgroundColor: colors.accent, borderColor: colors.accent },
            ]}
            onPress={() => setOnlineOnly((prev) => !prev)}
          >
            <Ionicons
              name={onlineOnly ? "radio-button-on" : "radio-button-off"}
              size={14}
              color={onlineOnly ? "#fff" : colors.textMuted}
            />
            <Text style={[styles.toggleText, { color: colors.textMuted }, onlineOnly && { color: "#fff" }]}>
              En ligne seulement
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {!searched && !loading && (
        <ScreenState mode="empty" title="Trouve des profils" subtitle="Lance une recherche pour discuter plus vite." />
      )}
      {searched && !loading && results.length === 0 && (
        <ScreenState mode="empty" title="Aucun profil trouvé" subtitle="Essaie avec un autre mot-clé." />
      )}
      {searched && !loading && results.length > 0 && filteredResults.length === 0 && (
        <ScreenState mode="empty" title="Aucun profil avec ces filtres" subtitle="Ajuste les filtres avancés pour voir des résultats." />
      )}

      <FlatList
        data={filteredResults}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={{ paddingHorizontal: 14, paddingBottom: 20 }}
        renderItem={({ item }) => (
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <TouchableOpacity
              style={styles.mainInfo}
              onPress={() => router.push({ pathname: "/user/[id]", params: { id: item.id } })}
            >
              <Image
                source={{ uri: item.avatar_url || "https://via.placeholder.com/64/1a1a1a/666?text=?" }}
                style={[styles.avatar, { backgroundColor: colors.cardSecondary }]}
              />
              <View style={{ flex: 1 }}>
                <Text style={[styles.name, { color: colors.text }]}>{item.username}</Text>
                {!!item.city && <Text style={[styles.meta, { color: colors.textSecondary }]}>{item.city}</Text>}
                {!!item.birth_date && (
                  <Text style={[styles.meta, { color: colors.textSecondary }]}>
                    Âge: {new Date().getFullYear() - new Date(item.birth_date).getFullYear()} ans
                  </Text>
                )}
                {typeof item.distance === "number" && item.distance >= 0 && (
                  <Text style={[styles.meta, { color: colors.textSecondary }]}>
                    Distance: {item.distance.toFixed(1)} km
                  </Text>
                )}
                {!!item.bio && (
                  <Text style={[styles.bio, { color: colors.textSecondary }]} numberOfLines={2}>
                    {item.bio}
                  </Text>
                )}
              </View>
            </TouchableOpacity>
            <View style={styles.actionsRow}>
              <TouchableOpacity
                style={[styles.ghostBtn, { backgroundColor: colors.cardSecondary, borderColor: colors.border }]}
                onPress={() => router.push({ pathname: "/user/[id]", params: { id: item.id } })}
              >
                <Text style={[styles.ghostBtnText, { color: colors.text }]}>Profil</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.primaryBtn, { backgroundColor: colors.accent }]}
                onPress={() => openChat(item)}
              >
                <Ionicons name="chatbubble" size={14} color="#fff" />
                <Text style={styles.primaryBtnText}>Message</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  quickBtn: {
    borderRadius: 10,
    height: 40,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  quickBtnText: { color: "#fff", fontWeight: "700", fontSize: 13 },
  searchRow: {
    marginHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 10,
  },
  searchInput: { flex: 1, fontSize: 14, paddingVertical: 11 },
  searchBtn: {
    borderRadius: 8,
    minWidth: 40,
    height: 32,
    justifyContent: "center",
    alignItems: "center",
  },
  searchBtnText: { color: "#fff", fontWeight: "700", fontSize: 12 },
  filtersWrap: {
    marginHorizontal: 14,
    marginBottom: 10,
    borderRadius: 12,
    borderWidth: 1,
    padding: 10,
    gap: 8,
  },
  filtersTitle: { fontSize: 12, fontWeight: "700" },
  filtersRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  filterInput: {
    flex: 1,
    fontSize: 13,
    paddingVertical: 9,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  toggleBtn: {
    flex: 1,
    height: 36,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 6,
  },
  toggleText: { fontSize: 12, fontWeight: "600" },
  card: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
    marginBottom: 10,
  },
  mainInfo: { flexDirection: "row", gap: 10, alignItems: "center" },
  avatar: { width: 60, height: 60, borderRadius: 30 },
  name: { fontWeight: "700", fontSize: 16 },
  meta: { marginTop: 2, fontSize: 13 },
  bio: { marginTop: 4, fontSize: 13, lineHeight: 18 },
  actionsRow: {
    marginTop: 10,
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 8,
  },
  ghostBtn: {
    borderWidth: 1,
    borderRadius: 8,
    height: 34,
    paddingHorizontal: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  ghostBtnText: { fontWeight: "600", fontSize: 12 },
  primaryBtn: {
    borderRadius: 8,
    height: 34,
    paddingHorizontal: 12,
    justifyContent: "center",
    alignItems: "center",
    flexDirection: "row",
    gap: 6,
  },
  primaryBtnText: { color: "#fff", fontWeight: "700", fontSize: 12 },
});
