#!/usr/bin/env bash
# Render start: apply schema at boot, then start the API.
set -euo pipefail
cd "$(dirname "$0")/.."

if [[ -n "${DATABASE_URL:-}" ]]; then
  echo "[render-start] Applying database schema..."
  pnpm --filter @workspace/db run push || pnpm --filter @workspace/db run push-force
  echo "[render-start] Database schema ready"
fi

echo "[render-start] Starting API on port ${PORT:-8080}..."
exec node --enable-source-maps artifacts/api-server/dist/index.mjs
