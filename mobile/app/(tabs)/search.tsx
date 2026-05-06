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

      if (
        maxDist > 0 &&
        typeof p.distance === "number" &&
        p.distance > maxDist
      ) {
        return false;
      }

      return true;
    });
  }, [results, cityFilter, onlineOnly, minAge, maxAge, maxDistance]);

  const runSearch = async () => {
    const q = query.trim();
    if (q.length < 2) {
      Alert.alert("Recherche", "Saisis au moins 2 caracteres.");
      return;
    }

    setLoading(true);
    try {
      const res = await searchProfiles(q);
      const rows = Array.isArray(res)
        ? (res as unknown as SearchProfile[])
        : [];
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
        params: {
          id: c.id,
          name: profile.username,
          recipientId: profile.id,
        },
      });
    } catch {
      Alert.alert("Chat", "Impossible d'ouvrir la conversation.");
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerActions}>
        <TouchableOpacity
          style={styles.quickBtn}
          onPress={() => router.push("/(tabs)/matches")}
        >
          <Ionicons name="people" size={16} color="#fff" />
          <Text style={styles.quickBtnText}>Voir mes matchs</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.searchRow}>
        <Ionicons name="search" size={18} color="#9ca3af" />
        <TextInput
          style={styles.searchInput}
          placeholder="Rechercher un profil (nom, ville...)"
          placeholderTextColor="#666"
          value={query}
          onChangeText={setQuery}
          returnKeyType="search"
          onSubmitEditing={runSearch}
        />
        <TouchableOpacity style={styles.searchBtn} onPress={runSearch}>
          {loading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.searchBtnText}>OK</Text>
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.filtersWrap}>
        <Text style={styles.filtersTitle}>Filtres avances</Text>
        <View style={styles.filtersRow}>
          <TextInput
            style={[styles.filterInput, { flex: 1.2 }]}
            placeholder="Ville"
            placeholderTextColor="#666"
            value={cityFilter}
            onChangeText={setCityFilter}
          />
          <TextInput
            style={styles.filterInput}
            placeholder="Age min"
            placeholderTextColor="#666"
            keyboardType="number-pad"
            value={minAge}
            onChangeText={setMinAge}
          />
          <TextInput
            style={styles.filterInput}
            placeholder="Age max"
            placeholderTextColor="#666"
            keyboardType="number-pad"
            value={maxAge}
            onChangeText={setMaxAge}
          />
        </View>
        <View style={styles.filtersRow}>
          <TextInput
            style={[styles.filterInput, { flex: 1.2 }]}
            placeholder="Distance max (km)"
            placeholderTextColor="#666"
            keyboardType="decimal-pad"
            value={maxDistance}
            onChangeText={setMaxDistance}
          />
          <TouchableOpacity
            style={[styles.toggleBtn, onlineOnly && styles.toggleBtnActive]}
            onPress={() => setOnlineOnly((prev) => !prev)}
          >
            <Ionicons
              name={onlineOnly ? "radio-button-on" : "radio-button-off"}
              size={14}
              color={onlineOnly ? "#fff" : "#a3a3a3"}
            />
            <Text
              style={[styles.toggleText, onlineOnly && styles.toggleTextActive]}
            >
              En ligne seulement
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {!searched && !loading && (
        <ScreenState
          mode="empty"
          title="Trouve des profils"
          subtitle="Lance une recherche pour discuter plus vite."
        />
      )}

      {searched && !loading && results.length === 0 && (
        <ScreenState
          mode="empty"
          title="Aucun profil trouve"
          subtitle="Essaie avec un autre mot-cle."
        />
      )}

      {searched &&
        !loading &&
        results.length > 0 &&
        filteredResults.length === 0 && (
          <ScreenState
            mode="empty"
            title="Aucun profil avec ces filtres"
            subtitle="Ajuste les filtres avances pour voir des resultats."
          />
        )}

      <FlatList
        data={filteredResults}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <TouchableOpacity
              style={styles.mainInfo}
              onPress={() =>
                router.push({ pathname: "/user/[id]", params: { id: item.id } })
              }
            >
              <Image
                source={{
                  uri:
                    item.avatar_url ||
                    "https://via.placeholder.com/64/1a1a1a/666?text=?",
                }}
                style={styles.avatar}
              />
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>{item.username}</Text>
                {!!item.city && <Text style={styles.meta}>{item.city}</Text>}
                {!!item.birth_date && (
                  <Text style={styles.meta}>
                    Age:{" "}
                    {new Date().getFullYear() -
                      new Date(item.birth_date).getFullYear()}{" "}
                    ans
                  </Text>
                )}
                {typeof item.distance === "number" && item.distance >= 0 && (
                  <Text style={styles.meta}>
                    Distance: {item.distance.toFixed(1)} km
                  </Text>
                )}
                {!!item.bio && (
                  <Text style={styles.bio} numberOfLines={2}>
                    {item.bio}
                  </Text>
                )}
              </View>
            </TouchableOpacity>

            <View style={styles.actionsRow}>
              <TouchableOpacity
                style={styles.ghostBtn}
                onPress={() =>
                  router.push({
                    pathname: "/user/[id]",
                    params: { id: item.id },
                  })
                }
              >
                <Text style={styles.ghostBtnText}>Profil</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.primaryBtn}
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
  container: { flex: 1, backgroundColor: "#0a0a0a" },
  headerActions: {
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 8,
  },
  quickBtn: {
    backgroundColor: "#7c3aed",
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
    backgroundColor: "#1a1a1a",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#262626",
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 10,
  },
  searchInput: {
    flex: 1,
    color: "#fff",
    fontSize: 14,
    paddingVertical: 11,
  },
  searchBtn: {
    backgroundColor: "#7c3aed",
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
    borderColor: "#242424",
    backgroundColor: "#121212",
    padding: 10,
    gap: 8,
  },
  filtersTitle: { color: "#d4d4d8", fontSize: 12, fontWeight: "700" },
  filtersRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  filterInput: {
    flex: 1,
    color: "#fff",
    fontSize: 13,
    paddingVertical: 9,
    paddingHorizontal: 10,
    backgroundColor: "#1b1b1b",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#2a2a2a",
  },
  toggleBtn: {
    flex: 1,
    height: 36,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#303030",
    backgroundColor: "#1b1b1b",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 6,
  },
  toggleBtnActive: {
    backgroundColor: "#7c3aed",
    borderColor: "#7c3aed",
  },
  toggleText: { color: "#a3a3a3", fontSize: 12, fontWeight: "600" },
  toggleTextActive: { color: "#fff" },
  list: {
    paddingHorizontal: 14,
    paddingBottom: 20,
  },
  card: {
    backgroundColor: "#141414",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#242424",
    padding: 12,
    marginBottom: 10,
  },
  mainInfo: {
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#1f1f1f",
  },
  name: { color: "#fff", fontWeight: "700", fontSize: 16 },
  meta: { color: "#a3a3a3", marginTop: 2, fontSize: 13 },
  bio: { color: "#d4d4d8", marginTop: 4, fontSize: 13, lineHeight: 18 },
  actionsRow: {
    marginTop: 10,
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 8,
  },
  ghostBtn: {
    backgroundColor: "#1f1f1f",
    borderWidth: 1,
    borderColor: "#303030",
    borderRadius: 8,
    height: 34,
    paddingHorizontal: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  ghostBtnText: { color: "#c4c4c4", fontWeight: "600", fontSize: 12 },
  primaryBtn: {
    backgroundColor: "#7c3aed",
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
