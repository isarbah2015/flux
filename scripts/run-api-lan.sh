#!/usr/bin/env bash
# Start Flux API on all interfaces so a phone on the same Wi‑Fi can reach it.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
API_DIR="$ROOT/artifacts/api-server"
ENV_FILE="$API_DIR/.env"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Missing $ENV_FILE — copy from .env.example and set DATABASE_URL + PAYSTACK_SECRET_KEY"
  exit 1
fi

LAN_IP="$(ipconfig getifaddr en0 2>/dev/null || hostname -I 2>/dev/null | awk '{print $1}' || echo "127.0.0.1")"
export HOST=0.0.0.0
export PORT="${PORT:-8080}"

echo "Starting Flux API on http://${LAN_IP}:${PORT}"
echo "Set mobile EXPO_PUBLIC_API_URL=http://${LAN_IP}:${PORT} and rebuild if needed."
echo "Paystack webhook (when deployed): https://<your-host>/api/billing/webhook"

cd "$API_DIR"
pnpm run build
exec node --enable-source-maps --env-file-if-exists=.env ./dist/index.mjs
