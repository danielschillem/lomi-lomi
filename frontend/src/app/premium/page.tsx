"use client";

import { useState, useEffect } from "react";
import {
  getPremiumPlans,
  getMySubscription,
  subscribePremium,
  cancelSubscription,
} from "@/lib/api";
import { Star, Check, Crown, X } from "lucide-react";

type Plan = {
  id: string;
  name: string;
  price: number;
  duration_days: number;
  features: string[];
};

export default function PremiumPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [subscription, setSubscription] = useState<{
    is_premium: boolean;
    plan?: string;
    ends_at?: string;
  } | null>(null);
  const [selected, setSelected] = useState("monthly");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    getPremiumPlans().then((res) => setPlans(res.plans ?? []));
    getMySubscription()
      .then(setSubscription)
      .catch(() => null);
  }, []);

  async function handleSubscribe() {
    if (!phone) {
      setError("Entrez votre numéro Orange Money");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await subscribePremium({ plan: selected, phone });
      setMessage(
        "Abonnement activé jusqu'au " +
          new Date(res.ends_at).toLocaleDateString("fr-BF"),
      );
      getMySubscription().then(setSubscription);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erreur de paiement");
    } finally {
      setLoading(false);
    }
  }

  async function handleCancel() {
    if (!confirm("Annuler votre abonnement ?")) return;
    setLoading(true);
    try {
      await cancelSubscription();
      setMessage("Abonnement annulé.");
      getMySubscription().then(setSubscription);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erreur");
    } finally {
      setLoading(false);
    }
  }

  const selectedPlan = plans.find((p) => p.id === selected);

  return (
    <div className="min-h-screen bg-gray-950 text-white pb-16">
      {/* Header */}
      <div className="bg-linear-to-br from-blue-900 to-blue-800 px-4 pt-12 pb-16 text-center">
        <div className="flex justify-center mb-4">
          <div className="w-16 h-16 rounded-full bg-yellow-400/20 flex items-center justify-center">
            <Crown className="w-8 h-8 text-yellow-400" />
          </div>
        </div>
        <h1 className="text-2xl font-bold mb-2">TexMe Premium</h1>
        <p className="text-white/70 text-sm max-w-xs mx-auto">
          Débloquez toutes les fonctionnalités et multipliez vos chances de
          rencontres
        </p>
      </div>

      <div className="max-w-lg mx-auto px-4 -mt-8">
        {/* Active subscription banner */}
        {subscription?.is_premium && (
          <div className="bg-green-500/10 border border-green-500/30 rounded-2xl p-4 mb-6 flex items-center gap-3">
            <Check className="w-5 h-5 text-green-400 flex-shrink-0" />
            <div>
              <p className="text-green-400 font-medium text-sm">
                Abonnement actif
              </p>
              <p className="text-gray-400 text-xs">
                Plan {subscription.plan} · Expire le{" "}
                {subscription.ends_at
                  ? new Date(subscription.ends_at).toLocaleDateString("fr-BF")
                  : "-"}
              </p>
            </div>
            <button
              onClick={handleCancel}
              title="Annuler l'abonnement"
              className="ml-auto text-gray-500 hover:text-red-400"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Plans */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          {plans.map((plan) => (
            <button
              key={plan.id}
              onClick={() => setSelected(plan.id)}
              className={`rounded-2xl p-4 border-2 text-left transition-all ${selected === plan.id ? "border-blue-500 bg-blue-500/10" : "border-gray-700 bg-gray-900"}`}
            >
              {plan.id === "yearly" && (
                <span className="text-xs bg-yellow-500 text-black font-bold px-2 py-0.5 rounded-full mb-2 inline-block">
                  -38%
                </span>
              )}
              <p className="font-bold text-lg">
                {plan.price.toLocaleString()} FCFA
              </p>
              <p className="text-gray-400 text-xs">
                par {plan.id === "monthly" ? "mois" : "an"}
              </p>
              <p className="text-blue-300 text-sm font-medium mt-1">
                {plan.name}
              </p>
            </button>
          ))}
        </div>

        {/* Features */}
        {selectedPlan && (
          <div className="bg-gray-900 rounded-2xl p-5 mb-6">
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <Star className="w-4 h-4 text-yellow-400" />
              Ce que vous obtenez
            </h3>
            <ul className="space-y-2">
              {selectedPlan.features.map((f) => (
                <li
                  key={f}
                  className="flex items-center gap-2 text-sm text-gray-300"
                >
                  <Check className="w-4 h-4 text-green-400 shrink-0" />
                  {f}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Payment */}
        {!subscription?.is_premium && (
          <div className="bg-gray-900 rounded-2xl p-5 space-y-4">
            <h3 className="font-semibold">Paiement via Orange Money</h3>
            {message && <p className="text-green-400 text-sm">{message}</p>}
            {error && <p className="text-red-400 text-sm">{error}</p>}
            <div>
              <label className="block text-gray-400 text-sm mb-1">
                Numéro Orange Money (+226)
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="07XXXXXXXX"
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
              />
            </div>
            <button
              onClick={handleSubscribe}
              disabled={loading}
              className="w-full bg-linear-to-r from-blue-600 to-blue-600 text-white font-bold py-4 rounded-2xl hover:opacity-90 transition disabled:opacity-50"
            >
              {loading
                ? "Traitement..."
                : `Payer ${selectedPlan?.price.toLocaleString()} FCFA`}
            </button>
            <p className="text-gray-500 text-xs text-center">
              Paiement sécurisé · Annulable à tout moment
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
