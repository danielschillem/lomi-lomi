#!/bin/bash
set -e
cd /opt/lomilomi

echo "[BUILD] Start: $(date)" | tee /tmp/build.log
docker compose -f docker-compose.prod.yml build --no-cache 2>&1 | tee -a /tmp/build.log
echo "[BUILD] Done: $(date)" | tee -a /tmp/build.log

echo "[START] Containers..." | tee -a /tmp/build.log
docker compose -f docker-compose.prod.yml up -d 2>&1 | tee -a /tmp/build.log
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" | tee -a /tmp/build.log

echo "[HEALTH] Checking..." | tee -a /tmp/build.log
for i in $(seq 1 30); do
  if curl -sf http://localhost/api/health >> /tmp/build.log 2>&1; then
    echo " HEALTHY" | tee -a /tmp/build.log
    break
  fi
  echo "retry $i/30" | tee -a /tmp/build.log
  sleep 10
done
echo "=== DONE ===" | tee -a /tmp/build.log
