import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Switch,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/lib/auth-context";
import { useTheme } from "@/lib/theme-context";
import {
  changePassword,
  deleteAccount,
  getPreferences,
  updatePreferences,
} from "@/lib/api";
import { useEffect } from "react";

export default function SettingsScreen() {
  const { logout } = useAuth();
  const { colors, theme, toggleTheme } = useTheme();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [saving, setSaving] = useState(false);

  // Preferences
  const [maxDistance, setMaxDistance] = useState("50");
  const [ageMin, setAgeMin] = useState("18");
  const [ageMax, setAgeMax] = useState("50");
  const [showOnline, setShowOnline] = useState(true);

  useEffect(() => {
    getPreferences()
      .then((p) => {
        if (p.max_distance) setMaxDistance(String(p.max_distance));
        if (p.min_age) setAgeMin(String(p.min_age));
        if (p.max_age) setAgeMax(String(p.max_age));
        if (p.show_online !== undefined)
          setShowOnline(p.show_online as boolean);
      })
      .catch(() => {});
  }, []);

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword) {
      Alert.alert("Erreur", "Remplissez les deux champs");
      return;
    }
    if (newPassword.length < 6) {
      Alert.alert(
        "Erreur",
        "Le nouveau mot de passe doit faire au moins 6 caractères",
      );
      return;
    }
    setSaving(true);
    try {
      await changePassword({
        current_password: currentPassword,
        new_password: newPassword,
      });
      Alert.alert("Succès", "Mot de passe modifié");
      setCurrentPassword("");
      setNewPassword("");
    } catch (e: unknown) {
      Alert.alert("Erreur", (e as Error).message);
    }
    setSaving(false);
  };

  const handleSavePreferences = async () => {
    const min = parseInt(ageMin) || 18;
    const max = parseInt(ageMax) || 50;
    const distance = parseInt(maxDistance) || 50;
    if (min > max) {
      Alert.alert("Erreur", "L'âge minimum ne peut pas dépasser l'âge maximum.");
      return;
    }
    if (distance < 1) {
      Alert.alert("Erreur", "La distance maximale doit être supérieure à 0 km.");
      return;
    }
    setSaving(true);
    try {
      await updatePreferences({
        max_distance: distance,
        min_age: min,
        max_age: max,
        show_online: showOnline,
      });
      Alert.alert("Succès", "Préférences mises à jour");
    } catch (e: unknown) {
      Alert.alert("Erreur", (e as Error).message);
    }
    setSaving(false);
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      "Supprimer le compte",
      "Cette action est irréversible. Toutes vos données seront supprimées.",
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Supprimer",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteAccount();
              await logout();
              router.replace("/login");
            } catch (e: unknown) {
              Alert.alert("Erreur", (e as Error).message);
            }
          },
        },
      ],
    );
  };

  const styles = makeStyles(colors);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Appearance */}
      <Text style={styles.sectionTitle}>Apparence</Text>
      <View style={styles.card}>
        <View style={styles.prefRow}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <Ionicons
              name={theme === "dark" ? "moon" : "sunny"}
              size={20}
              color={colors.accent}
            />
            <Text style={styles.prefLabel}>Thème sombre</Text>
          </View>
          <Switch
            value={theme === "dark"}
            onValueChange={toggleTheme}
            trackColor={{ false: colors.border, true: colors.accent }}
            thumbColor={colors.card}
          />
        </View>
      </View>

      {/* Preferences */}
      <Text style={styles.sectionTitle}>Préférences de découverte</Text>
      <View style={styles.card}>
        <View style={styles.prefRow}>
          <Text style={styles.prefLabel}>Distance max (km)</Text>
          <TextInput
            style={styles.prefInput}
            value={maxDistance}
            onChangeText={setMaxDistance}
            keyboardType="numeric"
          />
        </View>
        <View style={styles.prefRow}>
          <Text style={styles.prefLabel}>Âge min</Text>
          <TextInput
            style={styles.prefInput}
            value={ageMin}
            onChangeText={setAgeMin}
            keyboardType="numeric"
          />
        </View>
        <View style={styles.prefRow}>
          <Text style={styles.prefLabel}>Âge max</Text>
          <TextInput
            style={styles.prefInput}
            value={ageMax}
            onChangeText={setAgeMax}
            keyboardType="numeric"
          />
        </View>
        <TouchableOpacity
          style={styles.prefRow}
          onPress={() => setShowOnline(!showOnline)}
        >
          <Text style={styles.prefLabel}>Apparaître en ligne</Text>
          <Ionicons
            name={showOnline ? "toggle" : "toggle-outline"}
            size={32}
            color={showOnline ? colors.accent : colors.textMuted}
          />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.saveBtn}
          onPress={handleSavePreferences}
          disabled={saving}
        >
          <Text style={styles.saveBtnText}>Enregistrer les préférences</Text>
        </TouchableOpacity>
      </View>

      {/* Change password */}
      <Text style={styles.sectionTitle}>Changer le mot de passe</Text>
      <View style={styles.card}>
        <TextInput
          style={styles.input}
          value={currentPassword}
          onChangeText={setCurrentPassword}
          placeholder="Mot de passe actuel"
          placeholderTextColor={colors.placeholder}
          secureTextEntry
        />
        <TextInput
          style={styles.input}
          value={newPassword}
          onChangeText={setNewPassword}
          placeholder="Nouveau mot de passe"
          placeholderTextColor={colors.placeholder}
          secureTextEntry
        />
        <TouchableOpacity
          style={styles.saveBtn}
          onPress={handleChangePassword}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.saveBtnText}>Modifier</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Help & Legal */}
      <Text style={styles.sectionTitle}>Aide & Légal</Text>
      <View style={styles.card}>
        <TouchableOpacity
          style={styles.linkRow}
          onPress={() => router.push("/faq")}
        >
          <Ionicons name="help-circle-outline" size={20} color={colors.accentLight} />
          <Text style={styles.linkLabel}>Questions fréquentes</Text>
          <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.linkRow}
          onPress={() => router.push("/cgu")}
        >
          <Ionicons name="document-text-outline" size={20} color={colors.accentLight} />
          <Text style={styles.linkLabel}>
            Conditions Générales d&apos;Utilisation
          </Text>
          <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.linkRow}
          onPress={() => router.push("/confidentialite")}
        >
          <Ionicons name="shield-checkmark-outline" size={20} color={colors.accentLight} />
          <Text style={styles.linkLabel}>Politique de confidentialité</Text>
          <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
        </TouchableOpacity>
      </View>

      {/* Danger zone */}
      <Text style={styles.sectionTitle}>Zone de danger</Text>
      <TouchableOpacity style={styles.deleteBtn} onPress={handleDeleteAccount}>
        <Ionicons name="trash" size={20} color={colors.error} />
        <Text style={styles.deleteText}>Supprimer mon compte</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

function makeStyles(colors: ReturnType<typeof import("@/lib/theme-context").useTheme>["colors"]) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    content: { padding: 20, paddingBottom: 60 },
    sectionTitle: {
      color: colors.textMuted,
      fontSize: 13,
      fontWeight: "600",
      textTransform: "uppercase",
      letterSpacing: 1,
      marginBottom: 12,
      marginTop: 24,
    },
    card: {
      backgroundColor: colors.card,
      borderRadius: 12,
      padding: 16,
      gap: 12,
      borderWidth: 1,
      borderColor: colors.border,
    },
    input: {
      backgroundColor: colors.inputBg,
      color: colors.inputText,
      borderRadius: 10,
      padding: 14,
      fontSize: 15,
    },
    prefRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingVertical: 4,
    },
    prefLabel: { color: colors.text, fontSize: 15 },
    prefInput: {
      backgroundColor: colors.inputBg,
      color: colors.inputText,
      borderRadius: 8,
      padding: 8,
      width: 70,
      textAlign: "center",
      fontSize: 15,
    },
    saveBtn: {
      backgroundColor: colors.accent,
      paddingVertical: 14,
      borderRadius: 10,
      alignItems: "center",
      marginTop: 4,
    },
    saveBtnText: { color: "#fff", fontSize: 15, fontWeight: "600" },
    deleteBtn: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      paddingVertical: 16,
      borderWidth: 1,
      borderColor: colors.error,
      borderRadius: 12,
      marginTop: 8,
    },
    deleteText: { color: colors.error, fontSize: 16, fontWeight: "600" },
    linkRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      paddingVertical: 10,
    },
    linkLabel: { flex: 1, color: colors.text, fontSize: 14 },
  });
}
