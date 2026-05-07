import { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  Alert,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import {
  getPremiumPlans,
  getMySubscription,
  subscribePremium,
  cancelSubscription,
  type PremiumPlan,
} from "@/lib/api";
import { useTheme } from "@/lib/theme-context";

interface Subscription {
  is_premium: boolean;
  plan?: string;
  ends_at?: string;
  status?: string;
}

export default function PremiumScreen() {
  const { colors } = useTheme();
  const [plans, setPlans] = useState<PremiumPlan[]>([]);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [selectedId, setSelectedId] = useState("monthly");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const refreshSubscription = useCallback(async () => {
    try {
      const sub = await getMySubscription();
      setSubscription(sub);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    getPremiumPlans()
      .then((res) => {
        setPlans(res.plans ?? []);
        if (res.plans?.length) setSelectedId(res.plans[0].id);
      })
      .catch(() => {});
    refreshSubscription();
  }, [refreshSubscription]);

  const selectedPlan = plans.find((p) => p.id === selectedId);

  const handleSubscribe = async () => {
    if (!phone.trim()) { setError("Entrez votre numéro Orange Money"); return; }
    if (!selectedPlan) return;
    setLoading(true);
    setError("");
    setMessage("");
    try {
      const res = await subscribePremium({ plan: selectedId, phone: phone.trim() });
      const endsAt = res.ends_at ? new Date(res.ends_at).toLocaleDateString("fr-BF") : "";
      setMessage(`Abonnement activé jusqu'au ${endsAt}`);
      setPhone("");
      await refreshSubscription();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Erreur de paiement");
    }
    setLoading(false);
  };

  const handleCancel = () => {
    Alert.alert("Annuler l'abonnement", "Voulez-vous vraiment annuler votre abonnement TextMe ?", [
      { text: "Non", style: "cancel" },
      {
        text: "Oui, annuler",
        style: "destructive",
        onPress: async () => {
          setLoading(true);
          try {
            await cancelSubscription();
            setMessage("Abonnement annulé.");
            await refreshSubscription();
          } catch (e: unknown) {
            setError(e instanceof Error ? e.message : "Erreur");
          }
          setLoading(false);
        },
      },
    ]);
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>TextMe</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.hero}>
          <View style={styles.crownBadge}>
            <Ionicons name="ribbon" size={36} color="#facc15" />
          </View>
          <Text style={styles.heroTitle}>TextMe Premium</Text>
          <Text style={styles.heroSubtitle}>
            Débloquez toutes les fonctionnalités et multipliez vos chances de rencontres
          </Text>
        </View>

        {subscription?.is_premium ? (
          <View style={styles.activeBanner}>
            <Ionicons name="checkmark-circle" size={22} color="#22c55e" />
            <View style={{ flex: 1 }}>
              <Text style={styles.activeTitle}>Abonnement actif</Text>
              <Text style={styles.activeSubtitle}>
                Plan {subscription.plan ?? "-"} · Expire le{" "}
                {subscription.ends_at ? new Date(subscription.ends_at).toLocaleDateString("fr-BF") : "-"}
              </Text>
            </View>
            <TouchableOpacity onPress={handleCancel} hitSlop={8}>
              <Ionicons name="close-circle" size={22} color={colors.textMuted} />
            </TouchableOpacity>
          </View>
        ) : null}

        <View style={styles.plansRow}>
          {plans.map((plan) => {
            const active = plan.id === selectedId;
            return (
              <TouchableOpacity
                key={plan.id}
                style={[styles.planCard, { backgroundColor: colors.cardSecondary, borderColor: colors.border }, active && { borderColor: colors.accent, backgroundColor: "rgba(37,99,235,0.08)" }]}
                onPress={() => setSelectedId(plan.id)}
              >
                {plan.id === "yearly" ? (
                  <View style={styles.discountBadge}>
                    <Text style={styles.discountText}>-38%</Text>
                  </View>
                ) : null}
                <Text style={{ color: colors.text, fontSize: 18, fontWeight: "700" }}>
                  {plan.price.toLocaleString("fr-BF")} FCFA
                </Text>
                <Text style={{ color: colors.textMuted, fontSize: 11, marginTop: 2 }}>
                  par {plan.id === "monthly" ? "mois" : "an"}
                </Text>
                <Text style={{ color: colors.accentLight, fontSize: 13, fontWeight: "600", marginTop: 4 }}>{plan.name}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {selectedPlan ? (
          <View style={[styles.featuresCard, { backgroundColor: colors.cardSecondary, borderColor: colors.border }]}>
            <View style={styles.featuresHeader}>
              <Ionicons name="star" size={16} color="#facc15" />
              <Text style={{ color: colors.text, fontSize: 15, fontWeight: "600" }}>Ce que vous obtenez</Text>
            </View>
            {selectedPlan.features.map((f, i) => (
              <View key={i} style={styles.featureRow}>
                <Ionicons name="checkmark" size={16} color="#22c55e" />
                <Text style={{ color: colors.textSecondary, fontSize: 13, flex: 1 }}>{f}</Text>
              </View>
            ))}
          </View>
        ) : null}

        {!subscription?.is_premium ? (
          <View style={[styles.paymentCard, { backgroundColor: colors.cardSecondary, borderColor: colors.border }]}>
            <Text style={{ color: colors.text, fontSize: 15, fontWeight: "600", marginBottom: 12 }}>Paiement via Orange Money</Text>

            {message ? (
              <View style={styles.successBox}>
                <Ionicons name="checkmark-circle" size={16} color="#22c55e" />
                <Text style={{ color: "#22c55e", fontSize: 13, flex: 1 }}>{message}</Text>
              </View>
            ) : null}
            {error ? (
              <View style={styles.errorBox}>
                <Ionicons name="alert-circle" size={16} color="#ef4444" />
                <Text style={{ color: "#ef4444", fontSize: 13, flex: 1 }}>{error}</Text>
              </View>
            ) : null}

            <Text style={{ color: colors.textMuted, fontSize: 13, marginBottom: 6 }}>Numéro Orange Money</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.inputText }]}
              value={phone}
              onChangeText={setPhone}
              placeholder="07XXXXXXXX"
              placeholderTextColor={colors.placeholder}
              keyboardType="phone-pad"
            />

            <TouchableOpacity
              style={[styles.payBtn, { backgroundColor: colors.accent }, loading && styles.payBtnDisabled]}
              onPress={handleSubscribe}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.payBtnText}>
                  Payer {selectedPlan?.price.toLocaleString("fr-BF")} FCFA
                </Text>
              )}
            </TouchableOpacity>

            <Text style={{ color: colors.textMuted, fontSize: 11, textAlign: "center", marginTop: 10 }}>
              Paiement sécurisé · Annulable à tout moment
            </Text>
          </View>
        ) : null}
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
  headerTitle: { flex: 1, fontWeight: "700", fontSize: 16, textAlign: "center" },
  headerSpacer: { width: 36 },
  scroll: { paddingBottom: 40 },
  hero: {
    backgroundColor: "#1f1239",
    paddingVertical: 36,
    paddingHorizontal: 24,
    alignItems: "center",
  },
  crownBadge: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "rgba(250,204,21,0.1)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  heroTitle: { color: "#fff", fontSize: 22, fontWeight: "700", marginBottom: 6 },
  heroSubtitle: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
    paddingHorizontal: 24,
  },
  activeBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "rgba(34,197,94,0.1)",
    borderColor: "rgba(34,197,94,0.3)",
    borderWidth: 1,
    padding: 14,
    borderRadius: 14,
    marginHorizontal: 16,
    marginTop: -14,
  },
  activeTitle: { color: "#22c55e", fontWeight: "600", fontSize: 14 },
  activeSubtitle: { color: "#9ca3af", fontSize: 12, marginTop: 2 },
  plansRow: { flexDirection: "row", gap: 10, paddingHorizontal: 16, marginTop: 20 },
  planCard: {
    flex: 1,
    borderRadius: 14,
    padding: 14,
    borderWidth: 2,
    position: "relative",
  },
  discountBadge: {
    position: "absolute",
    top: 10,
    right: 10,
    backgroundColor: "#facc15",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  discountText: { color: "#000", fontSize: 11, fontWeight: "700" },
  featuresCard: {
    borderRadius: 14,
    padding: 18,
    marginHorizontal: 16,
    marginTop: 16,
    borderWidth: StyleSheet.hairlineWidth,
  },
  featuresHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12 },
  featureRow: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 5 },
  paymentCard: {
    borderRadius: 14,
    padding: 18,
    marginHorizontal: 16,
    marginTop: 16,
    borderWidth: StyleSheet.hairlineWidth,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    marginBottom: 14,
  },
  payBtn: { paddingVertical: 16, borderRadius: 14, alignItems: "center" },
  payBtnDisabled: { opacity: 0.6 },
  payBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  successBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 10,
    backgroundColor: "rgba(34,197,94,0.1)",
    borderRadius: 8,
    marginBottom: 12,
  },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 10,
    backgroundColor: "rgba(239,68,68,0.1)",
    borderRadius: 8,
    marginBottom: 12,
  },
});
