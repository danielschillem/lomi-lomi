#!/bin/bash
# =============================================================
# Lomi Lomi - Script de déploiement DigitalOcean
# À exécuter sur le Droplet après le premier SSH
# =============================================================
set -euo pipefail

echo "🚀 Lomi Lomi - Déploiement sur DigitalOcean"
echo "============================================="

# 1. Mise à jour du système
echo "📦 Mise à jour du système..."
apt-get update && apt-get upgrade -y

# 2. Installer Docker si absent
if ! command -v docker &> /dev/null; then
    echo "🐳 Installation de Docker..."
    curl -fsSL https://get.docker.com | sh
    systemctl enable docker
    systemctl start docker
else
    echo "✅ Docker déjà installé"
fi

# 3. Installer Docker Compose plugin si absent
if ! docker compose version &> /dev/null; then
    echo "🐳 Installation de Docker Compose..."
    apt-get install -y docker-compose-plugin
else
    echo "✅ Docker Compose déjà installé"
fi

# 4. Créer le dossier app
APP_DIR=/opt/lomilomi
mkdir -p $APP_DIR
cd $APP_DIR

# 5. Cloner ou mettre à jour le repo
REPO_URL="https://github.com/danielschillem/lomi-lomi.git"
if [ -d ".git" ]; then
    echo "🔄 Mise à jour du code..."
    git pull origin main
else
    echo "📥 Clonage du repo..."
    git clone $REPO_URL .
fi

# 6. Vérifier que .env existe
if [ ! -f ".env" ]; then
    echo "⚠️  Fichier .env manquant !"
    echo "   Copie le template et remplis les valeurs :"
    echo "   cp .env.production.example .env"
    echo "   nano .env"
    exit 1
fi

# 7. Build et démarrage
echo "🔨 Build des images..."
docker compose -f docker-compose.prod.yml build

echo "🚀 Démarrage des services..."
docker compose -f docker-compose.prod.yml up -d

# 8. Vérification
echo ""
echo "============================================="
echo "✅ Déploiement terminé !"
echo ""
echo "Services actifs :"
docker compose -f docker-compose.prod.yml ps
echo ""
echo "📋 Logs : docker compose -f docker-compose.prod.yml logs -f"
echo "🔄 Redéployer : docker compose -f docker-compose.prod.yml up -d --build"
echo "============================================="
