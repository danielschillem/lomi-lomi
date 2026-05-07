import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { isValidOtp, isValidPhone, normalizePhone } from "@/lib/validation";
import { useTheme } from "@/lib/theme-context";

interface OMPaymentModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: (transactionId: string) => void;
  title: string;
  description: string;
  amount: number;
  initiatePayment: () => Promise<{
    payment_id: number;
    ussd_code: string;
    already_paid?: boolean;
  }>;
  confirmPayment: (
    paymentId: number,
    phone: string,
    otp: string,
  ) => Promise<{ status: string; transaction_id?: string; message?: string }>;
}

export default function OMPaymentModal({
  visible,
  onClose,
  onSuccess,
  title,
  description,
  amount,
  initiatePayment,
  confirmPayment,
}: OMPaymentModalProps) {
  const { colors } = useTheme();
  const [step, setStep] = useState<"phone" | "ussd" | "otp">("phone");
  const [phone, setPhone] = useState("");
  const [ussdCode, setUssdCode] = useState("");
  const [paymentId, setPaymentId] = useState<number | null>(null);
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function resetAndClose() {
    setStep("phone");
    setPhone("");
    setOtp("");
    setUssdCode("");
    setPaymentId(null);
    setError("");
    onClose();
  }

  async function handleInitiate() {
    const cleanPhone = normalizePhone(phone);
    if (!isValidPhone(cleanPhone)) {
      setError("Numéro invalide");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const res = await initiatePayment();
      if (res.already_paid) {
        onSuccess("");
        return;
      }
      setPaymentId(res.payment_id);
      setUssdCode(res.ussd_code);
      setStep("ussd");
    } catch (e) {
      setError((e as Error).message || "Erreur");
    }
    setLoading(false);
  }

  async function handleConfirm() {
    if (!paymentId) return;
    if (!isValidOtp(otp)) {
      setError("Code OTP invalide");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const cleanPhone = normalizePhone(phone);
      const res = await confirmPayment(paymentId, cleanPhone, otp.trim());
      if (res.status === "paid") {
        onSuccess(res.transaction_id || "");
      } else {
        setError(res.message || "Paiement échoué");
      }
    } catch (e) {
      setError((e as Error).message || "Erreur");
    }
    setLoading(false);
  }

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={[styles.container, { backgroundColor: colors.card }]}>
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
            <TouchableOpacity onPress={resetAndClose} style={[styles.closeBtn, { backgroundColor: colors.cardSecondary }]}>
              <Ionicons name="close" size={20} color={colors.textMuted} />
            </TouchableOpacity>
          </View>

          <Text style={[styles.desc, { color: colors.textMuted }]}>{description}</Text>
          <View style={styles.amountBox}>
            <Text style={styles.amountText}>{amount} FCFA</Text>
          </View>

          {error ? <Text style={[styles.error, { color: colors.error }]}>{error}</Text> : null}

          {step === "phone" && (
            <View style={styles.stepContainer}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>Numéro Orange Money</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.inputBg, color: colors.inputText }]}
                value={phone}
                onChangeText={(v) => {
                  setPhone(v);
                  if (error) setError("");
                }}
                placeholder="07XXXXXX"
                placeholderTextColor={colors.placeholder}
                keyboardType="phone-pad"
              />
              <TouchableOpacity
                style={[styles.btn, { backgroundColor: colors.orange }]}
                onPress={handleInitiate}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.btnText}>Payer {amount} FCFA</Text>
                )}
              </TouchableOpacity>
            </View>
          )}

          {step === "ussd" && (
            <View style={styles.stepContainer}>
              <View style={styles.ussdBox}>
                <Text style={styles.ussdLabel}>Composez ce code USSD :</Text>
                <Text style={styles.ussdCode}>{ussdCode}</Text>
                <Text style={styles.ussdHint}>Vous recevrez un OTP par SMS</Text>
              </View>
              <TouchableOpacity
                style={[styles.btn, { backgroundColor: colors.accent }]}
                onPress={() => setStep("otp")}
              >
                <Text style={styles.btnText}>J&apos;ai reçu mon code OTP</Text>
              </TouchableOpacity>
            </View>
          )}

          {step === "otp" && (
            <View style={styles.stepContainer}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>Code OTP reçu par SMS</Text>
              <TextInput
                style={[styles.input, styles.otpInput, { backgroundColor: colors.inputBg, color: colors.inputText }]}
                value={otp}
                onChangeText={(v) => {
                  setOtp(v);
                  if (error) setError("");
                }}
                placeholder="Code OTP"
                placeholderTextColor={colors.placeholder}
                keyboardType="number-pad"
                maxLength={10}
              />
              <TouchableOpacity
                style={[styles.btn, { backgroundColor: "#16a34a" }]}
                onPress={handleConfirm}
                disabled={loading || !otp.trim()}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.btnText}>Confirmer</Text>
                )}
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setStep("ussd")}>
                <Text style={[styles.backLink, { color: colors.textMuted }]}>← Revoir le code USSD</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  container: {
    width: "100%",
    borderRadius: 20,
    padding: 20,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  title: { fontSize: 17, fontWeight: "700" },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  desc: { fontSize: 13, marginBottom: 12 },
  amountBox: {
    backgroundColor: "#1a1200",
    borderWidth: 1,
    borderColor: "#f97316",
    borderRadius: 12,
    padding: 12,
    alignItems: "center",
    marginBottom: 12,
  },
  amountText: { color: "#f97316", fontSize: 22, fontWeight: "800" },
  error: { fontSize: 12, marginBottom: 8 },
  stepContainer: { marginTop: 4 },
  label: { fontSize: 12, fontWeight: "500", marginBottom: 6 },
  input: {
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    marginBottom: 12,
  },
  otpInput: { textAlign: "center", letterSpacing: 4, fontFamily: "monospace" },
  btn: {
    borderRadius: 12,
    padding: 14,
    alignItems: "center",
    marginBottom: 8,
  },
  btnText: { color: "#fff", fontSize: 15, fontWeight: "700" },
  ussdBox: {
    backgroundColor: "#1a1200",
    borderWidth: 1,
    borderColor: "#f97316",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    marginBottom: 12,
  },
  ussdLabel: { color: "#f97316", fontSize: 12, fontWeight: "500", marginBottom: 6 },
  ussdCode: { color: "#f97316", fontSize: 20, fontWeight: "800", fontFamily: "monospace" },
  ussdHint: { color: "#f97316", fontSize: 11, marginTop: 6, opacity: 0.7 },
  backLink: { fontSize: 12, textAlign: "center", marginTop: 4 },
});
