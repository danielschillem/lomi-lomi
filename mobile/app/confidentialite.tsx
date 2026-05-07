import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/lib/theme-context";

interface Section {
  title: string;
  body: string;
  bullets?: string[];
}

const sections: Section[] = [
  { title: "1. Données collectées", body: "Texto collecte les données suivantes :", bullets: ["Informations d'identité : nom, prénom, date de naissance, genre", "Coordonnées : numéro de téléphone, adresse e-mail", "Photos de profil et selfie de vérification", "Données de localisation (optionnel, pour les fonctions de proximité)", "Données de paiement (numéro Orange Money, traitées via le prestataire de paiement)", "Données d'usage : interactions, messages, préférences"] },
  { title: "2. Utilisation des données", body: "Vos données sont utilisées pour :", bullets: ["Faire fonctionner le service de rencontres et de matching", "Vérifier votre identité et sécuriser votre compte", "Vous envoyer des notifications pertinentes", "Améliorer nos services et prévenir les abus", "Traiter les paiements d'abonnement"] },
  { title: "3. Partage des données", body: "Nous ne vendons jamais vos données personnelles. Vos données peuvent être partagées uniquement avec :", bullets: ["Les prestataires techniques (hébergement, paiement) liés par contrat de confidentialité", "Les autorités compétentes en cas d'obligation légale"] },
  { title: "4. Conservation", body: "Vos données sont conservées pendant la durée de votre compte. Après suppression du compte, les données sont effacées sous 30 jours, sauf obligation légale contraire." },
  { title: "5. Vos droits", body: "Conformément aux lois applicables, vous avez le droit d'accéder, corriger, supprimer ou exporter vos données. Contactez-nous via le formulaire disponible dans l'application." },
  { title: "6. Sécurité", body: "Vos données sont chiffrées en transit (HTTPS/TLS) et les mots de passe sont stockés hashés (bcrypt). Nous appliquons des contrôles d'accès stricts à nos bases de données." },
  { title: "7. Cookies", body: "Texto utilise des cookies essentiels au fonctionnement du service (authentification). Aucun cookie publicitaire tiers n'est utilisé." },
  { title: "8. Contact", body: "Pour toute demande relative à la protection des données, contactez-nous via le formulaire disponible dans l'application." },
];

export default function ConfidentialiteScreen() {
  const { colors } = useTheme();

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Confidentialité</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={{ color: colors.text, fontSize: 24, fontWeight: "700", marginBottom: 4 }}>Politique de confidentialité</Text>
        <Text style={{ color: colors.textMuted, fontSize: 12, marginBottom: 24 }}>Dernière mise à jour : Janvier 2026</Text>

        {sections.map((s, i) => (
          <View key={i} style={styles.section}>
            <Text style={{ color: colors.text, fontSize: 16, fontWeight: "600", marginBottom: 8 }}>{s.title}</Text>
            <Text style={{ color: colors.textSecondary, fontSize: 14, lineHeight: 22 }}>{s.body}</Text>
            {s.bullets?.map((line, j) => (
              <View key={j} style={styles.bulletRow}>
                <Text style={{ color: colors.accent, fontSize: 14, marginRight: 8, lineHeight: 22 }}>•</Text>
                <Text style={{ color: colors.textSecondary, fontSize: 14, lineHeight: 22, flex: 1 }}>{line}</Text>
              </View>
            ))}
          </View>
        ))}

        <View style={[styles.footerLinks, { borderTopColor: colors.border }]}>
          <TouchableOpacity onPress={() => router.replace("/cgu")} style={styles.footerLink}>
            <Text style={{ color: colors.accentLight, fontSize: 13 }}>Conditions d&apos;utilisation</Text>
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
  bulletRow: { flexDirection: "row", marginTop: 6, paddingRight: 8 },
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
