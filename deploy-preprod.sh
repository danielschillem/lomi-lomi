#!/bin/bash
# Full preprod install — run as root on fresh Ubuntu 24.04
set -euo pipefail
LOG=/var/log/lomilomi-deploy.log
exec > >(tee -a "$LOG") 2>&1

echo "[$(date)] === START ==="

# 1. Disable auto-reboots definitively
systemctl stop unattended-upgrades 2>/dev/null || true
systemctl disable unattended-upgrades 2>/dev/null || true
systemctl mask unattended-upgrades 2>/dev/null || true
apt-get remove -y unattended-upgrades 2>/dev/null || true
echo 'APT::Periodic::Update-Package-Lists "0";'   > /etc/apt/apt.conf.d/99-no-auto
echo 'APT::Periodic::Unattended-Upgrade "0";'    >> /etc/apt/apt.conf.d/99-no-auto
echo "[$(date)] auto-upgrades disabled"

# 2. Install Docker (skip if already present)
if ! command -v docker &>/dev/null; then
  echo "[$(date)] Installing Docker..."
  curl -fsSL https://get.docker.com | sh
  systemctl enable docker
  systemctl start docker
else
  echo "[$(date)] Docker already installed: $(docker --version)"
fi

# 3. Install git
apt-get install -y -qq git

# 4. Swap 2G
if [ ! -f /swapfile ]; then
  fallocate -l 2G /swapfile
  chmod 600 /swapfile
  mkswap /swapfile
  swapon /swapfile
  echo '/swapfile none swap sw 0 0' >> /etc/fstab
  echo "[$(date)] Swap 2G created"
fi

# 5. Firewall
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable
echo "[$(date)] Firewall OK"

# 6. Clone repo
APP=/opt/lomilomi
if [ -d "$APP" ]; then
  cd "$APP" && git pull origin main
else
  git clone -b main https://github.com/danielschillem/lomi-lomi.git "$APP"
fi
cd "$APP"
echo "[$(date)] Repo ready"

# 7. Create .env
if [ ! -f .env ]; then
  JWT=$(openssl rand -base64 32)
  DB_PASS=$(openssl rand -base64 16 | tr -d '=+/')
  cat > .env <<ENVEOF
POSTGRES_PASSWORD=${DB_PASS}
DB_PASS=${DB_PASS}
JWT_SECRET=${JWT}
ADMIN_SECRET=LomiLomi2026!
CORS_ORIGIN=http://localhost,http://localhost:3000,http://134.209.229.141
OM_BASE_URL=https://api.orange.com/orange-money-webpay/dev/v1
OM_API_KEY=
OM_PIN=
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_PHONE_NUMBER=
ENVEOF
  echo "[$(date)] .env created"
fi

# 8. Create systemd service so docker-compose survives reboots
cat > /etc/systemd/system/lomilomi.service <<'SVCEOF'
[Unit]
Description=Lomi Lomi App
After=docker.service network-online.target
Requires=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=/opt/lomilomi
ExecStart=/usr/bin/docker compose -f docker-compose.prod.yml up -d
ExecStop=/usr/bin/docker compose -f docker-compose.prod.yml down
TimeoutStartSec=600

[Install]
WantedBy=multi-user.target
SVCEOF
systemctl daemon-reload
systemctl enable lomilomi.service
echo "[$(date)] systemd service created"

# 9. Build & start
echo "[$(date)] Building containers (this takes ~20min)..."
docker compose -f docker-compose.prod.yml pull --ignore-pull-failures 2>/dev/null || true
docker compose -f docker-compose.prod.yml build --no-cache
echo "[$(date)] Build done. Starting..."
docker compose -f docker-compose.prod.yml up -d
echo "[$(date)] Containers started"

# 10. Health check
for i in $(seq 1 30); do
  if curl -sf http://localhost/api/health > /dev/null 2>&1; then
    echo "[$(date)] ✓ HEALTHY — http://134.209.229.141 is live"
    break
  fi
  echo "[$(date)] waiting health ($i/30)..."
  sleep 10
done

docker compose -f docker-compose.prod.yml ps
echo "[$(date)] === DONE ==="
