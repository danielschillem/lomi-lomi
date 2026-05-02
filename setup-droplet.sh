#!/bin/bash
# ─────────────────────────────────────────────────────────────
# Lomi Lomi — Droplet provisioning script
# Run on a fresh Ubuntu 24.04 droplet as root
# Usage: bash setup-droplet.sh
# ─────────────────────────────────────────────────────────────
set -euo pipefail

APP_DIR="/opt/lomilomi"
REPO="https://github.com/danielschillem/lomi-lomi.git"
BRANCH="main"

echo "══════════════════════════════════════════"
echo "  Lomi Lomi — Provisioning droplet"
echo "══════════════════════════════════════════"

# ── 1. System updates ───────────────────────────────────────
echo "→ Updating system..."
apt-get update -qq && apt-get upgrade -y -qq

# ── 2. Install Docker + Docker Compose ──────────────────────
if ! command -v docker &>/dev/null; then
  echo "→ Installing Docker..."
  curl -fsSL https://get.docker.com | sh
  systemctl enable docker
  systemctl start docker
else
  echo "→ Docker already installed"
fi

# ── 3. Install Git ──────────────────────────────────────────
apt-get install -y -qq git

# ── 4. Firewall ─────────────────────────────────────────────
echo "→ Configuring firewall..."
ufw allow 22/tcp   # SSH
ufw allow 80/tcp   # HTTP
ufw allow 443/tcp  # HTTPS
ufw --force enable

# ── 5. Clone repo ──────────────────────────────────────────
if [ -d "$APP_DIR" ]; then
  echo "→ Pulling latest code..."
  cd "$APP_DIR" && git pull origin "$BRANCH"
else
  echo "→ Cloning repo..."
  git clone -b "$BRANCH" "$REPO" "$APP_DIR"
fi
cd "$APP_DIR"

# ── 6. Create .env if missing ──────────────────────────────
if [ ! -f ".env" ]; then
  echo "→ Creating .env from template..."
  JWT=$(openssl rand -base64 32)
  DB_PASS=$(openssl rand -base64 16 | tr -d '=+/')
  cat > .env <<EOF
# ── Database ──
POSTGRES_PASSWORD=${DB_PASS}
DB_PASS=${DB_PASS}

# ── Security ──
JWT_SECRET=${JWT}
ADMIN_SECRET=LomiLomi2026!

# ── CORS (update with your domain) ──
CORS_ORIGIN=http://localhost,http://localhost:3000

# ── Orange Money (fill when ready) ──
OM_BASE_URL=https://api.orange.com/orange-money-webpay/dev/v1
OM_API_KEY=
OM_PIN=

# ── Twilio SMS (fill when ready) ──
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_PHONE_NUMBER=
EOF
  echo "   .env created with auto-generated JWT_SECRET and DB password"
else
  echo "→ .env already exists, keeping it"
fi

# ── 7. Build & Launch ──────────────────────────────────────
echo "→ Building containers..."
docker compose build --no-cache

echo "→ Starting services..."
docker compose up -d

# ── 8. Wait for backend ────────────────────────────────────
echo "→ Waiting for backend health..."
for i in $(seq 1 30); do
  if curl -sf http://localhost:80/api/health > /dev/null 2>&1; then
    echo "   ✓ Backend healthy!"
    break
  fi
  sleep 2
done

# ── 9. Show status ─────────────────────────────────────────
echo ""
echo "══════════════════════════════════════════"
echo "  ✓ Lomi Lomi deployed!"
echo "══════════════════════════════════════════"
echo ""
docker compose ps
echo ""
DROPLET_IP=$(curl -s ifconfig.me)
echo "  Frontend:  http://${DROPLET_IP}"
echo "  API:       http://${DROPLET_IP}/api/health"
echo "  WebSocket: ws://${DROPLET_IP}/ws"
echo ""
echo "  Next steps:"
echo "  1. Update mobile/app.json apiUrl & wsUrl with IP: ${DROPLET_IP}"
echo "  2. Update CORS_ORIGIN in .env with your domain"
echo "  3. For HTTPS, add your domain to Caddyfile"
echo ""
