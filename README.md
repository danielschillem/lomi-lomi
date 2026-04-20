# Lomi Lomi - Plateforme de rencontres discrètes & affinités authentiques

## Architecture

```
LOMI-LOMI/
├── backend/          # API Go (Fiber v2)
│   ├── cmd/server/   # Point d'entrée
│   └── internal/     # Logique métier
├── frontend/         # Next.js 14 + Tailwind CSS
│   └── src/app/      # App Router
└── docker-compose.yml # PostgreSQL
```

## Prérequis

- Go 1.21+
- Node.js 18+
- Docker (pour PostgreSQL)

## Démarrage rapide

### 1. Base de données

```bash
docker compose up -d
```

### 2. Backend

```bash
cd backend
cp .env.example .env  # Configurer les variables
go run cmd/server/main.go
```

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

## API Endpoints

| Méthode | Route                              | Description            | Auth  |
| ------- | ---------------------------------- | ---------------------- | ----- |
| POST    | /api/v1/auth/register              | Inscription            | Non   |
| POST    | /api/v1/auth/login                 | Connexion              | Non   |
| GET     | /api/v1/auth/me                    | Profil connecté        | Oui   |
| PUT     | /api/v1/auth/password              | Changer mot de passe   | Oui   |
| DELETE  | /api/v1/auth/account               | Supprimer compte       | Oui   |
| GET     | /api/v1/profiles/:id               | Voir un profil         | Oui   |
| PUT     | /api/v1/profiles/me                | Modifier profil        | Oui   |
| GET     | /api/v1/preferences                | Préférences découverte | Oui   |
| PUT     | /api/v1/preferences                | Modifier préférences   | Oui   |
| GET     | /api/v1/discover                   | Découvrir des profils  | Oui   |
| GET     | /api/v1/search?q=                  | Recherche profils      | Oui   |
| PUT     | /api/v1/conversations/:id/read     | Marquer conv. lue      | Oui   |
| GET     | /api/v1/conversations              | Mes conversations      | Oui   |
| GET     | /api/v1/conversations/:id/messages | Messages               | Oui   |
| POST    | /api/v1/messages                   | Envoyer message        | Oui   |
| POST    | /api/v1/likes                      | Liker un profil        | Oui   |
| GET     | /api/v1/matches                    | Mes matches            | Oui   |
| DELETE  | /api/v1/matches/:id                | Supprimer un match     | Oui   |
| GET     | /api/v1/shop/products              | Catalogue boutique     | Non   |
| GET     | /api/v1/shop/products/:id          | Détail produit         | Non   |
| POST    | /api/v1/shop/orders                | Passer commande        | Oui   |
| GET     | /api/v1/shop/orders                | Mes commandes          | Oui   |
| GET     | /api/v1/places                     | Lieux partenaires      | Non   |
| GET     | /api/v1/places/:id                 | Détail lieu            | Non   |
| POST    | /api/v1/photos                     | Upload photo galerie   | Oui   |
| DELETE  | /api/v1/photos/:id                 | Supprimer photo        | Oui   |
| GET     | /api/v1/users/:id/photos           | Photos d'un user       | Non   |
| GET     | /api/v1/admin/stats/timeline       | Stats chronologiques   | Admin |

## Licence

Propriétaire - © 2026 Lomi Lomi. Tous droits réservés.

## Développeur

DEVBACKEND

## Version

v1.3.0 — 20 avril 2026

### Changelog

- **v1.3.0** — Sprint 13 : Carousel photos Discover, Preload Photos backend, PassUser persistant (modèle Pass), filtre âge Discover, photos profil public, notifications cliquables, lien message direct profil, avatars conversations, signalement profil public, correction typo closMatch
- **v1.2.0** — Sprint 12 : Galerie photos (modèle Photo, upload/suppression, max 6/user), stats admin timeline (graphiques barres par jour, filtre 7/30/90j), validation email format (net/mail)
- **v1.1.0** — Sprint 11 : PWA manifest, icônes, SEO OpenGraph/Twitter, metadataBase, page 404/error/loading, next.config (images, headers sécu, rewrites), .env.example backend + frontend, warning JWT_SECRET
- **v1.0.0** — Sprints 1-10 : Auth, profiles, matching, messaging WS, Stripe, upload, sécurité, settings, search, navbar badges, unmatch, matches page, FAQ/CGU
