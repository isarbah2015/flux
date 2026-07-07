#!/usr/bin/env bash
# Fetch Google OAuth client IDs for Flux mobile from Firebase (requires: firebase login).
# Prefer: pnpm run setup:google (from artifacts/mobile) or node scripts/enable-google-auth.mjs
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
exec node "$ROOT/scripts/enable-google-auth.mjs" "${1:-$ROOT/artifacts/mobile/.env}"
