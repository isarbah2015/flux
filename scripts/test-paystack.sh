#!/usr/bin/env bash
# Verify Paystack keys and API billing endpoints (no charge).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
API_ENV="$ROOT/artifacts/api-server/.env"
API_URL="${API_URL:-http://127.0.0.1:8080}"

if [[ ! -f "$API_ENV" ]]; then
  echo "No API .env — run: bash scripts/sync-paystack-from-scoutgrid.sh"
  exit 1
fi

# shellcheck disable=SC1090
source <(grep -E '^PAYSTACK_|^FIREBASE_' "$API_ENV" | sed 's/^/export /')

echo "=== Paystack public status ==="
curl -sf "$API_URL/api/paystack/status" | python3 -m json.tool

if [[ -z "${PAYSTACK_SECRET_KEY:-}" ]]; then
  echo "PAYSTACK_SECRET_KEY missing in API .env"
  exit 1
fi

PREFIX="${PAYSTACK_SECRET_KEY:0:8}"
echo ""
echo "Secret key prefix: ${PREFIX}…"

if [[ "$PREFIX" == "sk_live_" ]]; then
  echo "Mode: LIVE"
elif [[ "$PREFIX" == "sk_test_" ]]; then
  echo "Mode: TEST"
else
  echo "Mode: unknown key format"
fi

echo ""
echo "To test checkout: sign in on the app → Settings → Upgrade with Paystack"
echo "Ensure API is running: bash scripts/run-api-lan.sh"
