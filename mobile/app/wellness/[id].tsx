import { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  StyleSheet,
  ActivityIndicator,
  Alert,
  TextInput,
} from "react-native";
import { useLocalSearchParams, Stack } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import {
  getWellnessProvider,
  createWellnessBooking,
  createWellnessReview,
} from "@/lib/api";
import { isValid24hTime, isValidIsoDate } from "@/lib/validation";

interface Service {
  id: number;
  name: string;
  description: string;
  duration: number;
  price: number;
}

export default function WellnessDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [provider, setProvider] = useState<Record<string, any> | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [bookingService, setBookingService] = useState<Service | null>(null);
  const [bookDate, setBookDate] = useState("");
  const [bookTime, setBookTime] = useState("");
  const [bookNotes, setBookNotes] = useState("");
  const [booking, setBooking] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState("");

  const providerId = parseInt(id || "0", 10);
  const isValidProviderId = Number.isFinite(providerId) && providerId > 0;

  const loadProvider = async () => {
    setLoadError(null);
    if (!isValidProviderId) {
      setProvider(null);
      setLoading(false);
      return;
    }
    try {
      const res = await getWellnessProvider(providerId);
      setProvider((res as { provider?: Record<string, any> }).provider ?? res);
    } catch (e: unknown) {
      setProvider(null);
      setLoadError(
        (e as Error).message || "Impossible de charger ce prestataire.",
      );
    }
    setLoading(false);
  };

  useEffect(() => {
    void loadProvider();
  }, [isValidProviderId, providerId]);

  const handleBook = async () => {
    if (!bookingService || !bookDate || !bookTime) {
      Alert.alert("Erreur", "Choisissez une date et une heure");
      return;
    }
    if (!isValidIsoDate(bookDate)) {
      Alert.alert("Erreur", "Date invalide (format attendu: YYYY-MM-DD)");
      return;
    }
    if (!isValid24hTime(bookTime)) {
      Alert.alert("Erreur", "Heure invalide (format attendu: HH:MM)");
      return;
    }
    setBooking(true);
    try {
      await createWellnessBooking({
        service_id: bookingService.id,
        date: bookDate,
        start_time: bookTime,
        time: bookTime,
        persons: 1,
        notes: bookNotes,
      });
      Alert.alert("Succès", "Rendez-vous réservé !");
      setBookingService(null);
      setBookDate("");
      setBookTime("");
      setBookNotes("");
    } catch (e: unknown) {
      Alert.alert("Erreur", (e as Error).message);
    }
    setBooking(false);
  };

  const handleReview = async () => {
    if (!reviewComment.trim()) {
      Alert.alert("Erreur", "Ajoutez un commentaire");
      return;
    }
    try {
      await createWellnessReview({
        provider_id: providerId,
        rating: reviewRating,
        comment: reviewComment.trim(),
      });
      Alert.alert("Merci", "Avis envoyé !");
      setReviewComment("");
    } catch (e: unknown) {
      Alert.alert("Erreur", (e as Error).message);
    }
  };

  const formatPrice = (price: number) =>
    price.toLocaleString("fr-FR") + " FCFA";

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#7c3aed" />
      </View>
    );
  }

  if (!isValidProviderId) {
    return (
      <View style={styles.center}>
        <Text style={{ color: "#666" }}>Prestataire introuvable</Text>
      </View>
    );
  }

  if (loadError && !provider) {
    return (
      <View style={styles.center}>
        <Text style={styles.emptyText}>{loadError}</Text>
        <TouchableOpacity
          style={styles.retryBtn}
          onPress={() => {
            setLoading(true);
            void loadProvider();
          }}
        >
          <Text style={styles.retryText}>Réessayer</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!provider) {
    return (
      <View style={styles.center}>
        <Text style={styles.emptyText}>Prestataire introuvable</Text>
      </View>
    );
  }

  const p = provider;
  const services = (p.services as Service[]) || [];

  return (
    <ScrollView style={styles.container}>
      <Stack.Screen options={{ title: (p.name as string) || "Bien-être" }} />

      <Image
        source={{
          uri:
            (p.image_url as string) ||
            "https://via.placeholder.com/400/1a1a1a/666?text=Spa",
        }}
        style={styles.heroImage}
      />

      <View style={styles.body}>
        <Text style={styles.name}>{p.name as string}</Text>
        {p.rating && (
          <View style={styles.ratingRow}>
            {[1, 2, 3, 4, 5].map((star) => (
              <Ionicons
                key={star}
                name={star <= (p.rating as number) ? "star" : "star-outline"}
                size={18}
                color="#f59e0b"
              />
            ))}
            <Text style={styles.ratingText}>{p.rating as number}/5</Text>
          </View>
        )}
        {p.address && (
          <View style={styles.infoRow}>
            <Ionicons name="location" size={16} color="#7c3aed" />
            <Text style={styles.infoText}>{p.address as string}</Text>
          </View>
        )}
        <Text style={styles.desc}>{(p.description as string) || ""}</Text>

        {/* Services */}
        {services.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Services</Text>
            {services.map((svc) => (
              <View key={svc.id} style={styles.serviceCard}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.serviceName}>{svc.name}</Text>
                  <Text style={styles.serviceMeta}>
                    {svc.duration} min · {formatPrice(svc.price)}
                  </Text>
                  {svc.description && (
                    <Text style={styles.serviceDesc}>{svc.description}</Text>
                  )}
                </View>
                <TouchableOpacity
                  style={styles.bookBtn}
                  onPress={() => setBookingService(svc)}
                >
                  <Text style={styles.bookBtnText}>Réserver</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        {/* Booking form */}
        {bookingService && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              Réserver : {bookingService.name}
            </Text>
            <TextInput
              style={styles.input}
              value={bookDate}
              onChangeText={setBookDate}
              placeholder="Date (YYYY-MM-DD)"
              placeholderTextColor="#666"
            />
            <TextInput
              style={styles.input}
              value={bookTime}
              onChangeText={setBookTime}
              placeholder="Heure (HH:MM)"
              placeholderTextColor="#666"
            />
            <TextInput
              style={styles.input}
              value={bookNotes}
              onChangeText={setBookNotes}
              placeholder="Notes (optionnel)"
              placeholderTextColor="#666"
            />
            <TouchableOpacity
              style={[styles.confirmBtn, booking && { opacity: 0.5 }]}
              onPress={handleBook}
              disabled={booking}
            >
              {booking ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.confirmText}>Confirmer la réservation</Text>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* Review */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Laisser un avis</Text>
          <View style={styles.ratingRow}>
            {[1, 2, 3, 4, 5].map((star) => (
              <TouchableOpacity
                key={star}
                onPress={() => setReviewRating(star)}
              >
                <Ionicons
                  name={star <= reviewRating ? "star" : "star-outline"}
                  size={28}
                  color="#f59e0b"
                />
              </TouchableOpacity>
            ))}
          </View>
          <TextInput
            style={[styles.input, { marginTop: 8 }]}
            value={reviewComment}
            onChangeText={setReviewComment}
            placeholder="Votre commentaire..."
            placeholderTextColor="#666"
            multiline
          />
          <TouchableOpacity style={styles.confirmBtn} onPress={handleReview}>
            <Text style={styles.confirmText}>Envoyer l'avis</Text>
          </TouchableOpacity>
        </View>
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
  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 8,
  },
  ratingText: { color: "#999", fontSize: 14, marginLeft: 4 },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 8,
  },
  infoText: { color: "#999", fontSize: 14 },
  desc: { color: "#ccc", fontSize: 15, lineHeight: 22, marginTop: 12 },
  section: { marginTop: 24 },
  sectionTitle: {
    color: "#999",
    fontSize: 13,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 12,
  },
  serviceCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#111",
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
  },
  serviceName: { color: "#fff", fontSize: 15, fontWeight: "600" },
  serviceMeta: { color: "#7c3aed", fontSize: 13, marginTop: 2 },
  serviceDesc: { color: "#999", fontSize: 13, marginTop: 4 },
  bookBtn: {
    backgroundColor: "#7c3aed",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  bookBtnText: { color: "#fff", fontSize: 13, fontWeight: "600" },
  input: {
    backgroundColor: "#1a1a1a",
    color: "#fff",
    borderRadius: 10,
    padding: 14,
    fontSize: 15,
    marginBottom: 8,
  },
  confirmBtn: {
    backgroundColor: "#7c3aed",
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 4,
  },
  confirmText: { color: "#fff", fontSize: 15, fontWeight: "600" },
  retryBtn: {
    marginTop: 12,
    backgroundColor: "#7c3aed",
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  retryText: { color: "#fff", fontSize: 14, fontWeight: "600" },
});
