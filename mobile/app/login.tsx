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
import { router } from "expo-router";
import { useAuth } from "@/lib/auth-context";
import { useTheme } from "@/lib/theme-context";
import { sendOTP, verifyOTP, setToken } from "@/lib/api";
import {
  COUNTRIES,
  detectCountry,
  type CountryEntry,
} from "@/lib/phone-country";

type Mode = "phone" | "otp" | "email";

export default function LoginScreen() {
  const { login, loginWithToken } = useAuth();
  const { colors } = useTheme();

  const [mode, setMode] = useState<Mode>("phone");

  // Phone + OTP
  const [country, setCountry] = useState<CountryEntry>(COUNTRIES[10]); // FR
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [devCode, setDevCode] = useState<string | null>(null);

  // Email
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [countryModal, setCountryModal] = useState(false);

  useEffect(() => {
    detectCountry()
      .then(setCountry)
      .catch(() => {});
  }, []);

  const fullPhone = `${country.dial}${phone.replace(/^0+/, "")}`;

  const handleSendOTP = async () => {
    if (!phone || phone.length < 6) {
      setError("Numéro invalide");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await sendOTP(fullPhone);
      if (res.dev_code) setDevCode(res.dev_code);
      setMode("otp");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Erreur d'envoi du code");
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
        await loginWithToken(res.token, res.user);
        router.replace("/(tabs)/messages");
      } else if (res.action === "register") {
        router.replace({
          pathname: "/register",
          params: { phone: fullPhone, phone_verified: "true" },
        });
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Code invalide");
    }
    setLoading(false);
  };

  const handleEmailLogin = async () => {
    if (!email || !password) {
      setError("Remplis tous les champs");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await login(email.trim().toLowerCase(), password);
      router.replace("/(tabs)/messages");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Erreur de connexion");
    }
    setLoading(false);
  };

  const s = makeStyles(colors);

  return (
    <KeyboardAvoidingView
      style={s.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        contentContainerStyle={s.inner}
        keyboardShouldPersistTaps="handled"
      >
        <Image
          source={require("@/assets/logo.png")}
          style={s.logo}
          resizeMode="contain"
        />
        <Text style={s.title}>Texto</Text>
        <Text style={s.subtitle}>
          {mode === "email"
            ? "Connexion par email"
            : mode === "otp"
              ? "Saisis le code reçu"
              : "Connecte-toi avec ton numéro"}
        </Text>

        {error ? <Text style={s.error}>{error}</Text> : null}

        {/* - PHONE MODE - */}
        {mode === "phone" && (
          <>
            <View style={s.phoneRow}>
              <TouchableOpacity
                style={s.countryBtn}
                onPress={() => setCountryModal(true)}
              >
                <Text style={s.countryText}>
                  {country.flag} {country.dial}
                </Text>
              </TouchableOpacity>
              <TextInput
                style={[s.input, { flex: 1 }]}
                placeholder="Numéro de téléphone"
                placeholderTextColor={colors.placeholder}
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
              />
            </View>

            <TouchableOpacity
              style={[s.button, loading && s.buttonDisabled]}
              onPress={handleSendOTP}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={s.buttonText}>Recevoir un code</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                setError("");
                setMode("email");
              }}
            >
              <Text style={s.link}>
                Ou <Text style={s.linkBold}>se connecter par email</Text>
              </Text>
            </TouchableOpacity>
          </>
        )}

        {/* - OTP MODE - */}
        {mode === "otp" && (
          <>
            <Text style={s.otpInfo}>
              Code envoyé au{" "}
              <Text style={{ color: colors.text }}>{fullPhone}</Text>
            </Text>
            {devCode && (
              <Text style={s.devCode}> Code dev : {devCode}</Text>
            )}

            <TextInput
              style={s.input}
              placeholder="Code OTP"
              placeholderTextColor={colors.placeholder}
              value={otp}
              onChangeText={setOtp}
              keyboardType="number-pad"
              maxLength={6}
              autoFocus
            />

            <TouchableOpacity
              style={[s.button, loading && s.buttonDisabled]}
              onPress={handleVerifyOTP}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={s.buttonText}>Vérifier</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                setOtp("");
                setError("");
                setMode("phone");
              }}
            >
              <Text style={s.link}>
                <Text style={s.linkBold}>← Changer de numéro</Text>
              </Text>
            </TouchableOpacity>
          </>
        )}

        {/* - EMAIL MODE - */}
        {mode === "email" && (
          <>
            <TextInput
              style={s.input}
              placeholder="Email"
              placeholderTextColor={colors.placeholder}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
            />
            <TextInput
              style={s.input}
              placeholder="Mot de passe"
              placeholderTextColor={colors.placeholder}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />

            <TouchableOpacity
              style={[s.button, loading && s.buttonDisabled]}
              onPress={handleEmailLogin}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={s.buttonText}>Se connecter</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => router.push("/forgot-password")}
            >
              <Text style={s.link}>
                <Text style={s.linkBold}>Mot de passe oublié ?</Text>
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                setError("");
                setMode("phone");
              }}
            >
              <Text style={s.link}>
                <Text style={s.linkBold}>← Connexion par téléphone</Text>
              </Text>
            </TouchableOpacity>
          </>
        )}

        <View style={{ height: 16 }} />
        <TouchableOpacity onPress={() => router.push("/register")}>
          <Text style={s.link}>
            Pas encore de compte ?{" "}
            <Text style={s.linkBold}>Créer un compte</Text>
          </Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Country picker modal */}
      <Modal visible={countryModal} animationType="slide" transparent>
        <View style={s.modalOverlay}>
          <View style={s.modalContent}>
            <Text style={s.modalTitle}>Choisir un pays</Text>
            <FlatList
              data={COUNTRIES}
              keyExtractor={(c) => c.code}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={s.countryItem}
                  onPress={() => {
                    setCountry(item);
                    setCountryModal(false);
                  }}
                >
                  <Text style={s.countryItemText}>
                    {item.flag} {item.name} ({item.dial})
                  </Text>
                </TouchableOpacity>
              )}
            />
            <TouchableOpacity
              style={s.modalClose}
              onPress={() => setCountryModal(false)}
            >
              <Text style={s.modalCloseText}>Fermer</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

function makeStyles(colors: ReturnType<typeof import("@/lib/theme-context").useTheme>["colors"]) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
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
      color: colors.text,
      textAlign: "center",
      marginBottom: 4,
    },
    subtitle: {
      fontSize: 16,
      color: colors.textSecondary,
      textAlign: "center",
      marginBottom: 32,
    },
    error: {
      color: colors.error,
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
      backgroundColor: colors.inputBg,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      paddingHorizontal: 14,
      justifyContent: "center",
    },
    countryText: { color: colors.text, fontSize: 16 },
    input: {
      backgroundColor: colors.inputBg,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      padding: 16,
      fontSize: 16,
      color: colors.inputText,
      marginBottom: 12,
    },
    button: {
      backgroundColor: colors.accent,
      borderRadius: 12,
      padding: 16,
      alignItems: "center",
      marginTop: 8,
      marginBottom: 24,
    },
    buttonDisabled: { opacity: 0.6 },
    buttonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
    link: { color: colors.textSecondary, textAlign: "center", fontSize: 14, marginBottom: 8 },
    linkBold: { color: colors.accent, fontWeight: "600" },
    otpInfo: {
      color: colors.textSecondary,
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
    modalOverlay: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.5)",
      justifyContent: "flex-end",
    },
    modalContent: {
      backgroundColor: colors.card,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      maxHeight: "70%",
      paddingTop: 20,
    },
    modalTitle: {
      color: colors.text,
      fontSize: 18,
      fontWeight: "bold",
      textAlign: "center",
      marginBottom: 12,
    },
    countryItem: {
      paddingVertical: 14,
      paddingHorizontal: 24,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    countryItemText: { color: colors.text, fontSize: 16 },
    modalClose: {
      padding: 16,
      alignItems: "center",
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    modalCloseText: { color: colors.accent, fontSize: 16, fontWeight: "600" },
  });
}
