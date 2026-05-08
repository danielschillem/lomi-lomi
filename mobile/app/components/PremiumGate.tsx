import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/lib/auth-context";
import { useTheme } from "@/lib/theme-context";

const BENEFITS = [
  "Découverte & Matchs illimités",
  "Accès à tous les services & lieux",
  "Super Likes, Boosts & Badge Premium",
];

interface Props {
  feature: string;
  icon: React.ComponentProps<typeof Ionicons>["name"];
  tone: string;
  children: React.ReactNode;
}

export default function PremiumGate({ feature, icon, tone, children }: Props) {
  const { isPremium } = useAuth();
  const { colors } = useTheme();

  if (isPremium) return <>{children}</>;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.inner}>
        <View style={[styles.iconWrap, { backgroundColor: `${tone}18` }]}>
          <Ionicons name={icon} size={48} color={tone} />
          <View style={[styles.lockBadge, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Ionicons name="lock-closed" size={14} color={colors.textMuted} />
          </View>
        </View>

        <Text style={[styles.label, { color: colors.accentLight }]}>TextMe+ requis</Text>
        <Text style={[styles.title, { color: colors.text }]}>{feature}</Text>
        <Text style={[styles.subtitle, { color: colors.textMuted }]}>
          Cette fonctionnalité est réservée aux membres TextMe+.
        </Text>

        <View style={[styles.benefitsCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {BENEFITS.map((b) => (
            <View key={b} style={styles.benefit}>
              <Ionicons name="checkmark-circle" size={16} color={colors.success} />
              <Text style={[styles.benefitText, { color: colors.textSecondary }]}>{b}</Text>
            </View>
          ))}
        </View>

        <TouchableOpacity
          style={[styles.cta, { backgroundColor: colors.accent }]}
          onPress={() => router.push("/premium")}
        >
          <Ionicons name="ribbon" size={18} color="#fff" />
          <Text style={styles.ctaText}>Activer TextMe+</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => router.back()} style={styles.back}>
          <Text style={[styles.backText, { color: colors.textMuted }]}>Retour</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 28,
  },
  inner: {
    width: "100%",
    alignItems: "center",
  },
  iconWrap: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  lockBadge: {
    position: "absolute",
    bottom: 4,
    right: 4,
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  label: {
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 6,
  },
  title: {
    fontSize: 24,
    fontWeight: "800",
    marginBottom: 8,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 24,
  },
  benefitsCard: {
    width: "100%",
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 16,
    gap: 12,
    marginBottom: 24,
  },
  benefit: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  benefitText: {
    fontSize: 14,
    flex: 1,
  },
  cta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    width: "100%",
    paddingVertical: 16,
    borderRadius: 14,
    justifyContent: "center",
    marginBottom: 14,
  },
  ctaText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  back: {
    padding: 8,
  },
  backText: {
    fontSize: 14,
  },
});
