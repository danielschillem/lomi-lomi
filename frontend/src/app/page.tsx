import Link from "next/link";
import {
  Heart,
  ShieldCheck,
  Lock,
  EyeOff,
  MapPin,
  ShoppingBag,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

const features: { icon: LucideIcon; title: string; desc: string }[] = [
  {
    icon: Heart,
    title: "Matching par affinités",
    desc: "Un algorithme intelligent analyse vos préférences pour vous proposer des profils compatibles avec vos envies.",
  },
  {
    icon: ShieldCheck,
    title: "Profils vérifiés & sécurisés",
    desc: "Chaque profil est vérifié pour garantir des rencontres authentiques. Vos données sont protégées et chiffrées.",
  },
  {
    icon: Lock,
    title: "Messagerie chiffrée",
    desc: "Échangez en toute confidentialité grâce à notre système de messagerie privée avec chiffrement de bout en bout.",
  },
  {
    icon: EyeOff,
    title: "Anonymat garanti",
    desc: "Naviguez et communiquez sans jamais révéler votre identité. Vous décidez ce que vous partagez, et quand.",
  },
  {
    icon: MapPin,
    title: "Géolocalisation intelligente",
    desc: "Trouvez des profils proches de vous grâce à notre système de localisation avec rayon paramétrable.",
  },
  {
    icon: ShoppingBag,
    title: "Boutique exotique",
    desc: "Découvrez notre sélection exclusive de produits de bien-être et soins intimes, livrés en toute discrétion.",
  },
];

const steps = [
  {
    num: "01",
    title: "Créez votre profil",
    desc: "Inscrivez-vous gratuitement et créez un profil anonyme. Choisissez un pseudo, ajoutez une photo discrète et définissez vos préférences.",
  },
  {
    num: "02",
    title: "Explorez & filtrez",
    desc: "Parcourez les profils grâce à nos filtres avancés : âge, localisation, préférences, centres d'intérêt et proximité géographique.",
  },
  {
    num: "03",
    title: "Échangez en privé",
    desc: "Engagez la conversation via notre messagerie chiffrée. Chat instantané, photos éphémères et appels vocaux sécurisés.",
  },
  {
    num: "04",
    title: "Rencontrez-vous",
    desc: "Consultez notre carte interactive pour trouver le lieu parfait. Hôtels, restaurants, espaces de loisirs — tout est à portée de main.",
  },
];

const stats = [
  { value: "50K+", label: "Membres actifs" },
  { value: "100%", label: "Confidentiel" },
  { value: "24/7", label: "Disponible" },
];

export default function Home() {
  return (
    <>
      {/* NAVBAR */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-zinc-950/80 backdrop-blur-md border-b border-zinc-800">
        <nav className="max-w-7xl mx-auto flex items-center justify-between px-6 py-4">
          <Link href="/" className="text-2xl font-bold">
            <span className="text-violet-500">Lomi</span>{" "}
            <span className="text-pink-500">Lomi</span>
          </Link>
          <div className="hidden md:flex items-center gap-8 text-sm text-zinc-400">
            <a href="#features" className="hover:text-white transition">
              Fonctionnalités
            </a>
            <a href="#how-it-works" className="hover:text-white transition">
              Comment ça marche
            </a>
            <a href="#boutique" className="hover:text-white transition">
              Boutique
            </a>
            <a href="#map" className="hover:text-white transition">
              Carte
            </a>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="text-sm text-zinc-400 hover:text-white transition"
            >
              Se connecter
            </Link>
            <Link
              href="/register"
              className="bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium px-5 py-2.5 rounded-full transition"
            >
              Commencer
            </Link>
          </div>
        </nav>
      </header>

      <main className="flex-1">
        {/* HERO */}
        <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
          <div className="absolute inset-0 bg-linear-to-br from-violet-950/40 via-zinc-950 to-pink-950/30" />
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-violet-600/20 rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-pink-600/15 rounded-full blur-3xl" />

          <div className="relative z-10 max-w-4xl mx-auto text-center px-6 pt-24">
            <div className="inline-block mb-6 px-4 py-1.5 rounded-full border border-violet-500/30 bg-violet-500/10 text-violet-300 text-xs font-medium tracking-wider uppercase">
              100% anonyme & sécurisé
            </div>
            <h1 className="text-5xl md:text-7xl font-bold leading-tight mb-6">
              Rencontres discrètes &{" "}
              <span className="bg-linear-to-r from-violet-400 to-pink-500 bg-clip-text text-transparent">
                affinités authentiques
              </span>
            </h1>
            <p className="text-lg md:text-xl text-zinc-400 max-w-2xl mx-auto mb-10">
              Lomi Lomi est la plateforme de rencontres pour adultes qui
              valorise votre anonymat. Matching par affinités, messagerie
              chiffrée et profils vérifiés.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
              <Link
                href="/register"
                className="bg-violet-600 hover:bg-violet-700 text-white font-semibold px-8 py-4 rounded-full text-lg transition shadow-lg shadow-violet-600/25"
              >
                Créer mon profil gratuit
              </Link>
              <a
                href="#features"
                className="text-zinc-400 hover:text-white font-medium px-8 py-4 transition"
              >
                Découvrir ↓
              </a>
            </div>

            <div className="flex items-center justify-center gap-8 md:gap-16">
              {stats.map((s) => (
                <div key={s.label} className="text-center">
                  <div className="text-3xl md:text-4xl font-bold text-violet-400">
                    {s.value}
                  </div>
                  <div className="text-sm text-zinc-500 mt-1">{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* FEATURES */}
        <section id="features" className="py-24 px-6">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16">
              <span className="text-violet-400 text-sm font-medium tracking-wider uppercase">
                Fonctionnalités
              </span>
              <h2 className="text-4xl md:text-5xl font-bold mt-3">
                Tout pour des rencontres inoubliables
              </h2>
              <p className="text-zinc-400 mt-4 max-w-xl mx-auto">
                Une plateforme pensée pour votre plaisir, votre sécurité et
                votre liberté.
              </p>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {features.map((f) => (
                <div
                  key={f.title}
                  className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-8 hover:border-violet-500/50 transition group"
                >
                  <div className="mb-4 text-violet-400">
                    <f.icon className="w-10 h-10" strokeWidth={1.5} />
                  </div>
                  <h3 className="text-xl font-semibold mb-2 group-hover:text-violet-400 transition">
                    {f.title}
                  </h3>
                  <p className="text-zinc-400 text-sm leading-relaxed">
                    {f.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* HOW IT WORKS */}
        <section id="how-it-works" className="py-24 px-6 bg-zinc-900/30">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-16">
              <span className="text-pink-400 text-sm font-medium tracking-wider uppercase">
                Comment ça marche
              </span>
              <h2 className="text-4xl md:text-5xl font-bold mt-3">
                Simple, rapide, discret
              </h2>
              <p className="text-zinc-400 mt-4">
                En quatre étapes, trouvez la complicité que vous recherchez.
              </p>
            </div>
            <div className="space-y-8">
              {steps.map((step) => (
                <div
                  key={step.num}
                  className="flex items-start gap-6 bg-zinc-900/50 border border-zinc-800 rounded-2xl p-8 hover:border-pink-500/40 transition"
                >
                  <div className="shrink-0 w-14 h-14 bg-linear-to-br from-violet-600 to-pink-600 rounded-full flex items-center justify-center text-white font-bold text-lg">
                    {step.num}
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold mb-2">{step.title}</h3>
                    <p className="text-zinc-400 text-sm leading-relaxed">
                      {step.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* BOUTIQUE */}
        <section id="boutique" className="py-24 px-6">
          <div className="max-w-7xl mx-auto">
            <div className="bg-linear-to-r from-violet-950/50 to-pink-950/50 border border-zinc-800 rounded-3xl p-12 md:p-16 flex flex-col md:flex-row items-center gap-12">
              <div className="flex-1">
                <span className="text-violet-400 text-sm font-medium tracking-wider uppercase">
                  Boutique
                </span>
                <h2 className="text-4xl md:text-5xl font-bold mt-3 mb-4">
                  Une boutique exotique à votre image
                </h2>
                <p className="text-zinc-400 mb-8 leading-relaxed">
                  Explorez notre catalogue de produits de bien-être, soins
                  intimes et accessoires sélectionnés avec soin. Livraison
                  discrète garantie.
                </p>
                <div className="flex flex-wrap gap-3 mb-8">
                  {[
                    "Emballage discret",
                    "Livraison rapide",
                    "Produits premium",
                  ].map((tag) => (
                    <span
                      key={tag}
                      className="bg-violet-500/10 text-violet-300 text-xs font-medium px-3 py-1.5 rounded-full border border-violet-500/20"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
                <Link
                  href="/boutique"
                  className="inline-block bg-violet-600 hover:bg-violet-700 text-white font-semibold px-8 py-3 rounded-full transition"
                >
                  Explorer la boutique
                </Link>
              </div>
              <div className="shrink-0 w-64 h-64 bg-zinc-800/50 rounded-2xl flex items-center justify-center">
                <ShoppingBag
                  className="w-24 h-24 text-violet-400"
                  strokeWidth={1}
                />
              </div>
            </div>
          </div>
        </section>

        {/* MAP */}
        <section id="map" className="py-24 px-6 bg-zinc-900/30">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16">
              <span className="text-pink-400 text-sm font-medium tracking-wider uppercase">
                Carte interactive
              </span>
              <h2 className="text-4xl md:text-5xl font-bold mt-3">
                Trouvez le lieu parfait
              </h2>
              <p className="text-zinc-400 mt-4 max-w-2xl mx-auto">
                Notre carte interactive géolocalise les meilleurs établissements
                partenaires : hôtels, maisons d&apos;hôtes, restaurants et
                espaces de loisirs.
              </p>
            </div>
            <div className="grid md:grid-cols-3 gap-6 mb-12">
              {[
                { label: "Hôtels & Résidences", count: "150+" },
                { label: "Restaurants & Bars", count: "80+" },
                { label: "Espaces de loisirs", count: "60+" },
              ].map((item) => (
                <div
                  key={item.label}
                  className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-8 text-center"
                >
                  <div className="text-4xl font-bold text-pink-400 mb-2">
                    {item.count}
                  </div>
                  <div className="text-zinc-400 text-sm">{item.label}</div>
                </div>
              ))}
            </div>
            <div className="text-center">
              <Link
                href="/carte"
                className="inline-block border border-pink-500/50 text-pink-400 hover:bg-pink-500/10 font-semibold px-8 py-3 rounded-full transition"
              >
                Explorer la carte
              </Link>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-24 px-6">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              Prêt à vivre de nouvelles émotions ?
            </h2>
            <p className="text-zinc-400 mb-10 text-lg">
              Rejoignez des milliers de membres qui ont choisi la discrétion et
              le plaisir. Inscription gratuite, anonyme et en quelques secondes.
            </p>
            <Link
              href="/register"
              className="bg-linear-to-r from-violet-600 to-pink-600 hover:from-violet-700 hover:to-pink-700 text-white font-semibold px-10 py-4 rounded-full text-lg transition shadow-lg shadow-violet-600/25"
            >
              Rejoindre Lomi Lomi
            </Link>
            <p className="text-zinc-500 text-sm mt-4">
              Gratuit, anonyme, sans engagement
            </p>
          </div>
        </section>
      </main>

      {/* FOOTER */}
      <footer className="border-t border-zinc-800 py-16 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-4 gap-12 mb-12">
            <div>
              <div className="text-xl font-bold mb-4">
                <span className="text-violet-500">Lomi</span>{" "}
                <span className="text-pink-500">Lomi</span>
              </div>
              <p className="text-zinc-500 text-sm leading-relaxed">
                La plateforme de rencontres anonymes et sécurisées pour adultes
                exigeants. Votre intimité est notre priorité.
              </p>
              <p className="text-zinc-600 text-xs mt-4">
                Données chiffrées | contact@lomi-lomi.com
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-4 text-sm">Plateforme</h4>
              <ul className="space-y-2 text-sm text-zinc-500">
                <li>
                  <a href="#features" className="hover:text-white transition">
                    Rencontres
                  </a>
                </li>
                <li>
                  <Link
                    href="/boutique"
                    className="hover:text-white transition"
                  >
                    Boutique
                  </Link>
                </li>
                <li>
                  <Link href="/carte" className="hover:text-white transition">
                    Carte interactive
                  </Link>
                </li>
                <li>
                  <Link href="/matches" className="hover:text-white transition">
                    Mes matches
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4 text-sm">Informations</h4>
              <ul className="space-y-2 text-sm text-zinc-500">
                <li>
                  <a
                    href="#how-it-works"
                    className="hover:text-white transition"
                  >
                    Comment ça marche
                  </a>
                </li>
                <li>
                  <Link href="/faq" className="hover:text-white transition">
                    FAQ & Aide
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4 text-sm">Légal</h4>
              <ul className="space-y-2 text-sm text-zinc-500">
                <li>
                  <Link href="/faq" className="hover:text-white transition">
                    Conditions d&apos;utilisation
                  </Link>
                </li>
                <li>
                  <Link href="/faq" className="hover:text-white transition">
                    Politique de confidentialité
                  </Link>
                </li>
                <li>
                  <Link href="/faq" className="hover:text-white transition">
                    Mentions légales
                  </Link>
                </li>
                <li>
                  <Link href="/faq" className="hover:text-white transition">
                    RGPD
                  </Link>
                </li>
              </ul>
            </div>
          </div>
          <div className="border-t border-zinc-800 pt-8 text-center text-zinc-600 text-sm">
            © 2026 Lomi Lomi. Tous droits réservés. Réservé aux +18 ans.
          </div>
        </div>
      </footer>
    </>
  );
}
