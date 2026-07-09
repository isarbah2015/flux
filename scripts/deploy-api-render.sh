#!/usr/bin/env bash
# Deploy Flux API to Render (permanent HTTPS URL).
#
# Prerequisites:
#   1. Push this repo to GitHub (origin: isarbah2015/flux)
#   2. Render account at https://render.com
#   3. After first deploy, set PAYSTACK_SECRET_KEY + PAYSTACK_PUBLIC_KEY in Render dashboard
#
# Usage:
#   bash scripts/deploy-api-render.sh
#   bash scripts/deploy-api-render.sh --apply-mobile-env
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
APPLY_MOBILE=false
for arg in "$@"; do
  case "$arg" in
    --apply-mobile-env) APPLY_MOBILE=true ;;
  esac
done

API_URL="${FLUX_API_URL:-https://flux-api-2els.onrender.com}"

echo "Flux API — Render deployment"
echo ""
echo "1. Open Render Blueprints and connect this repo:"
echo "   https://dashboard.render.com/blueprints"
echo ""
echo "2. Select repository: isarbah2015/flux"
echo "3. Render reads render.yaml at repo root (service: flux-api, Postgres: flux-db)"
echo "4. After deploy, copy the service URL (default: ${API_URL})"
echo "5. In Render → flux-api → Environment, add:"
echo "     PAYSTACK_SECRET_KEY=sk_live_…"
echo "     PAYSTACK_PUBLIC_KEY=pk_live_…"
echo "6. Paystack webhook: ${API_URL}/api/billing/webhook"
echo ""
echo "Verify: curl ${API_URL}/api/healthz"
echo ""

if [[ "$APPLY_MOBILE" == "true" ]]; then
  MOBILE_ENV="$ROOT/artifacts/mobile/.env"
  touch "$MOBILE_ENV"
  upsert() {
    local key="$1" val="$2"
    if grep -q "^${key}=" "$MOBILE_ENV" 2>/dev/null; then
      sed -i '' "s|^${key}=.*|${key}=${val}|" "$MOBILE_ENV"
    else
      echo "${key}=${val}" >>"$MOBILE_ENV"
    fi
  }
  upsert EXPO_PUBLIC_API_URL "$API_URL"
  upsert EXPO_PUBLIC_FLUX_ENV testing
  echo "Updated $MOBILE_ENV"
  echo "Rebuild mobile: bash scripts/build-testing-mobile.sh android"
fi

if command -v open >/dev/null 2>&1; then
  open "https://dashboard.render.com/blueprints"
fi
