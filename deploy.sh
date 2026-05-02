#!/bin/bash
# =============================================================
# Lomi Lomi - Script de déploiement DigitalOcean
# À exécuter sur le Droplet après le premier SSH
# =============================================================
set -euo pipefail

echo "Lomi Lomi - Deploiement sur DigitalOcean"
echo "============================================="

# 1. Mise à jour du système
echo "[1] Mise a jour du systeme..."
apt-get update && apt-get upgrade -y

# 2. Installer Docker si absent
if ! command -v docker &> /dev/null; then
    echo "[docker] Installation de Docker..."
    curl -fsSL https://get.docker.com | sh
    systemctl enable docker
    systemctl start docker
else
    echo "[ok] Docker deja installe"
fi

# 3. Installer Docker Compose plugin si absent
if ! docker compose version &> /dev/null; then
    echo "[docker] Installation de Docker Compose..."
    apt-get install -y docker-compose-plugin
else
    echo "[ok] Docker Compose deja installe"
fi

# 4. Créer le dossier app
APP_DIR=/opt/lomilomi
mkdir -p $APP_DIR
cd $APP_DIR

# 5. Cloner ou mettre à jour le repo
REPO_URL="https://github.com/danielschillem/lomi-lomi.git"
if [ -d ".git" ]; then
    echo "[update] Mise a jour du code..."
    git pull origin main
else
    echo "[clone] Clonage du repo..."
    git clone $REPO_URL .
fi

# 6. Vérifier que .env existe
if [ ! -f ".env" ]; then
    echo "[ERREUR] Fichier .env manquant !"
    echo "   Copie le template et remplis les valeurs :"
    echo "   cp .env.production.example .env"
    echo "   nano .env"
    exit 1
fi

# 7. Build et démarrage
echo "[build] Build des images..."
docker compose -f docker-compose.prod.yml build

echo "[start] Demarrage des services..."
docker compose -f docker-compose.prod.yml up -d

# 8. Vérification
echo ""
echo "============================================="
echo "[ok] Deploiement termine !"
echo ""
echo "Services actifs :"
docker compose -f docker-compose.prod.yml ps
echo ""
echo "[logs] Logs : docker compose -f docker-compose.prod.yml logs -f"
echo "[redeploy] Redeployer : docker compose -f docker-compose.prod.yml up -d --build"
echo "============================================="
