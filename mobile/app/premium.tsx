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

interface Subscription {
  is_premium: boolean;
  plan?: string;
  ends_at?: string;
  status?: string;
}

export default function PremiumScreen() {
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
    } catch {
      // ignore
    }
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
    if (!phone.trim()) {
      setError("Entrez votre numéro Orange Money");
      return;
    }
    if (!selectedPlan) return;
    setLoading(true);
    setError("");
    setMessage("");
    try {
      const res = await subscribePremium({
        plan: selectedId,
        phone: phone.trim(),
      });
      const endsAt = res.ends_at
        ? new Date(res.ends_at).toLocaleDateString("fr-BF")
        : "";
      setMessage(`Abonnement activé jusqu'au ${endsAt}`);
      setPhone("");
      await refreshSubscription();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Erreur de paiement");
    }
    setLoading(false);
  };

  const handleCancel = () => {
    Alert.alert(
      "Annuler l'abonnement",
      "Voulez-vous vraiment annuler votre abonnement Lomi Pass ?",
      [
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
      ],
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#e5e7eb" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Lomi Pass</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Hero */}
        <View style={styles.hero}>
          <View style={styles.crownBadge}>
            <Ionicons name="ribbon" size={36} color="#facc15" />
          </View>
          <Text style={styles.heroTitle}>Lomi Pass Premium</Text>
          <Text style={styles.heroSubtitle}>
            Débloquez toutes les fonctionnalités et multipliez vos chances de
            rencontres
          </Text>
        </View>

        {/* Active subscription banner */}
        {subscription?.is_premium ? (
          <View style={styles.activeBanner}>
            <Ionicons name="checkmark-circle" size={22} color="#22c55e" />
            <View style={{ flex: 1 }}>
              <Text style={styles.activeTitle}>Abonnement actif</Text>
              <Text style={styles.activeSubtitle}>
                Plan {subscription.plan ?? "-"} · Expire le{" "}
                {subscription.ends_at
                  ? new Date(subscription.ends_at).toLocaleDateString("fr-BF")
                  : "-"}
              </Text>
            </View>
            <TouchableOpacity onPress={handleCancel} hitSlop={8}>
              <Ionicons name="close-circle" size={22} color="#6b7280" />
            </TouchableOpacity>
          </View>
        ) : null}

        {/* Plans */}
        <View style={styles.plansRow}>
          {plans.map((plan) => {
            const active = plan.id === selectedId;
            return (
              <TouchableOpacity
                key={plan.id}
                style={[styles.planCard, active && styles.planCardActive]}
                onPress={() => setSelectedId(plan.id)}
              >
                {plan.id === "yearly" ? (
                  <View style={styles.discountBadge}>
                    <Text style={styles.discountText}>-38%</Text>
                  </View>
                ) : null}
                <Text style={styles.planPrice}>
                  {plan.price.toLocaleString("fr-BF")} FCFA
                </Text>
                <Text style={styles.planDuration}>
                  par {plan.id === "monthly" ? "mois" : "an"}
                </Text>
                <Text style={styles.planName}>{plan.name}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Features */}
        {selectedPlan ? (
          <View style={styles.featuresCard}>
            <View style={styles.featuresHeader}>
              <Ionicons name="star" size={16} color="#facc15" />
              <Text style={styles.featuresTitle}>Ce que vous obtenez</Text>
            </View>
            {selectedPlan.features.map((f, i) => (
              <View key={i} style={styles.featureRow}>
                <Ionicons name="checkmark" size={16} color="#22c55e" />
                <Text style={styles.featureText}>{f}</Text>
              </View>
            ))}
          </View>
        ) : null}

        {/* Payment */}
        {!subscription?.is_premium ? (
          <View style={styles.paymentCard}>
            <Text style={styles.paymentTitle}>Paiement via Orange Money</Text>

            {message ? (
              <View style={styles.successBox}>
                <Ionicons name="checkmark-circle" size={16} color="#22c55e" />
                <Text style={styles.successText}>{message}</Text>
              </View>
            ) : null}
            {error ? (
              <View style={styles.errorBox}>
                <Ionicons name="alert-circle" size={16} color="#ef4444" />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            <Text style={styles.label}>Numéro Orange Money</Text>
            <TextInput
              style={styles.input}
              value={phone}
              onChangeText={setPhone}
              placeholder="07XXXXXXXX"
              placeholderTextColor="#666"
              keyboardType="phone-pad"
            />

            <TouchableOpacity
              style={[styles.payBtn, loading && styles.payBtnDisabled]}
              onPress={handleSubscribe}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.payBtnText}>
                  Payer{" "}
                  {selectedPlan?.price.toLocaleString("fr-BF")} FCFA
                </Text>
              )}
            </TouchableOpacity>

            <Text style={styles.disclaimer}>
              Paiement sécurisé · Annulable à tout moment
            </Text>
          </View>
        ) : null}
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
  headerTitle: {
    flex: 1,
    color: "#fff",
    fontWeight: "700",
    fontSize: 16,
    textAlign: "center",
  },
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
    backgroundColor: "rgba(250, 204, 21, 0.1)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  heroTitle: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 6,
  },
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
    backgroundColor: "rgba(34, 197, 94, 0.1)",
    borderColor: "rgba(34, 197, 94, 0.3)",
    borderWidth: 1,
    padding: 14,
    borderRadius: 14,
    marginHorizontal: 16,
    marginTop: -14,
  },
  activeTitle: { color: "#22c55e", fontWeight: "600", fontSize: 14 },
  activeSubtitle: { color: "#9ca3af", fontSize: 12, marginTop: 2 },
  plansRow: {
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 16,
    marginTop: 20,
  },
  planCard: {
    flex: 1,
    backgroundColor: "#16161a",
    borderRadius: 14,
    padding: 14,
    borderWidth: 2,
    borderColor: "#1f1f23",
    position: "relative",
  },
  planCardActive: {
    borderColor: "#7c3aed",
    backgroundColor: "rgba(124, 58, 237, 0.08)",
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
  planPrice: { color: "#fff", fontSize: 18, fontWeight: "700" },
  planDuration: { color: "#9ca3af", fontSize: 11, marginTop: 2 },
  planName: { color: "#a78bfa", fontSize: 13, fontWeight: "600", marginTop: 4 },
  featuresCard: {
    backgroundColor: "#16161a",
    borderRadius: 14,
    padding: 18,
    marginHorizontal: 16,
    marginTop: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#222",
  },
  featuresHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  featuresTitle: { color: "#fff", fontSize: 15, fontWeight: "600" },
  featureRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 5,
  },
  featureText: { color: "#d1d5db", fontSize: 13, flex: 1 },
  paymentCard: {
    backgroundColor: "#16161a",
    borderRadius: 14,
    padding: 18,
    marginHorizontal: 16,
    marginTop: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#222",
  },
  paymentTitle: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "600",
    marginBottom: 12,
  },
  label: { color: "#9ca3af", fontSize: 13, marginBottom: 6 },
  input: {
    backgroundColor: "#0a0a0a",
    borderWidth: 1,
    borderColor: "#2a2a2a",
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    color: "#fff",
    marginBottom: 14,
  },
  payBtn: {
    backgroundColor: "#7c3aed",
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: "center",
  },
  payBtnDisabled: { opacity: 0.6 },
  payBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  disclaimer: {
    color: "#6b7280",
    fontSize: 11,
    textAlign: "center",
    marginTop: 10,
  },
  successBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 10,
    backgroundColor: "rgba(34,197,94,0.1)",
    borderRadius: 8,
    marginBottom: 12,
  },
  successText: { color: "#22c55e", fontSize: 13, flex: 1 },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 10,
    backgroundColor: "rgba(239,68,68,0.1)",
    borderRadius: 8,
    marginBottom: 12,
  },
  errorText: { color: "#ef4444", fontSize: 13, flex: 1 },
});
