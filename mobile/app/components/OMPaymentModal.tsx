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
    const cleanPhone = phone.replace(/\s/g, "");
    if (!cleanPhone || cleanPhone.replace(/\+/g, "").length < 8) {
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
    if (!paymentId || !otp.trim()) return;
    setError("");
    setLoading(true);
    try {
      const cleanPhone = phone.replace(/\s/g, "");
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
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>{title}</Text>
            <TouchableOpacity onPress={resetAndClose} style={styles.closeBtn}>
              <Ionicons name="close" size={20} color="#666" />
            </TouchableOpacity>
          </View>

          {/* Description */}
          <Text style={styles.desc}>{description}</Text>
          <View style={styles.amountBox}>
            <Text style={styles.amountText}>{amount} FCFA</Text>
          </View>

          {/* Error */}
          {error ? <Text style={styles.error}>{error}</Text> : null}

          {/* Step: Phone */}
          {step === "phone" && (
            <View style={styles.stepContainer}>
              <Text style={styles.label}>Numéro Orange Money</Text>
              <TextInput
                style={styles.input}
                value={phone}
                onChangeText={setPhone}
                placeholder="07XXXXXX"
                placeholderTextColor="#666"
                keyboardType="phone-pad"
              />
              <TouchableOpacity
                style={[styles.btn, styles.btnOrange]}
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

          {/* Step: USSD */}
          {step === "ussd" && (
            <View style={styles.stepContainer}>
              <View style={styles.ussdBox}>
                <Text style={styles.ussdLabel}>Composez ce code USSD :</Text>
                <Text style={styles.ussdCode}>{ussdCode}</Text>
                <Text style={styles.ussdHint}>
                  Vous recevrez un OTP par SMS
                </Text>
              </View>
              <TouchableOpacity
                style={[styles.btn, styles.btnViolet]}
                onPress={() => setStep("otp")}
              >
                <Text style={styles.btnText}>J&apos;ai reçu mon code OTP</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Step: OTP */}
          {step === "otp" && (
            <View style={styles.stepContainer}>
              <Text style={styles.label}>Code OTP reçu par SMS</Text>
              <TextInput
                style={[styles.input, styles.otpInput]}
                value={otp}
                onChangeText={setOtp}
                placeholder="Code OTP"
                placeholderTextColor="#666"
                keyboardType="number-pad"
                maxLength={10}
              />
              <TouchableOpacity
                style={[styles.btn, styles.btnGreen]}
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
                <Text style={styles.backLink}>← Revoir le code USSD</Text>
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
    backgroundColor: "#111",
    borderRadius: 20,
    padding: 20,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  title: { color: "#fff", fontSize: 17, fontWeight: "700" },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#222",
    justifyContent: "center",
    alignItems: "center",
  },
  desc: { color: "#999", fontSize: 13, marginBottom: 12 },
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
  error: { color: "#ef4444", fontSize: 12, marginBottom: 8 },
  stepContainer: { marginTop: 4 },
  label: { color: "#aaa", fontSize: 12, fontWeight: "500", marginBottom: 6 },
  input: {
    backgroundColor: "#1a1a1a",
    borderRadius: 12,
    padding: 14,
    color: "#fff",
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
  btnOrange: { backgroundColor: "#f97316" },
  btnViolet: { backgroundColor: "#7c3aed" },
  btnGreen: { backgroundColor: "#16a34a" },
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
  ussdLabel: {
    color: "#f97316",
    fontSize: 12,
    fontWeight: "500",
    marginBottom: 6,
  },
  ussdCode: {
    color: "#f97316",
    fontSize: 20,
    fontWeight: "800",
    fontFamily: "monospace",
  },
  ussdHint: { color: "#f97316", fontSize: 11, marginTop: 6, opacity: 0.7 },
  backLink: { color: "#666", fontSize: 12, textAlign: "center", marginTop: 4 },
});
