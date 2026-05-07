import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/lib/theme-context";

interface Section {
  title: string;
  body: string | string[];
}

const sections: Section[] = [
  { title: "1. Présentation de Texto", body: "Texto est une application de messagerie ouverte tout public, éditée et exploitée conformément aux lois burkinabè en vigueur." },
  { title: "2. Conditions d'accès", body: "L'utilisation de Texto est réservée aux personnes âgées de 18 ans et plus. En vous inscrivant, vous confirmez avoir atteint cet âge et accepter les présentes conditions." },
  { title: "3. Compte utilisateur", body: "Vous êtes responsable de la confidentialité de votre mot de passe et de toute activité effectuée depuis votre compte. Vous vous engagez à fournir des informations exactes et à ne pas usurper l'identité d'une autre personne." },
  { title: "4. Règles de comportement", body: ["Respecter tous les autres membres en toute circonstance.", "Ne pas partager de contenu offensant, haineux ou illégal.", "Ne pas harceler, menacer ou intimider d'autres utilisateurs.", "Ne pas utiliser l'application à des fins commerciales non autorisées.", "Signaler tout comportement inapproprié via la fonction de signalement."] },
  { title: "5. Abonnement Premium (TexMe)", body: "Texto propose un abonnement payant TexMe facturé en Francs CFA (XOF) via Orange Money. Les abonnements sont non remboursables sauf en cas de défaut technique avéré. Vous pouvez annuler à tout moment depuis votre profil." },
  { title: "6. Propriété intellectuelle", body: "Tout le contenu de Texto (logo, textes, design) est protégé. Vous conservez la propriété de vos photos et contenus, mais accordez à Texto une licence d'utilisation pour le bon fonctionnement du service." },
  { title: "7. Limitation de responsabilité", body: "Texto n'est pas responsable des rencontres physiques entre utilisateurs. Nous vous recommandons de prendre toutes les précautions nécessaires lors de vos premiers rendez-vous." },
  { title: "8. Résiliation", body: "Texto se réserve le droit de suspendre ou supprimer tout compte ne respectant pas les présentes conditions. Vous pouvez supprimer votre compte à tout moment depuis les paramètres." },
  { title: "9. Contact", body: "Pour toute question, contactez l'équipe Texto via le formulaire de contact disponible dans l'application." },
];

export default function CGUScreen() {
  const { colors } = useTheme();

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>CGU</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={{ color: colors.text, fontSize: 24, fontWeight: "700", marginBottom: 4 }}>
          Conditions Générales d&apos;Utilisation
        </Text>
        <Text style={{ color: colors.textMuted, fontSize: 12, marginBottom: 24 }}>Dernière mise à jour : Janvier 2026</Text>

        {sections.map((s, i) => (
          <View key={i} style={styles.section}>
            <Text style={{ color: colors.text, fontSize: 16, fontWeight: "600", marginBottom: 8 }}>{s.title}</Text>
            {Array.isArray(s.body) ? (
              s.body.map((line, j) => (
                <View key={j} style={styles.bulletRow}>
                  <Text style={{ color: colors.accent, fontSize: 14, marginRight: 8, lineHeight: 22 }}>•</Text>
                  <Text style={{ color: colors.textSecondary, fontSize: 14, lineHeight: 22, flex: 1 }}>{line}</Text>
                </View>
              ))
            ) : (
              <Text style={{ color: colors.textSecondary, fontSize: 14, lineHeight: 22 }}>{s.body}</Text>
            )}
          </View>
        ))}

        <View style={[styles.footerLinks, { borderTopColor: colors.border }]}>
          <TouchableOpacity onPress={() => router.replace("/confidentialite")} style={styles.footerLink}>
            <Text style={{ color: colors.accentLight, fontSize: 13 }}>Politique de confidentialité</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.replace("/register")} style={styles.footerLink}>
            <Text style={{ color: colors.accentLight, fontSize: 13 }}>S&apos;inscrire</Text>
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
  scroll: { padding: 20, paddingBottom: 60 },
  section: { marginBottom: 22 },
  bulletRow: { flexDirection: "row", marginBottom: 4, paddingRight: 8 },
  footerLinks: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 24,
    paddingTop: 24,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: 24,
  },
  footerLink: { padding: 6 },
});
