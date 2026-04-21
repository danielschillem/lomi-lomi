"use client";

import { useState, useEffect, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Eye,
  EyeOff,
  LogIn,
  ArrowLeft,
  Phone,
  Mail,
  ArrowRight,
} from "lucide-react";
import { login, sendOTP, verifyOTP } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import {
  COUNTRIES,
  detectCountry,
  type CountryEntry,
} from "@/lib/phone-country";

type Step = "choose" | "phone" | "otp" | "email";

export default function LoginPage() {
  const router = useRouter();
  const { setSession } = useAuth();

  const [step, setStep] = useState<Step>("choose");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Phone flow
  const [country, setCountry] = useState<CountryEntry>(
    COUNTRIES.find((c) => c.code === "FR")!,
  );
  const [phoneLocal, setPhoneLocal] = useState("");
  const phone = country.dial + phoneLocal.replace(/\s/g, "");
  const [otpCode, setOtpCode] = useState("");
  const [cooldown, setCooldown] = useState(0);
  const [showCountries, setShowCountries] = useState(false);
  const [devCode, setDevCode] = useState("");

  useEffect(() => {
    detectCountry().then(setCountry);
  }, []);

  // Email flow
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);

  function startCooldown() {
    setCooldown(60);
    const interval = setInterval(() => {
      setCooldown((c) => {
        if (c <= 1) {
          clearInterval(interval);
          return 0;
        }
        return c - 1;
      });
    }, 1000);
  }

  async function handleSendOTP(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await sendOTP(phone.trim());
      if (res.dev_code) setDevCode(res.dev_code);
      setStep("otp");
      startCooldown();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erreur");
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyOTP(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await verifyOTP(phone.trim(), otpCode.trim());
      if (res.action === "login" && res.token && res.user) {
        setSession(res.token, res.user);
        router.push(
          res.user.role === "admin" || res.user.role === "owner"
            ? "/dashboard"
            : "/profile",
        );
      } else {
        // No account yet → redirect to register
        router.push("/register");
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Code invalide");
    } finally {
      setLoading(false);
    }
  }

  async function handleEmailLogin(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await login({ email, password });
      setSession(res.token, res.user);
      router.push(
        res.user.role === "admin" || res.user.role === "owner"
          ? "/dashboard"
          : "/profile",
      );
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Email ou mot de passe incorrect",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12">
      <div className="absolute inset-0 bg-linear-to-br from-violet-950/30 via-zinc-950 to-pink-950/20" />

      <div className="relative w-full max-w-md">
        <button
          onClick={() => {
            if (step === "choose") router.push("/");
            else if (step === "otp") setStep("phone");
            else setStep("choose");
            setError("");
          }}
          className="inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-white transition mb-8"
        >
          <ArrowLeft className="w-4 h-4" />
          Retour
        </button>

        <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-8">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-violet-500/10 border border-violet-500/20 mb-4">
              <LogIn className="w-7 h-7 text-violet-400" />
            </div>
            <h1 className="text-2xl font-bold">
              {step === "choose" && "Connexion"}
              {step === "phone" && "Votre numéro"}
              {step === "otp" && "Vérification"}
              {step === "email" && "Connexion par email"}
            </h1>
            <p className="text-zinc-400 text-sm mt-1">
              {step === "choose" && "Retrouvez votre espace privé"}
              {step === "phone" && "Recevez un code de connexion par SMS"}
              {step === "otp" && `Code envoyé au ${phone}`}
              {step === "otp" && devCode && (
                <span className="block mt-1 text-emerald-400 font-mono text-base">
                  Code dev : {devCode}
                </span>
              )}
              {step === "email" && "Connectez-vous avec votre email"}
            </p>
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-lg px-4 py-3 mb-6">
              {error}
            </div>
          )}

          {/* Choose method */}
          {step === "choose" && (
            <div className="space-y-3">
              <button
                onClick={() => setStep("phone")}
                className="w-full flex items-center gap-4 bg-violet-600 hover:bg-violet-700 text-white font-semibold py-4 px-5 rounded-xl transition"
              >
                <Phone className="w-5 h-5" />
                <div className="text-left flex-1">
                  <p className="text-sm font-semibold">Numéro de téléphone</p>
                  <p className="text-xs text-violet-200/70">
                    Connexion rapide par code SMS
                  </p>
                </div>
                <ArrowRight className="w-4 h-4" />
              </button>
              <button
                onClick={() => setStep("email")}
                className="w-full flex items-center gap-4 bg-zinc-800 hover:bg-zinc-700 text-white font-semibold py-4 px-5 rounded-xl transition border border-zinc-700"
              >
                <Mail className="w-5 h-5 text-zinc-400" />
                <div className="text-left flex-1">
                  <p className="text-sm font-semibold">Email</p>
                  <p className="text-xs text-zinc-400">Avec mot de passe</p>
                </div>
                <ArrowRight className="w-4 h-4 text-zinc-500" />
              </button>
            </div>
          )}

          {/* Phone input */}
          {step === "phone" && (
            <form onSubmit={handleSendOTP} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-1.5">
                  Numéro de téléphone
                </label>
                <div className="flex gap-2">
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setShowCountries(!showCountries)}
                      className="flex items-center gap-1.5 bg-zinc-800/50 border border-zinc-700 rounded-lg px-3 py-3 text-sm text-white hover:border-violet-500 transition whitespace-nowrap"
                    >
                      <span>{country.flag}</span>
                      <span className="text-zinc-400">{country.dial}</span>
                      <svg
                        className="w-3 h-3 text-zinc-500"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 9l-7 7-7-7"
                        />
                      </svg>
                    </button>
                    {showCountries && (
                      <div className="absolute top-full left-0 mt-1 w-64 max-h-60 overflow-y-auto bg-zinc-800 border border-zinc-700 rounded-lg shadow-xl z-50">
                        {COUNTRIES.map((c) => (
                          <button
                            key={c.code}
                            type="button"
                            onClick={() => {
                              setCountry(c);
                              setShowCountries(false);
                            }}
                            className={`w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-zinc-700 transition text-left ${
                              c.code === country.code
                                ? "bg-violet-500/10 text-violet-300"
                                : "text-white"
                            }`}
                          >
                            <span>{c.flag}</span>
                            <span className="flex-1 truncate">{c.name}</span>
                            <span className="text-zinc-400 text-xs">
                              {c.dial}
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <input
                    type="tel"
                    value={phoneLocal}
                    onChange={(e) =>
                      setPhoneLocal(e.target.value.replace(/[^\d\s]/g, ""))
                    }
                    required
                    placeholder="6 12 34 56 78"
                    className="flex-1 bg-zinc-800/50 border border-zinc-700 rounded-lg px-4 py-3 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-violet-500 transition"
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white font-semibold py-3 rounded-lg transition"
              >
                {loading ? "Envoi..." : "Recevoir le code SMS"}
              </button>
            </form>
          )}

          {/* OTP verification */}
          {step === "otp" && (
            <form onSubmit={handleVerifyOTP} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-1.5">
                  Code de vérification
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={otpCode}
                  onChange={(e) =>
                    setOtpCode(e.target.value.replace(/\D/g, "").slice(0, 6))
                  }
                  required
                  maxLength={6}
                  placeholder="000000"
                  className="w-full bg-zinc-800/50 border border-zinc-700 rounded-lg px-4 py-3 text-center text-2xl tracking-[0.5em] text-white placeholder:text-zinc-600 focus:outline-none focus:border-violet-500 transition font-mono"
                  autoFocus
                />
              </div>
              <button
                type="submit"
                disabled={loading || otpCode.length !== 6}
                className="w-full bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white font-semibold py-3 rounded-lg transition"
              >
                {loading ? "Vérification..." : "Se connecter"}
              </button>
              <button
                type="button"
                disabled={cooldown > 0 || loading}
                onClick={async () => {
                  try {
                    await sendOTP(phone.trim());
                    startCooldown();
                  } catch {
                    /* ignore */
                  }
                }}
                className="w-full text-sm text-zinc-400 hover:text-white disabled:text-zinc-600 transition"
              >
                {cooldown > 0
                  ? `Renvoyer dans ${cooldown}s`
                  : "Renvoyer le code"}
              </button>
            </form>
          )}

          {/* Email login */}
          {step === "email" && (
            <form onSubmit={handleEmailLogin} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-1.5">
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="votre@email.com"
                  className="w-full bg-zinc-800/50 border border-zinc-700 rounded-lg px-4 py-3 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-violet-500 transition"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-1.5">
                  Mot de passe
                </label>
                <div className="relative">
                  <input
                    type={showPwd ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    placeholder="Votre mot de passe"
                    className="w-full bg-zinc-800/50 border border-zinc-700 rounded-lg px-4 py-3 pr-12 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-violet-500 transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPwd(!showPwd)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white transition"
                  >
                    {showPwd ? (
                      <EyeOff className="w-5 h-5" />
                    ) : (
                      <Eye className="w-5 h-5" />
                    )}
                  </button>
                </div>
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white font-semibold py-3 rounded-lg transition"
              >
                {loading ? "Connexion..." : "Se connecter"}
              </button>
            </form>
          )}

          {step === "choose" && (
            <p className="text-zinc-500 text-sm text-center mt-6">
              Pas encore de compte ?{" "}
              <Link
                href="/register"
                className="text-violet-400 hover:text-violet-300 transition"
              >
                S&apos;inscrire gratuitement
              </Link>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
