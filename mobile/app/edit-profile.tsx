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

export default function EditProfileScreen() {
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
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#7c3aed" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <Stack.Screen options={{ title: "Modifier le profil" }} />

      <View style={styles.field}>
        <Text style={styles.label}>Nom d'utilisateur</Text>
        <TextInput
          style={styles.input}
          value={username}
          onChangeText={setUsername}
          placeholderTextColor="#666"
        />
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>Bio</Text>
        <TextInput
          style={[styles.input, styles.multiline]}
          value={bio}
          onChangeText={setBio}
          placeholder="Parle de toi..."
          placeholderTextColor="#666"
          multiline
          numberOfLines={4}
          maxLength={500}
        />
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>Ville</Text>
        <TextInput
          style={styles.input}
          value={city}
          onChangeText={setCity}
          placeholder="Ta ville"
          placeholderTextColor="#666"
        />
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>Date de naissance (YYYY-MM-DD)</Text>
        <TextInput
          style={styles.input}
          value={birthDate}
          onChangeText={setBirthDate}
          placeholder="1995-06-15"
          placeholderTextColor="#666"
        />
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>Genre</Text>
        <View style={styles.optionRow}>
          {["homme", "femme", "autre"].map((g) => (
            <TouchableOpacity
              key={g}
              style={[styles.option, gender === g && styles.optionActive]}
              onPress={() => setGender(g)}
            >
              <Text
                style={[
                  styles.optionText,
                  gender === g && styles.optionTextActive,
                ]}
              >
                {g.charAt(0).toUpperCase() + g.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>Je cherche</Text>
        <View style={styles.optionRow}>
          {["homme", "femme", "tous"].map((l) => (
            <TouchableOpacity
              key={l}
              style={[styles.option, lookingFor === l && styles.optionActive]}
              onPress={() => setLookingFor(l)}
            >
              <Text
                style={[
                  styles.optionText,
                  lookingFor === l && styles.optionTextActive,
                ]}
              >
                {l.charAt(0).toUpperCase() + l.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <TouchableOpacity
        style={[styles.saveBtn, saving && { opacity: 0.5 }]}
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
  container: { flex: 1, backgroundColor: "#0a0a0a", padding: 20 },
  center: {
    flex: 1,
    backgroundColor: "#0a0a0a",
    justifyContent: "center",
    alignItems: "center",
  },
  field: { marginBottom: 20 },
  label: {
    color: "#999",
    fontSize: 13,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 8,
  },
  input: {
    backgroundColor: "#1a1a1a",
    color: "#fff",
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
    backgroundColor: "#1a1a1a",
    alignItems: "center",
  },
  optionActive: { backgroundColor: "#7c3aed" },
  optionText: { color: "#999", fontSize: 14, fontWeight: "500" },
  optionTextActive: { color: "#fff" },
  saveBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#7c3aed",
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
    marginTop: 8,
    marginBottom: 40,
  },
  saveText: { color: "#fff", fontSize: 16, fontWeight: "bold" },
});
