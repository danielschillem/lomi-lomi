import { useState } from "react";
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
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { forgotPassword } from "@/lib/api";

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [devToken, setDevToken] = useState<string | null>(null);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    if (!email.trim()) {
      setError("Saisis ton adresse e-mail");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const res = await forgotPassword(email.trim().toLowerCase());
      setSent(true);
      if (res.dev_token) setDevToken(res.dev_token);
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
        <Text style={styles.headerTitle}>Mot de passe oublié</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        contentContainerStyle={styles.inner}
        keyboardShouldPersistTaps="handled"
      >
        {sent ? (
          <View style={styles.successCard}>
            <View style={styles.successIcon}>
              <Ionicons name="mail" size={36} color="#7c3aed" />
            </View>
            <Text style={styles.title}>E-mail envoyé</Text>
            <Text style={styles.successText}>
              Si un compte existe avec cette adresse, tu recevras un e-mail avec
              les instructions pour réinitialiser ton mot de passe.
            </Text>

            {devToken ? (
              <View style={styles.devBox}>
                <Text style={styles.devLabel}>Mode dev — token :</Text>
                <Text style={styles.devToken} selectable>
                  {devToken}
                </Text>
                <TouchableOpacity
                  style={styles.devUseBtn}
                  onPress={() =>
                    router.push({
                      pathname: "/reset-password",
                      params: { token: devToken },
                    })
                  }
                >
                  <Text style={styles.devUseText}>Utiliser ce token →</Text>
                </TouchableOpacity>
              </View>
            ) : null}

            <TouchableOpacity
              style={styles.linkBtn}
              onPress={() => router.replace("/login")}
            >
              <Text style={styles.link}>Retour à la connexion</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <Text style={styles.title}>Mot de passe oublié</Text>
            <Text style={styles.subtitle}>
              Entre ton adresse e-mail pour recevoir un lien de
              réinitialisation.
            </Text>

            {error ? <Text style={styles.error}>{error}</Text> : null}

            <Text style={styles.label}>Adresse e-mail</Text>
            <TextInput
              style={styles.input}
              placeholder="vous@exemple.com"
              placeholderTextColor="#666"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />

            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleSubmit}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Envoyer le lien</Text>
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
    marginBottom: 32,
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
  successCard: { paddingTop: 20, alignItems: "center" },
  successIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#1f1239",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  successText: {
    color: "#d1d5db",
    fontSize: 14,
    textAlign: "center",
    lineHeight: 21,
    marginBottom: 24,
    paddingHorizontal: 12,
  },
  devBox: {
    backgroundColor: "rgba(250, 204, 21, 0.1)",
    borderWidth: 1,
    borderColor: "#facc15",
    borderRadius: 10,
    padding: 12,
    marginBottom: 24,
    width: "100%",
  },
  devLabel: { color: "#facc15", fontSize: 12, fontWeight: "600" },
  devToken: { color: "#fde68a", fontSize: 11, marginTop: 4, marginBottom: 8 },
  devUseBtn: { paddingVertical: 4 },
  devUseText: { color: "#facc15", fontSize: 13, fontWeight: "600" },
});
