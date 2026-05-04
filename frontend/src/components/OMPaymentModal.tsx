"use client";

import { useState } from "react";
import { Phone, Loader2, Check, AlertCircle, X } from "lucide-react";

interface OMPaymentModalProps {
  open: boolean;
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
  open,
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
  const [phoneError, setPhoneError] = useState("");
  const [ussdCode, setUssdCode] = useState("");
  const [paymentId, setPaymentId] = useState<number | null>(null);
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (!open) return null;

  async function handleInitiate() {
    const cleanPhone = phone.replace(/\s/g, "");
    if (!cleanPhone || cleanPhone.replace(/\+/g, "").length < 8) {
      setPhoneError("Numéro invalide");
      return;
    }
    setPhoneError("");
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

  function handleClose() {
    setStep("phone");
    setPhone("");
    setOtp("");
    setUssdCode("");
    setPaymentId(null);
    setError("");
    setPhoneError("");
    onClose();
  }

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={handleClose}
      />
      <div className="relative w-full max-w-sm bg-white rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h3 className="text-base font-bold text-gray-900">{title}</h3>
          <button
            onClick={handleClose}
            title="Fermer"
            className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center"
          >
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        <div className="px-5 py-5 space-y-4">
          {/* Description */}
          <p className="text-sm text-gray-500">{description}</p>
          <div className="bg-orange-50 border border-orange-200 rounded-xl px-4 py-3 text-center">
            <span className="text-2xl font-bold text-orange-600">
              {amount} FCFA
            </span>
          </div>

          {/* Error */}
          {error && (
            <p className="text-red-500 text-xs flex items-center gap-1">
              <AlertCircle className="w-3 h-3" /> {error}
            </p>
          )}

          {/* Step: Phone */}
          {step === "phone" && (
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1.5 block">
                  Numéro Orange Money
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => {
                      setPhone(e.target.value);
                      setPhoneError("");
                    }}
                    placeholder="07XXXXXX"
                    className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-400/50 focus:border-orange-400 transition"
                  />
                </div>
                {phoneError && (
                  <p className="text-red-500 text-xs mt-1">{phoneError}</p>
                )}
              </div>
              <button
                onClick={handleInitiate}
                disabled={loading}
                className="w-full bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-bold py-3 rounded-xl transition text-sm flex items-center justify-center gap-2"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Phone className="w-4 h-4" />
                )}
                {loading ? "Chargement..." : `Payer ${amount} FCFA`}
              </button>
            </div>
          )}

          {/* Step: USSD */}
          {step === "ussd" && (
            <div className="space-y-3">
              <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 text-center">
                <p className="text-xs text-orange-700 font-medium mb-2">
                  Composez ce code USSD :
                </p>
                <p className="text-xl font-bold text-orange-600 font-mono tracking-wide">
                  {ussdCode}
                </p>
                <p className="text-xs text-orange-500/70 mt-2">
                  Vous recevrez un OTP par SMS
                </p>
              </div>
              <button
                onClick={() => setStep("otp")}
                className="w-full bg-violet-600 hover:bg-violet-700 text-white font-bold py-3 rounded-xl transition text-sm"
              >
                J&apos;ai reçu mon code OTP
              </button>
            </div>
          )}

          {/* Step: OTP */}
          {step === "otp" && (
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1.5 block">
                  Code OTP reçu par SMS
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  placeholder="Code OTP"
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-green-400/50 focus:border-green-400 transition text-center tracking-widest font-mono"
                  maxLength={10}
                />
              </div>
              <button
                onClick={handleConfirm}
                disabled={loading || !otp.trim()}
                className="w-full bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-bold py-3 rounded-xl transition text-sm flex items-center justify-center gap-2"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Check className="w-4 h-4" />
                )}
                {loading ? "Vérification..." : "Confirmer"}
              </button>
              <button
                onClick={() => setStep("ussd")}
                className="w-full text-gray-400 hover:text-gray-600 text-xs py-1 transition"
              >
                ← Revoir le code USSD
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
