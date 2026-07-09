#!/usr/bin/env bash
# Copy Paystack keys from ScoutGrid Firebase Secret Manager into Flux local .env files.
# Requires: firebase CLI logged in as westcarsgh@gmail.com (owns scoutgrid-cd25f).
#
# Usage: bash scripts/sync-paystack-from-scoutgrid.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SCOUTGRID_FIREBASE="$ROOT/../Scout-Grid-Ghana/lib/firebase"
API_ENV="$ROOT/artifacts/api-server/.env"
MOBILE_ENV="$ROOT/artifacts/mobile/.env"
PROJECT="${SCOUTGRID_PROJECT:-scoutgrid-cd25f}"

if [[ ! -d "$SCOUTGRID_FIREBASE" ]]; then
  echo "ScoutGrid not found at $SCOUTGRID_FIREBASE"
  echo "Clone it next to Flux-Corezip or set SCOUTGRID_FIREBASE path."
  exit 1
fi

cd "$SCOUTGRID_FIREBASE"

echo "Reading Paystack secrets from Firebase project: $PROJECT"
SK="$(firebase functions:secrets:access PAYSTACK_SECRET_KEY --project "$PROJECT")"
PK="$(firebase functions:secrets:access PAYSTACK_PUBLIC_KEY --project "$PROJECT")"

if [[ -z "$SK" || -z "$PK" ]]; then
  echo "Could not read Paystack secrets. Run: firebase login:use westcarsgh@gmail.com"
  exit 1
fi

upsert() {
  local file="$1" key="$2" val="$3"
  touch "$file"
  if grep -q "^${key}=" "$file" 2>/dev/null; then
    # macOS sed
    sed -i '' "s|^${key}=.*|${key}=${val}|" "$file"
  else
    echo "${key}=${val}" >> "$file"
  fi
}

upsert "$API_ENV" "PAYSTACK_SECRET_KEY" "$SK"
upsert "$API_ENV" "PAYSTACK_PUBLIC_KEY" "$PK"
upsert "$MOBILE_ENV" "EXPO_PUBLIC_PAYSTACK_PUBLIC_KEY" "$PK"

echo "Done. Keys written to:"
echo "  $API_ENV"
echo "  $MOBILE_ENV"
echo "Secret prefix: ${SK:0:12}…  Public prefix: ${PK:0:12}…"
echo "Restart the API server and Expo after syncing."
