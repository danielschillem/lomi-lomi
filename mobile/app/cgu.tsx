import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

interface Section {
  title: string;
  body: string | string[];
}

const sections: Section[] = [
  {
    title: "1. Présentation de Lomi Lomi",
    body: "Lomi Lomi est une application de rencontres et de bien-être destinée aux adultes résidant principalement au Burkina Faso. Elle est éditée et exploitée conformément aux lois burkinabè en vigueur.",
  },
  {
    title: "2. Conditions d'accès",
    body: "L'utilisation de Lomi Lomi est réservée aux personnes âgées de 18 ans et plus. En vous inscrivant, vous confirmez avoir atteint cet âge et accepter les présentes conditions.",
  },
  {
    title: "3. Compte utilisateur",
    body: "Vous êtes responsable de la confidentialité de votre mot de passe et de toute activité effectuée depuis votre compte. Vous vous engagez à fournir des informations exactes et à ne pas usurper l'identité d'une autre personne.",
  },
  {
    title: "4. Règles de comportement",
    body: [
      "Respecter tous les autres membres en toute circonstance.",
      "Ne pas partager de contenu offensant, haineux ou illégal.",
      "Ne pas harceler, menacer ou intimider d'autres utilisateurs.",
      "Ne pas utiliser l'application à des fins commerciales non autorisées.",
      "Signaler tout comportement inapproprié via la fonction de signalement.",
    ],
  },
  {
    title: "5. Abonnement Premium (Lomi Pass)",
    body: "Lomi Lomi propose un abonnement payant (Lomi Pass) facturé en Francs CFA (XOF) via Orange Money. Les abonnements sont non remboursables sauf en cas de défaut technique avéré. Vous pouvez annuler à tout moment depuis votre profil.",
  },
  {
    title: "6. Propriété intellectuelle",
    body: "Tout le contenu de Lomi Lomi (logo, textes, design) est protégé. Vous conservez la propriété de vos photos et contenus, mais accordez à Lomi Lomi une licence d'utilisation pour le bon fonctionnement du service.",
  },
  {
    title: "7. Limitation de responsabilité",
    body: "Lomi Lomi n'est pas responsable des rencontres physiques entre utilisateurs. Nous vous recommandons de prendre toutes les précautions nécessaires lors de vos premiers rendez-vous.",
  },
  {
    title: "8. Résiliation",
    body: "Lomi Lomi se réserve le droit de suspendre ou supprimer tout compte ne respectant pas les présentes conditions. Vous pouvez supprimer votre compte à tout moment depuis les paramètres.",
  },
  {
    title: "9. Contact",
    body: "Pour toute question, contactez l'équipe Lomi Lomi via le formulaire de contact disponible dans l'application.",
  },
];

export default function CGUScreen() {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#e5e7eb" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>CGU</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.title}>
          Conditions Générales d&apos;Utilisation
        </Text>
        <Text style={styles.subtitle}>Dernière mise à jour : Janvier 2026</Text>

        {sections.map((s, i) => (
          <View key={i} style={styles.section}>
            <Text style={styles.sectionTitle}>{s.title}</Text>
            {Array.isArray(s.body) ? (
              s.body.map((line, j) => (
                <View key={j} style={styles.bulletRow}>
                  <Text style={styles.bullet}>•</Text>
                  <Text style={styles.bulletText}>{line}</Text>
                </View>
              ))
            ) : (
              <Text style={styles.bodyText}>{s.body}</Text>
            )}
          </View>
        ))}

        <View style={styles.footerLinks}>
          <TouchableOpacity
            onPress={() => router.replace("/confidentialite")}
            style={styles.footerLink}
          >
            <Text style={styles.footerLinkText}>
              Politique de confidentialité
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => router.replace("/register")}
            style={styles.footerLink}
          >
            <Text style={styles.footerLinkText}>S&apos;inscrire</Text>
          </TouchableOpacity>
        </View>
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
  scroll: { padding: 20, paddingBottom: 60 },
  title: { color: "#fff", fontSize: 24, fontWeight: "700", marginBottom: 4 },
  subtitle: { color: "#6b7280", fontSize: 12, marginBottom: 24 },
  section: { marginBottom: 22 },
  sectionTitle: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 8,
  },
  bodyText: { color: "#d1d5db", fontSize: 14, lineHeight: 22 },
  bulletRow: { flexDirection: "row", marginBottom: 4, paddingRight: 8 },
  bullet: { color: "#7c3aed", fontSize: 14, marginRight: 8, lineHeight: 22 },
  bulletText: { color: "#d1d5db", fontSize: 14, lineHeight: 22, flex: 1 },
  footerLinks: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 24,
    paddingTop: 24,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#222",
    gap: 24,
  },
  footerLink: { padding: 6 },
  footerLinkText: { color: "#a78bfa", fontSize: 13 },
});
