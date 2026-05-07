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
import { useTheme } from "@/lib/theme-context";

interface Service {
  id: number;
  name: string;
  description: string;
  duration: number;
  price: number;
}

export default function WellnessDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useTheme();
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
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  if (!isValidProviderId) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.textMuted }}>Prestataire introuvable</Text>
      </View>
    );
  }

  if (loadError && !provider) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.textMuted, fontSize: 15, textAlign: "center", paddingHorizontal: 24 }}>{loadError}</Text>
        <TouchableOpacity
          style={[styles.retryBtn, { backgroundColor: colors.accent }]}
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
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.textMuted, fontSize: 15, textAlign: "center", paddingHorizontal: 24 }}>Prestataire introuvable</Text>
      </View>
    );
  }

  const p = provider;
  const services = (p.services as Service[]) || [];

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ title: (p.name as string) || "Bien-être" }} />

      <Image
        source={{
          uri:
            (p.image_url as string) ||
            "https://via.placeholder.com/400/1a1a1a/666?text=Spa",
        }}
        style={[styles.heroImage, { backgroundColor: colors.cardSecondary }]}
      />

      <View style={styles.body}>
        <Text style={[styles.name, { color: colors.text }]}>{p.name as string}</Text>
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
            <Text style={{ color: colors.textMuted, fontSize: 14, marginLeft: 4 }}>{p.rating as number}/5</Text>
          </View>
        )}
        {p.address && (
          <View style={styles.infoRow}>
            <Ionicons name="location" size={16} color={colors.accent} />
            <Text style={{ color: colors.textMuted, fontSize: 14 }}>{p.address as string}</Text>
          </View>
        )}
        <Text style={{ color: colors.textSecondary, fontSize: 15, lineHeight: 22, marginTop: 12 }}>{(p.description as string) || ""}</Text>

        {/* Services */}
        {services.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>Services</Text>
            {services.map((svc) => (
              <View key={svc.id} style={[styles.serviceCard, { backgroundColor: colors.card }]}>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: colors.text, fontSize: 15, fontWeight: "600" }}>{svc.name}</Text>
                  <Text style={{ color: colors.accent, fontSize: 13, marginTop: 2 }}>
                    {svc.duration} min · {formatPrice(svc.price)}
                  </Text>
                  {svc.description && (
                    <Text style={{ color: colors.textMuted, fontSize: 13, marginTop: 4 }}>{svc.description}</Text>
                  )}
                </View>
                <TouchableOpacity
                  style={[styles.bookBtn, { backgroundColor: colors.accent }]}
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
            <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>
              Réserver : {bookingService.name}
            </Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.inputBg, color: colors.inputText }]}
              value={bookDate}
              onChangeText={setBookDate}
              placeholder="Date (YYYY-MM-DD)"
              placeholderTextColor={colors.placeholder}
            />
            <TextInput
              style={[styles.input, { backgroundColor: colors.inputBg, color: colors.inputText }]}
              value={bookTime}
              onChangeText={setBookTime}
              placeholder="Heure (HH:MM)"
              placeholderTextColor={colors.placeholder}
            />
            <TextInput
              style={[styles.input, { backgroundColor: colors.inputBg, color: colors.inputText }]}
              value={bookNotes}
              onChangeText={setBookNotes}
              placeholder="Notes (optionnel)"
              placeholderTextColor={colors.placeholder}
            />
            <TouchableOpacity
              style={[styles.confirmBtn, { backgroundColor: colors.accent }, booking && { opacity: 0.5 }]}
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
          <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>Laisser un avis</Text>
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
            style={[styles.input, { backgroundColor: colors.inputBg, color: colors.inputText, marginTop: 8 }]}
            value={reviewComment}
            onChangeText={setReviewComment}
            placeholder="Votre commentaire..."
            placeholderTextColor={colors.placeholder}
            multiline
          />
          <TouchableOpacity style={[styles.confirmBtn, { backgroundColor: colors.accent }]} onPress={handleReview}>
            <Text style={styles.confirmText}>Envoyer l'avis</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  heroImage: { width: "100%", height: 250 },
  body: { padding: 20 },
  name: { fontSize: 24, fontWeight: "bold" },
  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 8,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 8,
  },
  section: { marginTop: 24 },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 12,
  },
  serviceCard: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
  },
  bookBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  bookBtnText: { color: "#fff", fontSize: 13, fontWeight: "600" },
  input: {
    borderRadius: 10,
    padding: 14,
    fontSize: 15,
    marginBottom: 8,
  },
  confirmBtn: {
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 4,
  },
  confirmText: { color: "#fff", fontSize: 15, fontWeight: "600" },
  retryBtn: {
    marginTop: 12,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  retryText: { color: "#fff", fontSize: 14, fontWeight: "600" },
});
