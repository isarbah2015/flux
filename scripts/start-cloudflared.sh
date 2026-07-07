#!/usr/bin/env bash
# Start Cloudflare quick tunnels for Flux API (8080) and Expo Metro (8081).
# URLs change each run — update artifacts/mobile/.env after starting.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
LOG_DIR="$ROOT/.cloudflared"
mkdir -p "$LOG_DIR"

API_PORT="${FLUX_API_PORT:-8080}"
METRO_PORT="${FLUX_METRO_PORT:-8081}"

if ! command -v cloudflared >/dev/null 2>&1; then
  echo "Install cloudflared: brew install cloudflared"
  exit 1
fi

start_tunnel() {
  local name="$1"
  local port="$2"
  local log="$LOG_DIR/${name}.log"
  local pidfile="$LOG_DIR/${name}.pid"

  if [[ -f "$pidfile" ]] && kill -0 "$(cat "$pidfile")" 2>/dev/null; then
    echo "[$name] already running (pid $(cat "$pidfile"))"
    grep -o 'https://[a-z0-9-]*\.trycloudflare\.com' "$log" 2>/dev/null | tail -1 || true
    return
  fi

  : > "$log"
  cloudflared tunnel --url "http://127.0.0.1:${port}" >>"$log" 2>&1 &
  echo $! >"$pidfile"

  local url=""
  for _ in $(seq 1 30); do
    url="$(grep -o 'https://[a-z0-9-]*\.trycloudflare\.com' "$log" 2>/dev/null | tail -1 || true)"
    [[ -n "$url" ]] && break
    sleep 1
  done

  if [[ -z "$url" ]]; then
    echo "[$name] tunnel started but URL not ready — check $log"
    return
  fi

  echo "[$name] $url  → localhost:$port"
  echo "$url"
}

echo "Starting Cloudflare quick tunnels…"
API_URL="$(start_tunnel api "$API_PORT")"
METRO_URL="$(start_tunnel metro "$METRO_PORT")"

if [[ -n "$API_URL" ]]; then
  ENV_FILE="$ROOT/artifacts/mobile/.env"
  if [[ -f "$ENV_FILE" ]]; then
    if grep -q '^EXPO_PUBLIC_API_URL=' "$ENV_FILE"; then
      sed -i '' "s|^EXPO_PUBLIC_API_URL=.*|EXPO_PUBLIC_API_URL=${API_URL}|" "$ENV_FILE"
    else
      echo "EXPO_PUBLIC_API_URL=${API_URL}" >>"$ENV_FILE"
    fi
    echo ""
    echo "Updated $ENV_FILE → EXPO_PUBLIC_API_URL=${API_URL}"
  fi
fi

cat >"$LOG_DIR/urls.env" <<EOF
FLUX_API_TUNNEL_URL=${API_URL:-}
FLUX_METRO_TUNNEL_URL=${METRO_URL:-}
EOF

echo ""
echo "Metro tunnel (Expo): ${METRO_URL:-n/a}"
echo "Restart Expo after tunnels start:"
echo "  cd artifacts/mobile && pnpm run dev:local -- --clear"
echo ""
echo "Stop tunnels: $ROOT/scripts/stop-cloudflared.sh"
