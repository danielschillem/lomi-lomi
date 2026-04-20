"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  Shield,
  Scale,
} from "lucide-react";

const faqs = [
  {
    q: "Comment fonctionne Lomi Lomi ?",
    a: "Créez un profil, explorez des profils compatibles avec vos préférences, likez ceux qui vous plaisent. Si l'intérêt est mutuel, c'est un match ! Vous pouvez alors discuter via notre messagerie chiffrée.",
  },
  {
    q: "Mes données sont-elles protégées ?",
    a: "Oui. Vos messages sont chiffrés de bout en bout. Votre email n'est jamais visible par les autres utilisateurs. Nous ne vendons aucune donnée à des tiers.",
  },
  {
    q: "Comment supprimer mon compte ?",
    a: "Rendez-vous dans Paramètres > Zone dangereuse > Supprimer mon compte. Confirmez avec votre mot de passe. La suppression est définitive.",
  },
  {
    q: "Le service est-il gratuit ?",
    a: "L'inscription, la découverte, le matching et la messagerie sont 100% gratuits. La boutique propose des articles optionnels.",
  },
  {
    q: "Comment signaler un comportement abusif ?",
    a: "Sur chaque profil, cliquez sur le drapeau pour signaler un comportement inapproprié. Notre équipe de modération traite chaque signalement sous 24h.",
  },
  {
    q: "Comment bloquer un utilisateur ?",
    a: "Depuis la page Découverte ou le profil d'un utilisateur, utilisez l'option Bloquer. L'utilisateur bloqué ne pourra plus vous contacter ni voir votre profil.",
  },
  {
    q: "Qu'est-ce qu'un profil vérifié ?",
    a: "Un profil vérifié a confirmé son adresse email. Le badge apparaît sur son profil pour renforcer la confiance.",
  },
  {
    q: "Comment contacter le support ?",
    a: "Envoyez un email à support@lomilomi.fr. Nous répondons sous 48h ouvrées.",
  },
];

export default function FaqPage() {
  const [open, setOpen] = useState<number | null>(null);

  return (
    <div className="min-h-screen px-4 py-12 pb-24">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-white transition"
          >
            <ArrowLeft className="w-4 h-4" />
            Accueil
          </Link>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <HelpCircle className="w-5 h-5 text-violet-400" />
            Aide & Légal
          </h1>
          <div className="w-16" />
        </div>

        {/* FAQ */}
        <section className="mb-10">
          <h2 className="text-lg font-semibold mb-4">Questions fréquentes</h2>
          <div className="space-y-2">
            {faqs.map((faq, i) => (
              <div
                key={i}
                className="bg-zinc-900/60 border border-zinc-800 rounded-xl overflow-hidden"
              >
                <button
                  onClick={() => setOpen(open === i ? null : i)}
                  className="w-full flex items-center justify-between px-5 py-4 text-left"
                >
                  <span className="text-sm font-medium pr-4">{faq.q}</span>
                  {open === i ? (
                    <ChevronUp className="w-4 h-4 text-zinc-400 shrink-0" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-zinc-400 shrink-0" />
                  )}
                </button>
                {open === i && (
                  <div className="px-5 pb-4 text-sm text-zinc-400 leading-relaxed border-t border-zinc-800 pt-3">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* CGU */}
        <section className="mb-10">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Scale className="w-5 h-5 text-violet-400" />
            Conditions générales d&apos;utilisation
          </h2>
          <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-6 text-sm text-zinc-400 space-y-4 leading-relaxed">
            <p>
              <strong className="text-white">1. Objet</strong> — Les présentes
              CGU régissent l&apos;utilisation de la plateforme Lomi Lomi,
              accessible via le site web et les applications associées.
            </p>
            <p>
              <strong className="text-white">2. Inscription</strong> —
              L&apos;utilisateur doit être âgé d&apos;au moins 18 ans. Toute
              inscription implique l&apos;acceptation des présentes CGU. Les
              informations fournies doivent être exactes.
            </p>
            <p>
              <strong className="text-white">3. Utilisation du service</strong>{" "}
              — L&apos;utilisateur s&apos;engage à respecter les autres membres,
              à ne pas publier de contenu illicite, offensant, discriminatoire
              ou portant atteinte aux droits d&apos;autrui.
            </p>
            <p>
              <strong className="text-white">4. Données personnelles</strong> —
              Conformément au RGPD, vos données sont traitées de manière
              sécurisée. Vous disposez d&apos;un droit d&apos;accès, de
              rectification et de suppression. Contactez support@lomilomi.fr.
            </p>
            <p>
              <strong className="text-white">5. Modération</strong> — Tout
              comportement contraire aux CGU peut entraîner la suspension ou la
              suppression du compte sans préavis.
            </p>
            <p>
              <strong className="text-white">6. Responsabilité</strong> — Lomi
              Lomi ne garantit pas la véracité des profils et décline toute
              responsabilité en cas de litige entre utilisateurs.
            </p>
            <p>
              <strong className="text-white">
                7. Propriété intellectuelle
              </strong>{" "}
              — L&apos;ensemble du contenu de la plateforme (logo, design, code)
              est la propriété exclusive de Lomi Lomi.
            </p>
            <p>
              <strong className="text-white">8. Modification</strong> — Lomi
              Lomi se réserve le droit de modifier les présentes CGU à tout
              moment. Les utilisateurs seront informés de toute modification
              substantielle.
            </p>
          </div>
        </section>

        {/* Privacy */}
        <section>
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Shield className="w-5 h-5 text-violet-400" />
            Politique de confidentialité
          </h2>
          <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-6 text-sm text-zinc-400 space-y-4 leading-relaxed">
            <p>
              Lomi Lomi collecte uniquement les données nécessaires au
              fonctionnement du service : pseudo, email, localisation
              approximative, préférences de recherche et messages échangés.
            </p>
            <p>
              Vos données ne sont jamais vendues à des tiers. Les messages sont
              chiffrés. Les mots de passe sont hashés avec bcrypt.
            </p>
            <p>
              Vous pouvez à tout moment supprimer votre compte et
              l&apos;ensemble de vos données depuis les paramètres de votre
              profil.
            </p>
            <p className="text-zinc-500 text-xs">
              Dernière mise à jour : 20 avril 2026
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
