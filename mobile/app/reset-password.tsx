import { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { resetPassword } from "@/lib/api";
import { useTheme } from "@/lib/theme-context";

export default function ResetPasswordScreen() {
  const { colors } = useTheme();
  const params = useLocalSearchParams<{ token?: string }>();
  const token = (params.token || "").toString();

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => { if (!token) setError("Token manquant ou invalide."); }, [token]);

  useEffect(() => {
    if (!success) return;
    const t = setTimeout(() => router.replace("/login"), 2500);
    return () => clearTimeout(t);
  }, [success]);

  const handleSubmit = async () => {
    if (password.length < 8) { setError("Le mot de passe doit faire au moins 8 caractères."); return; }
    if (password !== confirm) { setError("Les mots de passe ne correspondent pas."); return; }
    setError("");
    setLoading(true);
    try {
      await resetPassword({ token, password });
      setSuccess(true);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Erreur");
    }
    setLoading(false);
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.background }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Nouveau mot de passe</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.inner} keyboardShouldPersistTaps="handled">
        {success ? (
          <View style={styles.successCard}>
            <View style={{ marginBottom: 16 }}>
              <Ionicons name="checkmark-circle" size={48} color="#22c55e" />
            </View>
            <Text style={[styles.title, { color: colors.text }]}>Mot de passe mis à jour</Text>
            <Text style={{ color: colors.textMuted, fontSize: 14, textAlign: "center", marginBottom: 28, lineHeight: 20 }}>Redirection en cours…</Text>
          </View>
        ) : (
          <>
            <Text style={[styles.title, { color: colors.text }]}>Nouveau mot de passe</Text>
            <Text style={{ color: colors.textMuted, fontSize: 14, textAlign: "center", marginBottom: 28, lineHeight: 20 }}>
              Choisis un mot de passe sécurisé (min. 8 caractères).
            </Text>

            {error ? <Text style={[styles.error, { color: colors.error }]}>{error}</Text> : null}

            <Text style={{ color: colors.textMuted, fontSize: 13, marginBottom: 6 }}>Nouveau mot de passe</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.inputText }]}
              placeholder="••••••••"
              placeholderTextColor={colors.placeholder}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoCapitalize="none"
            />

            <Text style={{ color: colors.textMuted, fontSize: 13, marginBottom: 6 }}>Confirmer le mot de passe</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.inputText }]}
              placeholder="••••••••"
              placeholderTextColor={colors.placeholder}
              value={confirm}
              onChangeText={setConfirm}
              secureTextEntry
              autoCapitalize="none"
            />

            <TouchableOpacity
              style={[styles.button, { backgroundColor: colors.accent }, (loading || !token) && styles.buttonDisabled]}
              onPress={handleSubmit}
              disabled={loading || !token}
            >
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Réinitialiser</Text>}
            </TouchableOpacity>

            <TouchableOpacity style={styles.linkBtn} onPress={() => router.replace("/login")}>
              <Text style={{ color: colors.accentLight, fontSize: 14 }}>Retour à la connexion</Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
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
  inner: { padding: 24, paddingTop: 40 },
  title: { fontSize: 22, fontWeight: "700", marginBottom: 8, textAlign: "center" },
  error: { textAlign: "center", marginBottom: 12, fontSize: 14 },
  input: { borderWidth: 1, borderRadius: 12, padding: 16, fontSize: 16, marginBottom: 16 },
  button: { borderRadius: 12, padding: 16, alignItems: "center", marginTop: 8 },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  linkBtn: { padding: 12, alignItems: "center", marginTop: 12 },
  successCard: { paddingTop: 40, alignItems: "center" },
});
