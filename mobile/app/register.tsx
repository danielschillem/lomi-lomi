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
import { useTheme } from "@/lib/theme-context";
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
  const { colors } = useTheme();

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
        await loginWithToken(res.token, res.user);
        router.replace("/(tabs)/discover");
      } else {
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
      router.replace("/onboarding");
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
      router.replace("/onboarding");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Erreur d'inscription");
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
        <Text style={s.title}>Créer un compte</Text>
        <Text style={s.subtitle}>
          {step === "otp"
            ? "Saisis le code reçu"
            : step === "profile"
              ? "Choisis ton pseudo"
              : step === "email"
                ? "Inscription par email"
                : "Rejoins Texto"}
        </Text>

        {error ? <Text style={s.error}>{error}</Text> : null}

        {/* - PHONE STEP - */}
        {step === "phone" && (
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
                value={phoneNum}
                onChangeText={setPhoneNum}
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
                setStep("email");
              }}
            >
              <Text style={s.link}>
                Ou <Text style={s.linkBold}>s&apos;inscrire par email</Text>
              </Text>
            </TouchableOpacity>
          </>
        )}

        {/* - OTP STEP - */}
        {step === "otp" && (
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
                setStep("phone");
              }}
            >
              <Text style={s.link}>
                <Text style={s.linkBold}>← Changer de numéro</Text>
              </Text>
            </TouchableOpacity>
          </>
        )}

        {/* - PROFILE STEP (after OTP verified) - */}
        {step === "profile" && (
          <>
            <View style={s.verifiedBadge}>
              <Text style={s.verifiedText}> {verifiedPhone} vérifié</Text>
            </View>

            <TextInput
              style={s.input}
              placeholder="Nom d'utilisateur"
              placeholderTextColor={colors.placeholder}
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
              autoFocus
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
              onPress={handlePhoneRegister}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={s.buttonText}>Créer mon compte</Text>
              )}
            </TouchableOpacity>
          </>
        )}

        {/* - EMAIL STEP - */}
        {step === "email" && (
          <>
            <TextInput
              style={s.input}
              placeholder="Nom d'utilisateur"
              placeholderTextColor={colors.placeholder}
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
            />
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
              onPress={handleEmailRegister}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={s.buttonText}>S&apos;inscrire</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                setError("");
                setStep("phone");
              }}
            >
              <Text style={s.link}>
                <Text style={s.linkBold}>← Inscription par téléphone</Text>
              </Text>
            </TouchableOpacity>
          </>
        )}

        <View style={{ height: 16 }} />
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={s.link}>
            Déjà un compte ? <Text style={s.linkBold}>Se connecter</Text>
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
