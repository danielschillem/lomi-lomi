param(
  [string]$Server = "134.209.229.141",
  [string]$User = "root",
  [string]$AppDir = "/opt/lomilomi",
  [string]$Branch = "main"
)

$ErrorActionPreference = "Stop"

Write-Host "=== Lomi Lomi Redeploy ==="
Write-Host "Target: $User@$Server"
Write-Host "AppDir: $AppDir"
Write-Host "Branch: $Branch"

$remoteScript = @"
set -euo pipefail
cd '$AppDir'
echo '[1/4] Pull latest code...'
git fetch origin
git checkout '$Branch'
git pull --ff-only origin '$Branch'

echo '[2/4] Build images...'
docker compose -f docker-compose.prod.yml build

echo '[3/4] Restart services...'
docker compose -f docker-compose.prod.yml up -d

echo '[4/4] Verify health...'
curl -fsS http://localhost/api/health
echo
docker compose -f docker-compose.prod.yml ps
"@

ssh "$User@$Server" "bash -lc ""$remoteScript"""

Write-Host "=== Redeploy finished ==="
