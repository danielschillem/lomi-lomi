import { useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/lib/theme-context";

const faqs: { q: string; a: string }[] = [
  { q: "Comment fonctionne Texto ?", a: "Créez un profil, explorez des profils compatibles avec vos préférences, likez ceux qui vous plaisent. Si l'intérêt est mutuel, c'est un match ! Vous pouvez alors discuter via notre messagerie interactive." },
  { q: "Mes données sont-elles protégées ?", a: "Oui. Vos messages sont chiffrés. Votre email n'est jamais visible par les autres utilisateurs. Nous ne vendons aucune donnée à des tiers." },
  { q: "Comment supprimer mon compte ?", a: "Rendez-vous dans Paramètres > Zone dangereuse > Supprimer mon compte. Confirmez avec votre mot de passe. La suppression est définitive." },
  { q: "Le service est-il gratuit ?", a: "L'inscription, la découverte et le matching sont gratuits. Une mise en relation pour discuter (250 FCFA) et un abonnement Premium optionnel (TexMe) sont proposés." },
  { q: "Comment signaler un comportement abusif ?", a: "Sur chaque profil, utilisez l'icône de signalement pour notifier un comportement inapproprié. Notre équipe traite chaque signalement sous 24h." },
  { q: "Comment bloquer un utilisateur ?", a: "Depuis la page Découverte ou le profil d'un utilisateur, utilisez l'option Bloquer. L'utilisateur bloqué ne pourra plus vous contacter ni voir votre profil." },
  { q: "Qu'est-ce qu'un profil vérifié ?", a: "Un profil vérifié a confirmé son adresse email et soumis un selfie de vérification. Le badge apparaît sur son profil pour renforcer la confiance." },
  { q: "Comment contacter le support ?", a: "Depuis Paramètres > Aide & support, ou via le formulaire de contact dans l'application. Nous répondons sous 48h ouvrées." },
];

export default function FaqScreen() {
  const { colors } = useTheme();
  const [openIdx, setOpenIdx] = useState<number | null>(null);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Aide</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.titleRow}>
          <Ionicons name="help-circle" size={28} color={colors.accent} />
          <Text style={{ color: colors.text, fontSize: 20, fontWeight: "700" }}>Questions fréquentes</Text>
        </View>

        <View style={styles.faqList}>
          {faqs.map((faq, i) => {
            const isOpen = openIdx === i;
            return (
              <View key={i} style={[styles.faqCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <TouchableOpacity
                  onPress={() => setOpenIdx(isOpen ? null : i)}
                  style={styles.faqHeader}
                  activeOpacity={0.7}
                >
                  <Text style={{ flex: 1, color: colors.text, fontSize: 14, fontWeight: "600", paddingRight: 12 }}>{faq.q}</Text>
                  <Ionicons name={isOpen ? "chevron-up" : "chevron-down"} size={20} color={colors.accentLight} />
                </TouchableOpacity>
                {isOpen ? (
                  <View style={[styles.faqBody, { borderTopColor: colors.border }]}>
                    <Text style={{ color: colors.textMuted, fontSize: 13, lineHeight: 20 }}>{faq.a}</Text>
                  </View>
                ) : null}
              </View>
            );
          })}
        </View>

        <View style={styles.legalLinks}>
          <Text style={{ color: colors.textMuted, fontSize: 12, textTransform: "uppercase", fontWeight: "600", marginBottom: 10, paddingHorizontal: 4, letterSpacing: 0.5 }}>
            Documents légaux
          </Text>
          <TouchableOpacity style={[styles.legalLink, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={() => router.push("/cgu")}>
            <Ionicons name="document-text" size={18} color={colors.accentLight} />
            <Text style={{ flex: 1, color: colors.text, fontSize: 14 }}>Conditions Générales d&apos;Utilisation</Text>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.legalLink, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={() => router.push("/confidentialite")}>
            <Ionicons name="shield-checkmark" size={18} color={colors.accentLight} />
            <Text style={{ flex: 1, color: colors.text, fontSize: 14 }}>Politique de confidentialité</Text>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </TouchableOpacity>
        </View>
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
  scroll: { padding: 16, paddingBottom: 60 },
  titleRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 16, paddingHorizontal: 4 },
  faqList: { gap: 10 },
  faqCard: { borderRadius: 12, borderWidth: StyleSheet.hairlineWidth, overflow: "hidden" },
  faqHeader: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 14 },
  faqBody: { paddingHorizontal: 16, paddingBottom: 14, borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 10 },
  legalLinks: { marginTop: 32 },
  legalLink: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: 8,
  },
});
