"use client";

import { useState } from "react";
import Link from "next/link";
import { forgotPassword } from "@/lib/api";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [devToken, setDevToken] = useState<string | null>(null);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await forgotPassword(email);
      setSent(true);
      if (res.dev_token) setDevToken(res.dev_token);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erreur");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-purple-900 via-purple-800 to-pink-800 flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-white/10 backdrop-blur-md rounded-2xl p-8 shadow-2xl">
        <h1 className="text-2xl font-bold text-white mb-2 text-center">
          Mot de passe oublié
        </h1>
        <p className="text-white/70 text-sm text-center mb-6">
          Entrez votre adresse e-mail pour recevoir un lien de réinitialisation.
        </p>

        {sent ? (
          <div className="text-center space-y-4">
            <div className="text-green-400 text-5xl mb-4"></div>
            <p className="text-white">
              Si un compte existe avec cette adresse, vous recevrez un e-mail
              sous peu.
            </p>
            {devToken && (
              <div className="bg-yellow-500/20 border border-yellow-400 rounded-lg p-3 text-xs text-yellow-300 break-all">
                <p className="font-bold mb-1">Dev mode - token :</p>
                <p>{devToken}</p>
                <Link
                  href={`/reset-password?token=${devToken}`}
                  className="underline mt-2 block"
                >
                  Utiliser ce token →
                </Link>
              </div>
            )}
            <Link
              href="/login"
              className="text-purple-300 hover:text-white text-sm underline"
            >
              Retour à la connexion
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-red-500/20 border border-red-400 text-red-300 rounded-lg px-4 py-2 text-sm">
                {error}
              </div>
            )}
            <div>
              <label className="block text-white/80 text-sm mb-1">
                Adresse e-mail
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-white/40 focus:outline-none focus:border-purple-400"
                placeholder="vous@exemple.com"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-linear-to-r from-purple-600 to-pink-600 text-white font-semibold py-3 rounded-xl hover:opacity-90 transition disabled:opacity-50"
            >
              {loading ? "Envoi..." : "Envoyer le lien"}
            </button>
            <div className="text-center">
              <Link
                href="/login"
                className="text-white/60 hover:text-white text-sm"
              >
                Retour à la connexion
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
