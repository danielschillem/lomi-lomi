import { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Image,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useLocalSearchParams, Stack } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { getPlace, createPlaceReservation } from "@/lib/api";

export default function PlaceDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [place, setPlace] = useState<Record<string, any> | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [showBook, setShowBook] = useState(false);
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [guests, setGuests] = useState("2");
  const [notes, setNotes] = useState("");
  const [booking, setBooking] = useState(false);

  const placeId = parseInt(id || "0", 10);
  const isValidPlaceId = Number.isFinite(placeId) && placeId > 0;

  const loadPlace = async () => {
    setLoadError(null);
    if (!isValidPlaceId) {
      setPlace(null);
      setLoading(false);
      return;
    }
    try {
      const res = await getPlace(placeId);
      setPlace(res);
    } catch (e: unknown) {
      setLoadError((e as Error).message || "Impossible de charger ce lieu.");
    }
    setLoading(false);
  };

  useEffect(() => {
    void loadPlace();
  }, [isValidPlaceId, placeId]);

  const handleReserve = async () => {
    if (!date || !time) {
      Alert.alert("Erreur", "Choisissez une date et une heure");
      return;
    }
    setBooking(true);
    try {
      await createPlaceReservation({
        place_id: placeId,
        date,
        time,
        guests: parseInt(guests) || 2,
        notes: notes.trim() || undefined,
      });
      Alert.alert("Succès", "Réservation effectuée !");
      setShowBook(false);
    } catch (e: unknown) {
      Alert.alert("Erreur", (e as Error).message);
    }
    setBooking(false);
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#7c3aed" />
      </View>
    );
  }

  if (!isValidPlaceId) {
    return (
      <View style={styles.center}>
        <Text style={styles.emptyText}>Lieu introuvable</Text>
      </View>
    );
  }

  if (loadError && !place) {
    return (
      <View style={styles.center}>
        <Text style={styles.emptyText}>{loadError}</Text>
        <TouchableOpacity
          style={styles.retryLoadBtn}
          onPress={() => {
            setLoading(true);
            void loadPlace();
          }}
        >
          <Text style={styles.retryLoadText}>Réessayer</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!place) {
    return (
      <View style={styles.center}>
        <Text style={styles.emptyText}>Lieu introuvable</Text>
      </View>
    );
  }

  const p = place;

  return (
    <ScrollView style={styles.container}>
      <Stack.Screen options={{ title: (p.name as string) || "Lieu" }} />
      <Image
        source={{
          uri:
            (p.image_url as string) ||
            "https://via.placeholder.com/400/1a1a1a/666?text=Lieu",
        }}
        style={styles.heroImage}
      />
      <View style={styles.body}>
        <Text style={styles.name}>{p.name as string}</Text>
        {p.category && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{p.category as string}</Text>
          </View>
        )}
        {p.address && (
          <View style={styles.infoRow}>
            <Ionicons name="location" size={16} color="#7c3aed" />
            <Text style={styles.infoText}>{p.address as string}</Text>
          </View>
        )}
        <Text style={styles.desc}>{(p.description as string) || ""}</Text>

        <TouchableOpacity
          style={styles.reserveBtn}
          onPress={() => setShowBook(!showBook)}
        >
          <Ionicons name="calendar" size={20} color="#fff" />
          <Text style={styles.reserveText}>Réserver une table</Text>
        </TouchableOpacity>

        {showBook && (
          <View style={styles.bookForm}>
            <TextInput
              style={styles.input}
              value={date}
              onChangeText={setDate}
              placeholder="Date (YYYY-MM-DD)"
              placeholderTextColor="#666"
            />
            <TextInput
              style={styles.input}
              value={time}
              onChangeText={setTime}
              placeholder="Heure (HH:MM)"
              placeholderTextColor="#666"
            />
            <TextInput
              style={styles.input}
              value={guests}
              onChangeText={setGuests}
              placeholder="Nombre de personnes"
              placeholderTextColor="#666"
              keyboardType="numeric"
            />
            <TextInput
              style={styles.input}
              value={notes}
              onChangeText={setNotes}
              placeholder="Notes (optionnel)"
              placeholderTextColor="#666"
            />
            <TouchableOpacity
              style={[styles.confirmBtn, booking && { opacity: 0.5 }]}
              onPress={handleReserve}
              disabled={booking}
            >
              {booking ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.confirmText}>Confirmer</Text>
              )}
            </TouchableOpacity>
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
  emptyText: { color: "#666", fontSize: 15, textAlign: "center", paddingHorizontal: 24 },
  heroImage: { width: "100%", height: 250, backgroundColor: "#1a1a1a" },
  body: { padding: 20 },
  name: { color: "#fff", fontSize: 24, fontWeight: "bold" },
  badge: {
    backgroundColor: "#1a1a2a",
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 8,
    marginTop: 8,
  },
  badgeText: { color: "#7c3aed", fontSize: 12, fontWeight: "600" },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 8,
  },
  infoText: { color: "#999", fontSize: 14 },
  desc: { color: "#ccc", fontSize: 15, lineHeight: 22, marginTop: 12 },
  reserveBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#7c3aed",
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
    marginTop: 24,
  },
  reserveText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  bookForm: { marginTop: 16, gap: 8 },
  input: {
    backgroundColor: "#1a1a1a",
    color: "#fff",
    borderRadius: 10,
    padding: 14,
    fontSize: 15,
  },
  confirmBtn: {
    backgroundColor: "#22c55e",
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 4,
  },
  confirmText: { color: "#fff", fontSize: 15, fontWeight: "600" },
  retryLoadBtn: {
    marginTop: 12,
    backgroundColor: "#7c3aed",
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  retryLoadText: { color: "#fff", fontSize: 14, fontWeight: "600" },
});
