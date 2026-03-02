#!/bin/bash
# ── Deploy script — ejecutar en el VPS ──────────────────────────────
# Uso: bash deploy.sh
set -e

APP_DIR="/opt/twonick-api"

cd "$APP_DIR"

echo "▶ Pulling latest changes..."
git pull origin main

echo "▶ Building Docker image..."
docker compose build --no-cache

echo "▶ Restarting container..."
docker compose down
docker compose up -d

echo "▶ Logs (últimas 20 líneas):"
sleep 2
docker compose logs --tail=20

echo "✅ Deploy completado!"
