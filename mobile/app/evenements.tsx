import { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  RefreshControl,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { getEvents, attendEvent } from "@/lib/api";

interface EventItem {
  id: number;
  title: string;
  description: string;
  image_url?: string;
  city: string;
  address: string;
  starts_at: string;
  ends_at: string;
  price: number;
  category: string;
  max_attendees: number;
  attendees_count: number;
}

const CATEGORIES = [
  { id: "", label: "Tous" },
  { id: "soiree", label: "Soirées" },
  { id: "rencontre", label: "Rencontres" },
  { id: "atelier", label: "Ateliers" },
  { id: "sport", label: "Sport" },
];

const CITIES = ["", "Ouagadougou", "Bobo-Dioulasso"];

function formatDate(d: string) {
  if (!d) return "";
  try {
    return new Date(d).toLocaleString("fr-BF", {
      weekday: "short",
      day: "numeric",
      month: "long",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return d;
  }
}

export default function EvenementsScreen() {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [category, setCategory] = useState("");
  const [city, setCity] = useState("");
  const [attending, setAttending] = useState<Record<number, string>>({});

  const load = useCallback(async () => {
    try {
      const data = await getEvents({
        category: category || undefined,
        city: city || undefined,
      });
      setEvents(data as unknown as EventItem[]);
    } catch {
      setEvents([]);
    }
  }, [category, city]);

  useEffect(() => {
    setLoading(true);
    load().finally(() => setLoading(false));
  }, [load]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const handleAttend = async (
    id: number,
    status: "going" | "interested",
  ) => {
    const next = attending[id] === status ? "cancelled" : status;
    try {
      await attendEvent(id, next);
      setAttending((prev) => ({ ...prev, [id]: next }));
      if (next !== "cancelled") {
        setEvents((prev) =>
          prev.map((e) =>
            e.id === id
              ? { ...e, attendees_count: e.attendees_count + 1 }
              : e,
          ),
        );
      }
    } catch {
      // ignore
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#e5e7eb" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Événements</Text>
          <Text style={styles.headerSubtitle}>
            Rencontrez du monde lors de soirées
          </Text>
        </View>
        <View style={{ width: 32 }} />
      </View>

      {/* Category filter */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipsRow}
      >
        {CATEGORIES.map((c) => {
          const active = category === c.id;
          return (
            <TouchableOpacity
              key={c.id || "all"}
              onPress={() => setCategory(c.id)}
              style={[styles.chip, active && styles.chipActive]}
            >
              <Text
                style={[styles.chipText, active && styles.chipTextActive]}
              >
                {c.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* City filter */}
      <View style={styles.cityRow}>
        {CITIES.map((c) => {
          const active = city === c;
          return (
            <TouchableOpacity
              key={c || "all-cities"}
              onPress={() => setCity(c)}
              style={[styles.cityChip, active && styles.cityChipActive]}
            >
              <Text
                style={[
                  styles.cityChipText,
                  active && styles.cityChipTextActive,
                ]}
              >
                {c || "Toutes les villes"}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#a78bfa"
          />
        }
      >
        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator color="#a78bfa" size="large" />
          </View>
        ) : null}

        {!loading && events.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="calendar-outline" size={48} color="#3a3a3a" />
            <Text style={styles.emptyText}>Aucun événement pour le moment</Text>
          </View>
        ) : null}

        {!loading
          ? events.map((event) => {
              const userStatus = attending[event.id];
              return (
                <View key={event.id} style={styles.card}>
                  {event.image_url ? (
                    <Image
                      source={{ uri: event.image_url }}
                      style={styles.image}
                      resizeMode="cover"
                    />
                  ) : null}
                  <View style={styles.cardBody}>
                    <View style={styles.titleRow}>
                      <Text style={styles.title} numberOfLines={2}>
                        {event.title}
                      </Text>
                      <View style={styles.tag}>
                        <Text style={styles.tagText}>{event.category}</Text>
                      </View>
                    </View>

                    <Text style={styles.description} numberOfLines={2}>
                      {event.description}
                    </Text>

                    <View style={styles.metaRow}>
                      <Ionicons
                        name="calendar"
                        size={13}
                        color="#9ca3af"
                      />
                      <Text style={styles.metaText}>
                        {formatDate(event.starts_at)}
                      </Text>
                    </View>
                    <View style={styles.metaRow}>
                      <Ionicons name="location" size={13} color="#9ca3af" />
                      <Text style={styles.metaText}>
                        {event.address}, {event.city}
                      </Text>
                    </View>
                    <View style={styles.metaRow}>
                      <Ionicons name="people" size={13} color="#9ca3af" />
                      <Text style={styles.metaText}>
                        {event.attendees_count}
                        {event.max_attendees > 0
                          ? ` / ${event.max_attendees}`
                          : ""}{" "}
                        participant{event.attendees_count > 1 ? "s" : ""}
                      </Text>
                    </View>
                    {event.price > 0 ? (
                      <View style={styles.metaRow}>
                        <Ionicons
                          name="pricetag"
                          size={13}
                          color="#9ca3af"
                        />
                        <Text style={styles.metaText}>
                          {event.price.toLocaleString("fr-BF")} FCFA
                        </Text>
                      </View>
                    ) : null}

                    <View style={styles.actions}>
                      <TouchableOpacity
                        style={[
                          styles.btn,
                          userStatus === "going"
                            ? styles.btnPrimaryActive
                            : styles.btnPrimary,
                        ]}
                        onPress={() => handleAttend(event.id, "going")}
                      >
                        <Text
                          style={[
                            styles.btnText,
                            userStatus === "going" && styles.btnTextActive,
                          ]}
                        >
                          {userStatus === "going" ? "✓ J'y vais" : "J'y vais"}
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[
                          styles.btn,
                          userStatus === "interested"
                            ? styles.btnSecondaryActive
                            : styles.btnSecondary,
                        ]}
                        onPress={() => handleAttend(event.id, "interested")}
                      >
                        <Text
                          style={[
                            styles.btnText,
                            userStatus === "interested" &&
                              styles.btnTextActive,
                          ]}
                        >
                          Intéressé(e)
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              );
            })
          : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0a0a0a" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: 56,
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#222",
  },
  backBtn: { padding: 6 },
  headerTitle: { color: "#fff", fontWeight: "700", fontSize: 18 },
  headerSubtitle: { color: "#9ca3af", fontSize: 12, marginTop: 2 },
  chipsRow: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 16,
    backgroundColor: "#16161a",
    marginRight: 8,
  },
  chipActive: { backgroundColor: "#7c3aed" },
  chipText: { color: "#9ca3af", fontSize: 13 },
  chipTextActive: { color: "#fff", fontWeight: "600" },
  cityRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 16,
    paddingBottom: 8,
    gap: 8,
  },
  cityChip: {
    paddingHorizontal: 11,
    paddingVertical: 5,
    borderRadius: 12,
    backgroundColor: "#16161a",
  },
  cityChipActive: { backgroundColor: "#db2777" },
  cityChipText: { color: "#9ca3af", fontSize: 11 },
  cityChipTextActive: { color: "#fff", fontWeight: "600" },
  scroll: { padding: 16, paddingBottom: 60 },
  center: { padding: 60, alignItems: "center" },
  empty: { alignItems: "center", paddingVertical: 60, gap: 10 },
  emptyText: { color: "#6b7280", fontSize: 14 },
  card: {
    backgroundColor: "#16161a",
    borderRadius: 16,
    overflow: "hidden",
    marginBottom: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#222",
  },
  image: { width: "100%", height: 160, backgroundColor: "#1a1a1a" },
  cardBody: { padding: 14 },
  titleRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 8,
    marginBottom: 6,
  },
  title: { color: "#fff", fontWeight: "700", fontSize: 16, flex: 1 },
  tag: {
    backgroundColor: "rgba(124,58,237,0.2)",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  tagText: {
    color: "#c4b5fd",
    fontSize: 10,
    fontWeight: "600",
    textTransform: "uppercase",
  },
  description: { color: "#9ca3af", fontSize: 13, marginBottom: 10 },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 2,
  },
  metaText: { color: "#9ca3af", fontSize: 12 },
  actions: { flexDirection: "row", gap: 8, marginTop: 14 },
  btn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: "center",
  },
  btnPrimary: { backgroundColor: "rgba(124,58,237,0.2)" },
  btnPrimaryActive: { backgroundColor: "#7c3aed" },
  btnSecondary: { backgroundColor: "#1f1f23" },
  btnSecondaryActive: { backgroundColor: "#374151" },
  btnText: { color: "#c4b5fd", fontSize: 13, fontWeight: "600" },
  btnTextActive: { color: "#fff" },
});
