import { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from "react-native";
import { router, Stack } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { getProfile, updateProfile } from "@/lib/api";
import { useTheme } from "@/lib/theme-context";

export default function EditProfileScreen() {
  const { colors } = useTheme();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [city, setCity] = useState("");
  const [gender, setGender] = useState("");
  const [lookingFor, setLookingFor] = useState("");
  const [birthDate, setBirthDate] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const p = await getProfile();
        setUsername((p.username as string) || "");
        setBio((p.bio as string) || "");
        setCity((p.city as string) || "");
        setGender((p.gender as string) || "");
        setLookingFor((p.looking_for as string) || "");
        setBirthDate((p.birth_date as string) || "");
      } catch {
        /* empty */
      }
      setLoading(false);
    })();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateProfile({
        username: username.trim(),
        bio: bio.trim(),
        city: city.trim(),
        gender,
        looking_for: lookingFor,
        birth_date: birthDate,
      });
      Alert.alert("Succès", "Profil mis à jour");
      router.back();
    } catch (e: unknown) {
      Alert.alert("Erreur", (e as Error).message);
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.background, padding: 20 }}>
      <Stack.Screen options={{ title: "Modifier le profil" }} />

      <View style={styles.field}>
        <Text style={[styles.label, { color: colors.textMuted }]}>Nom d'utilisateur</Text>
        <TextInput
          style={[styles.input, { backgroundColor: colors.inputBg, color: colors.inputText }]}
          value={username}
          onChangeText={setUsername}
          placeholderTextColor={colors.placeholder}
        />
      </View>

      <View style={styles.field}>
        <Text style={[styles.label, { color: colors.textMuted }]}>Bio</Text>
        <TextInput
          style={[styles.input, styles.multiline, { backgroundColor: colors.inputBg, color: colors.inputText }]}
          value={bio}
          onChangeText={setBio}
          placeholder="Parle de toi..."
          placeholderTextColor={colors.placeholder}
          multiline
          numberOfLines={4}
          maxLength={500}
        />
      </View>

      <View style={styles.field}>
        <Text style={[styles.label, { color: colors.textMuted }]}>Ville</Text>
        <TextInput
          style={[styles.input, { backgroundColor: colors.inputBg, color: colors.inputText }]}
          value={city}
          onChangeText={setCity}
          placeholder="Ta ville"
          placeholderTextColor={colors.placeholder}
        />
      </View>

      <View style={styles.field}>
        <Text style={[styles.label, { color: colors.textMuted }]}>Date de naissance (YYYY-MM-DD)</Text>
        <TextInput
          style={[styles.input, { backgroundColor: colors.inputBg, color: colors.inputText }]}
          value={birthDate}
          onChangeText={setBirthDate}
          placeholder="1995-06-15"
          placeholderTextColor={colors.placeholder}
        />
      </View>

      <View style={styles.field}>
        <Text style={[styles.label, { color: colors.textMuted }]}>Genre</Text>
        <View style={styles.optionRow}>
          {["homme", "femme", "autre"].map((g) => (
            <TouchableOpacity
              key={g}
              style={[styles.option, { backgroundColor: colors.cardSecondary }, gender === g && { backgroundColor: colors.accent }]}
              onPress={() => setGender(g)}
            >
              <Text style={[styles.optionText, { color: colors.textMuted }, gender === g && { color: "#fff" }]}>
                {g.charAt(0).toUpperCase() + g.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.field}>
        <Text style={[styles.label, { color: colors.textMuted }]}>Je cherche</Text>
        <View style={styles.optionRow}>
          {["homme", "femme", "tous"].map((l) => (
            <TouchableOpacity
              key={l}
              style={[styles.option, { backgroundColor: colors.cardSecondary }, lookingFor === l && { backgroundColor: colors.accent }]}
              onPress={() => setLookingFor(l)}
            >
              <Text style={[styles.optionText, { color: colors.textMuted }, lookingFor === l && { color: "#fff" }]}>
                {l.charAt(0).toUpperCase() + l.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <TouchableOpacity
        style={[styles.saveBtn, { backgroundColor: colors.accent }, saving && { opacity: 0.5 }]}
        onPress={handleSave}
        disabled={saving}
      >
        {saving ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <>
            <Ionicons name="checkmark" size={20} color="#fff" />
            <Text style={styles.saveText}>Enregistrer</Text>
          </>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  field: { marginBottom: 20 },
  label: {
    fontSize: 13,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 8,
  },
  input: {
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
  },
  multiline: { minHeight: 100, textAlignVertical: "top" },
  optionRow: { flexDirection: "row", gap: 8 },
  option: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: "center",
  },
  optionText: { fontSize: 14, fontWeight: "500" },
  saveBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
    marginTop: 8,
    marginBottom: 40,
  },
  saveText: { color: "#fff", fontSize: 16, fontWeight: "bold" },
});
