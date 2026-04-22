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
  Image,
  ScrollView,
  Modal,
  FlatList,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useAuth } from "@/lib/auth-context";
import { sendOTP, verifyOTP, registerPhone, setToken } from "@/lib/api";
import {
  COUNTRIES,
  detectCountry,
  type CountryEntry,
} from "@/lib/phone-country";

type Step = "phone" | "otp" | "profile" | "email";

export default function RegisterScreen() {
  const params = useLocalSearchParams<{
    phone?: string;
    phone_verified?: string;
  }>();
  const { register, loginWithToken } = useAuth();

  const alreadyVerified = params.phone_verified === "true" && !!params.phone;

  const [step, setStep] = useState<Step>(alreadyVerified ? "profile" : "phone");
  const [country, setCountry] = useState<CountryEntry>(COUNTRIES[10]); // FR
  const [phoneNum, setPhoneNum] = useState("");
  const [otp, setOtp] = useState("");
  const [devCode, setDevCode] = useState<string | null>(null);
  const [verifiedPhone, setVerifiedPhone] = useState(params.phone || "");

  // Profile
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  // Email fallback
  const [email, setEmail] = useState("");

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [countryModal, setCountryModal] = useState(false);

  useEffect(() => {
    detectCountry()
      .then(setCountry)
      .catch(() => {});
  }, []);

  const fullPhone = `${country.dial}${phoneNum.replace(/^0+/, "")}`;

  const handleSendOTP = async () => {
    if (!phoneNum || phoneNum.length < 6) {
      setError("Numéro invalide");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await sendOTP(fullPhone);
      if (res.dev_code) setDevCode(res.dev_code);
      setStep("otp");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Erreur d'envoi");
    }
    setLoading(false);
  };

  const handleVerifyOTP = async () => {
    if (otp.length < 4) {
      setError("Code trop court");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await verifyOTP(fullPhone, otp);
      if (res.action === "login" && res.token && res.user) {
        // Déjà inscrit → login direct
        await loginWithToken(res.token, res.user);
        router.replace("/(tabs)/discover");
      } else {
        // Nouveau → étape profil
        setVerifiedPhone(fullPhone);
        setStep("profile");
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Code invalide");
    }
    setLoading(false);
  };

  const handlePhoneRegister = async () => {
    if (!username || !password) {
      setError("Remplis tous les champs");
      return;
    }
    if (password.length < 6) {
      setError("Le mot de passe doit faire au moins 6 caractères");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await registerPhone({
        phone: verifiedPhone,
        username: username.trim(),
        password,
      });
      await setToken(res.token);
      await loginWithToken(
        res.token,
        res.user as {
          id: number;
          username: string;
          avatar_url: string;
          is_verified: boolean;
          role: string;
        },
      );
      router.replace("/(tabs)/discover");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Erreur d'inscription");
    }
    setLoading(false);
  };

  const handleEmailRegister = async () => {
    if (!username || !email || !password) {
      setError("Remplis tous les champs");
      return;
    }
    if (password.length < 6) {
      setError("Le mot de passe doit faire au moins 6 caractères");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await register(username.trim(), email.trim().toLowerCase(), password);
      router.replace("/(tabs)/discover");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Erreur d'inscription");
    }
    setLoading(false);
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        contentContainerStyle={styles.inner}
        keyboardShouldPersistTaps="handled"
      >
        <Image
          source={require("@/assets/logo.png")}
          style={styles.logo}
          resizeMode="contain"
        />
        <Text style={styles.title}>Créer un compte</Text>
        <Text style={styles.subtitle}>
          {step === "otp"
            ? "Saisis le code reçu"
            : step === "profile"
              ? "Choisis ton pseudo"
              : step === "email"
                ? "Inscription par email"
                : "Rejoins Lomi Lomi"}
        </Text>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        {/* ───── PHONE STEP ───── */}
        {step === "phone" && (
          <>
            <View style={styles.phoneRow}>
              <TouchableOpacity
                style={styles.countryBtn}
                onPress={() => setCountryModal(true)}
              >
                <Text style={styles.countryText}>
                  {country.flag} {country.dial}
                </Text>
              </TouchableOpacity>
              <TextInput
                style={[styles.input, { flex: 1 }]}
                placeholder="Numéro de téléphone"
                placeholderTextColor="#666"
                value={phoneNum}
                onChangeText={setPhoneNum}
                keyboardType="phone-pad"
              />
            </View>

            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleSendOTP}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Recevoir un code</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                setError("");
                setStep("email");
              }}
            >
              <Text style={styles.link}>
                Ou <Text style={styles.linkBold}>s'inscrire par email</Text>
              </Text>
            </TouchableOpacity>
          </>
        )}

        {/* ───── OTP STEP ───── */}
        {step === "otp" && (
          <>
            <Text style={styles.otpInfo}>
              Code envoyé au <Text style={{ color: "#fff" }}>{fullPhone}</Text>
            </Text>
            {devCode && (
              <Text style={styles.devCode}>🔑 Code dev : {devCode}</Text>
            )}

            <TextInput
              style={styles.input}
              placeholder="Code OTP"
              placeholderTextColor="#666"
              value={otp}
              onChangeText={setOtp}
              keyboardType="number-pad"
              maxLength={6}
              autoFocus
            />

            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleVerifyOTP}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Vérifier</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                setOtp("");
                setError("");
                setStep("phone");
              }}
            >
              <Text style={styles.link}>
                <Text style={styles.linkBold}>← Changer de numéro</Text>
              </Text>
            </TouchableOpacity>
          </>
        )}

        {/* ───── PROFILE STEP (after OTP verified) ───── */}
        {step === "profile" && (
          <>
            <View style={styles.verifiedBadge}>
              <Text style={styles.verifiedText}>✓ {verifiedPhone} vérifié</Text>
            </View>

            <TextInput
              style={styles.input}
              placeholder="Nom d'utilisateur"
              placeholderTextColor="#666"
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
              autoFocus
            />
            <TextInput
              style={styles.input}
              placeholder="Mot de passe"
              placeholderTextColor="#666"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />

            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handlePhoneRegister}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Créer mon compte</Text>
              )}
            </TouchableOpacity>
          </>
        )}

        {/* ───── EMAIL STEP ───── */}
        {step === "email" && (
          <>
            <TextInput
              style={styles.input}
              placeholder="Nom d'utilisateur"
              placeholderTextColor="#666"
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
            />
            <TextInput
              style={styles.input}
              placeholder="Email"
              placeholderTextColor="#666"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
            />
            <TextInput
              style={styles.input}
              placeholder="Mot de passe"
              placeholderTextColor="#666"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />

            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleEmailRegister}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>S'inscrire</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                setError("");
                setStep("phone");
              }}
            >
              <Text style={styles.link}>
                <Text style={styles.linkBold}>← Inscription par téléphone</Text>
              </Text>
            </TouchableOpacity>
          </>
        )}

        <View style={{ height: 16 }} />
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.link}>
            Déjà un compte ? <Text style={styles.linkBold}>Se connecter</Text>
          </Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Country picker modal */}
      <Modal visible={countryModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Choisir un pays</Text>
            <FlatList
              data={COUNTRIES}
              keyExtractor={(c) => c.code}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.countryItem}
                  onPress={() => {
                    setCountry(item);
                    setCountryModal(false);
                  }}
                >
                  <Text style={styles.countryItemText}>
                    {item.flag} {item.name} ({item.dial})
                  </Text>
                </TouchableOpacity>
              )}
            />
            <TouchableOpacity
              style={styles.modalClose}
              onPress={() => setCountryModal(false)}
            >
              <Text style={styles.modalCloseText}>Fermer</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0a0a0a" },
  inner: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: 32,
    paddingVertical: 40,
  },
  logo: { width: 100, height: 100, alignSelf: "center", marginBottom: 8 },
  title: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#fff",
    textAlign: "center",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: "#999",
    textAlign: "center",
    marginBottom: 32,
  },
  error: {
    color: "#ef4444",
    textAlign: "center",
    marginBottom: 16,
    fontSize: 14,
  },
  phoneRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 12,
  },
  countryBtn: {
    backgroundColor: "#1a1a1a",
    borderWidth: 1,
    borderColor: "#333",
    borderRadius: 12,
    paddingHorizontal: 14,
    justifyContent: "center",
  },
  countryText: { color: "#fff", fontSize: 16 },
  input: {
    backgroundColor: "#1a1a1a",
    borderWidth: 1,
    borderColor: "#333",
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: "#fff",
    marginBottom: 12,
  },
  button: {
    backgroundColor: "#7c3aed",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    marginTop: 8,
    marginBottom: 24,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  link: { color: "#999", textAlign: "center", fontSize: 14, marginBottom: 8 },
  linkBold: { color: "#7c3aed", fontWeight: "600" },
  otpInfo: {
    color: "#999",
    textAlign: "center",
    marginBottom: 16,
    fontSize: 14,
  },
  devCode: {
    color: "#facc15",
    textAlign: "center",
    marginBottom: 16,
    fontSize: 14,
    fontWeight: "600",
  },
  verifiedBadge: {
    backgroundColor: "#166534",
    borderRadius: 8,
    padding: 10,
    marginBottom: 16,
    alignItems: "center",
  },
  verifiedText: { color: "#4ade80", fontSize: 14, fontWeight: "600" },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#1a1a1a",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "70%",
    paddingTop: 20,
  },
  modalTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 12,
  },
  countryItem: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderBottomWidth: 1,
    borderBottomColor: "#333",
  },
  countryItemText: { color: "#fff", fontSize: 16 },
  modalClose: {
    padding: 16,
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: "#333",
  },
  modalCloseText: { color: "#7c3aed", fontSize: 16, fontWeight: "600" },
});
