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
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/lib/auth-context";
import {
  changePassword,
  deleteAccount,
  getPreferences,
  updatePreferences,
} from "@/lib/api";
import { useEffect } from "react";

export default function SettingsScreen() {
  const { logout } = useAuth();
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
        if (p.age_min) setAgeMin(String(p.age_min));
        if (p.age_max) setAgeMax(String(p.age_max));
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
    setSaving(true);
    try {
      await updatePreferences({
        max_distance: parseInt(maxDistance) || 50,
        age_min: parseInt(ageMin) || 18,
        age_max: parseInt(ageMax) || 50,
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

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
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
            color={showOnline ? "#7c3aed" : "#666"}
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
          placeholderTextColor="#666"
          secureTextEntry
        />
        <TextInput
          style={styles.input}
          value={newPassword}
          onChangeText={setNewPassword}
          placeholder="Nouveau mot de passe"
          placeholderTextColor="#666"
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

      {/* Danger zone */}
      <Text style={styles.sectionTitle}>Zone de danger</Text>
      <TouchableOpacity style={styles.deleteBtn} onPress={handleDeleteAccount}>
        <Ionicons name="trash" size={20} color="#ef4444" />
        <Text style={styles.deleteText}>Supprimer mon compte</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0a0a0a" },
  content: { padding: 20, paddingBottom: 60 },
  sectionTitle: {
    color: "#999",
    fontSize: 13,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 12,
    marginTop: 24,
  },
  card: {
    backgroundColor: "#111",
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  input: {
    backgroundColor: "#1a1a1a",
    color: "#fff",
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
  prefLabel: { color: "#ccc", fontSize: 15 },
  prefInput: {
    backgroundColor: "#1a1a1a",
    color: "#fff",
    borderRadius: 8,
    padding: 8,
    width: 70,
    textAlign: "center",
    fontSize: 15,
  },
  saveBtn: {
    backgroundColor: "#7c3aed",
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
    borderColor: "#ef4444",
    borderRadius: 12,
    marginTop: 8,
  },
  deleteText: { color: "#ef4444", fontSize: 16, fontWeight: "600" },
});
