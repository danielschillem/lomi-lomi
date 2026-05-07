import Link from "next/link";

export default function CGUPage() {
  return (
    <div className="min-h-screen bg-gray-950 text-gray-200">
      <div className="max-w-3xl mx-auto px-4 py-12">
        <div className="mb-8">
          <Link
            href="/"
            className="text-purple-400 hover:text-purple-300 text-sm"
          >
            ← Retour
          </Link>
        </div>
        <h1 className="text-3xl font-bold text-white mb-2">
          Conditions Générales d&apos;Utilisation
        </h1>
        <p className="text-gray-500 text-sm mb-8">
          Dernière mise à jour : Janvier 2026
        </p>

        <div className="space-y-8 text-sm leading-relaxed">
          <section>
            <h2 className="text-lg font-semibold text-white mb-3">
              1. Présentation de Texto
            </h2>
            <p>
              Texto est une application de messagerie ouverte tout public,
              éditée et exploitée conformément aux lois burkinabè en vigueur.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">
              2. Conditions d&apos;accès
            </h2>
            <p>
              L&apos;utilisation de Texto est réservée aux personnes âgées
              de 18 ans et plus. En vous inscrivant, vous confirmez avoir
              atteint cet âge et accepter les présentes conditions.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">
              3. Compte utilisateur
            </h2>
            <p>
              Vous êtes responsable de la confidentialité de votre mot de passe
              et de toute activité effectuée depuis votre compte. Vous vous
              engagez à fournir des informations exactes et à ne pas usurper
              l&apos;identité d&apos;une autre personne.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">
              4. Règles de comportement
            </h2>
            <ul className="list-disc list-inside space-y-1 text-gray-300">
              <li>Respecter tous les autres membres en toute circonstance.</li>
              <li>Ne pas partager de contenu offensant, haineux ou illégal.</li>
              <li>
                Ne pas harceler, menacer ou intimider d&apos;autres
                utilisateurs.
              </li>
              <li>
                Ne pas utiliser l&apos;application à des fins commerciales non
                autorisées.
              </li>
              <li>
                Signaler tout comportement inapproprié via la fonction de
                signalement.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">
              5. Abonnement Premium (TexMe)
            </h2>
            <p>
              Texto propose un abonnement payant (TexMe) facturé en
              Francs CFA (XOF) via Orange Money. Les abonnements sont non
              remboursables sauf en cas de défaut technique avéré. Vous pouvez
              annuler à tout moment depuis votre profil.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">
              6. Propriété intellectuelle
            </h2>
            <p>
              Tout le contenu de Texto (logo, textes, design) est protégé.
              Vous conservez la propriété de vos photos et contenus, mais
              accordez à Texto une licence d&apos;utilisation pour le bon
              fonctionnement du service.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">
              7. Limitation de responsabilité
            </h2>
            <p>
              Texto n&apos;est pas responsable des rencontres physiques
              entre utilisateurs. Nous vous recommandons de prendre toutes les
              précautions nécessaires lors de vos premiers rendez-vous.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">
              8. Résiliation
            </h2>
            <p>
              Texto se réserve le droit de suspendre ou supprimer tout
              compte ne respectant pas les présentes conditions. Vous pouvez
              supprimer votre compte à tout moment depuis les paramètres.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">
              9. Contact
            </h2>
            <p>
              Pour toute question, contactez l&apos;équipe Texto via le
              formulaire de contact disponible dans l&apos;application.
            </p>
          </section>
        </div>

        <div className="mt-10 pt-6 border-t border-gray-800 text-center">
          <Link
            href="/confidentialite"
            className="text-purple-400 hover:text-purple-300 text-sm mr-4"
          >
            Politique de confidentialité
          </Link>
          <Link
            href="/register"
            className="text-purple-400 hover:text-purple-300 text-sm"
          >
            S&apos;inscrire
          </Link>
        </div>
      </div>
    </div>
  );
}
