#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
LOG_DIR="$ROOT/.cloudflared"

for name in api metro; do
  pidfile="$LOG_DIR/${name}.pid"
  if [[ -f "$pidfile" ]]; then
    pid="$(cat "$pidfile")"
    if kill -0 "$pid" 2>/dev/null; then
      kill "$pid" 2>/dev/null || true
      echo "Stopped $name tunnel (pid $pid)"
    fi
    rm -f "$pidfile"
  fi
done

pkill -f 'cloudflared tunnel --url http://127.0.0.1:808' 2>/dev/null || true
echo "Done."
