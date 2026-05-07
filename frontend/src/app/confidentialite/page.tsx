import Link from "next/link";

export default function ConfidentialitePage() {
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
          Politique de confidentialité
        </h1>
        <p className="text-gray-500 text-sm mb-8">
          Dernière mise à jour : Janvier 2026
        </p>

        <div className="space-y-8 text-sm leading-relaxed">
          <section>
            <h2 className="text-lg font-semibold text-white mb-3">
              1. Données collectées
            </h2>
            <p>Texto collecte les données suivantes :</p>
            <ul className="list-disc list-inside space-y-1 text-gray-300 mt-2">
              <li>
                Informations d&apos;identité : nom, prénom, date de naissance,
                genre
              </li>
              <li>Coordonnées : numéro de téléphone, adresse e-mail</li>
              <li>Photos de profil et selfie de vérification</li>
              <li>
                Données de localisation (optionnel, pour les fonctions de
                proximité)
              </li>
              <li>
                Données de paiement (numéro Orange Money, traitées via le
                prestataire de paiement)
              </li>
              <li>
                Données d&apos;usage : interactions, messages, préférences
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">
              2. Utilisation des données
            </h2>
            <p>Vos données sont utilisées pour :</p>
            <ul className="list-disc list-inside space-y-1 text-gray-300 mt-2">
              <li>Faire fonctionner le service de rencontres et de matching</li>
              <li>Vérifier votre identité et sécuriser votre compte</li>
              <li>Vous envoyer des notifications pertinentes</li>
              <li>Améliorer nos services et prévenir les abus</li>
              <li>Traiter les paiements d&apos;abonnement</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">
              3. Partage des données
            </h2>
            <p>
              Nous ne vendons jamais vos données personnelles. Vos données
              peuvent être partagées uniquement avec :
            </p>
            <ul className="list-disc list-inside space-y-1 text-gray-300 mt-2">
              <li>
                Les prestataires techniques (hébergement, paiement) liés par
                contrat de confidentialité
              </li>
              <li>Les autorités compétentes en cas d&apos;obligation légale</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">
              4. Conservation
            </h2>
            <p>
              Vos données sont conservées pendant la durée de votre compte.
              Après suppression du compte, les données sont effacées sous 30
              jours, sauf obligation légale contraire.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">
              5. Vos droits
            </h2>
            <p>
              Conformément aux lois applicables, vous avez le droit
              d&apos;accéder, corriger, supprimer ou exporter vos données.
              Contactez-nous via le formulaire disponible dans
              l&apos;application.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">
              6. Sécurité
            </h2>
            <p>
              Vos données sont chiffrées en transit (HTTPS/TLS) et les mots de
              passe sont stockés hashés (bcrypt). Nous appliquons des contrôles
              d&apos;accès stricts à nos bases de données.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">
              7. Cookies
            </h2>
            <p>
              Texto utilise des cookies essentiels au fonctionnement du
              service (authentification). Aucun cookie publicitaire tiers
              n&apos;est utilisé.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">
              8. Contact
            </h2>
            <p>
              Pour toute demande relative à la protection des données,
              contactez-nous via le formulaire disponible dans
              l&apos;application.
            </p>
          </section>
        </div>

        <div className="mt-10 pt-6 border-t border-gray-800 text-center">
          <Link
            href="/cgu"
            className="text-purple-400 hover:text-purple-300 text-sm mr-4"
          >
            Conditions d&apos;utilisation
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
