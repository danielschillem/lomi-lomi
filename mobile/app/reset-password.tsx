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

export default function ResetPasswordScreen() {
  const params = useLocalSearchParams<{ token?: string }>();
  const token = (params.token || "").toString();

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) setError("Token manquant ou invalide.");
  }, [token]);

  useEffect(() => {
    if (!success) return;
    const t = setTimeout(() => router.replace("/login"), 2500);
    return () => clearTimeout(t);
  }, [success]);

  const handleSubmit = async () => {
    if (password.length < 8) {
      setError("Le mot de passe doit faire au moins 8 caractères.");
      return;
    }
    if (password !== confirm) {
      setError("Les mots de passe ne correspondent pas.");
      return;
    }
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
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#e5e7eb" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Nouveau mot de passe</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        contentContainerStyle={styles.inner}
        keyboardShouldPersistTaps="handled"
      >
        {success ? (
          <View style={styles.successCard}>
            <View style={styles.successIcon}>
              <Ionicons name="checkmark-circle" size={48} color="#22c55e" />
            </View>
            <Text style={styles.title}>Mot de passe mis à jour</Text>
            <Text style={styles.subtitle}>Redirection en cours…</Text>
          </View>
        ) : (
          <>
            <Text style={styles.title}>Nouveau mot de passe</Text>
            <Text style={styles.subtitle}>
              Choisis un mot de passe sécurisé (min. 8 caractères).
            </Text>

            {error ? <Text style={styles.error}>{error}</Text> : null}

            <Text style={styles.label}>Nouveau mot de passe</Text>
            <TextInput
              style={styles.input}
              placeholder="••••••••"
              placeholderTextColor="#666"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoCapitalize="none"
            />

            <Text style={styles.label}>Confirmer le mot de passe</Text>
            <TextInput
              style={styles.input}
              placeholder="••••••••"
              placeholderTextColor="#666"
              value={confirm}
              onChangeText={setConfirm}
              secureTextEntry
              autoCapitalize="none"
            />

            <TouchableOpacity
              style={[
                styles.button,
                (loading || !token) && styles.buttonDisabled,
              ]}
              onPress={handleSubmit}
              disabled={loading || !token}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Réinitialiser</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.linkBtn}
              onPress={() => router.replace("/login")}
            >
              <Text style={styles.link}>Retour à la connexion</Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
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
  inner: { padding: 24, paddingTop: 40 },
  title: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 8,
    textAlign: "center",
  },
  subtitle: {
    color: "#9ca3af",
    fontSize: 14,
    textAlign: "center",
    marginBottom: 28,
    lineHeight: 20,
  },
  error: {
    color: "#ef4444",
    textAlign: "center",
    marginBottom: 12,
    fontSize: 14,
  },
  label: { color: "#9ca3af", fontSize: 13, marginBottom: 6 },
  input: {
    backgroundColor: "#1a1a1a",
    borderWidth: 1,
    borderColor: "#333",
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: "#fff",
    marginBottom: 16,
  },
  button: {
    backgroundColor: "#7c3aed",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    marginTop: 8,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  linkBtn: { padding: 12, alignItems: "center", marginTop: 12 },
  link: { color: "#a78bfa", fontSize: 14 },
  successCard: { paddingTop: 40, alignItems: "center" },
  successIcon: { marginBottom: 16 },
});
