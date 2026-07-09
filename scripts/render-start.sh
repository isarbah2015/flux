#!/usr/bin/env bash
# Render start: apply schema at boot, then start the API.
set -euo pipefail
cd "$(dirname "$0")/.."

if [[ -n "${DATABASE_URL:-}" ]]; then
  pnpm --filter @workspace/db run push-force || pnpm --filter @workspace/db run push
fi

exec node --enable-source-maps artifacts/api-server/dist/index.mjs
