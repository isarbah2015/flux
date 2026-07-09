#!/usr/bin/env bash
# Build Flux mobile in testing mode (Android and/or iOS native).
#
# Usage:
#   bash scripts/build-testing-mobile.sh android
#   bash scripts/build-testing-mobile.sh ios
#   bash scripts/build-testing-mobile.sh both
#   FLUX_API_URL=https://flux-api.onrender.com bash scripts/build-testing-mobile.sh android
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
MOBILE="$ROOT/artifacts/mobile"
TARGET="${1:-android}"
API_URL="${FLUX_API_URL:-https://flux-api.onrender.com}"

export EXPO_PUBLIC_FLUX_ENV=testing
export EXPO_PUBLIC_API_URL="$API_URL"
export FLUX_NATIVE_BUILD=1

upsert_env() {
  local file="$1"
  touch "$file"
  for pair in "EXPO_PUBLIC_FLUX_ENV=testing" "EXPO_PUBLIC_API_URL=${API_URL}"; do
    local key="${pair%%=*}"
    local val="${pair#*=}"
    if grep -q "^${key}=" "$file" 2>/dev/null; then
      sed -i '' "s|^${key}=.*|${key}=${val}|" "$file"
    else
      echo "${key}=${val}" >>"$file"
    fi
  done
}

upsert_env "$MOBILE/.env"

echo "Testing build"
echo "  EXPO_PUBLIC_FLUX_ENV=testing"
echo "  EXPO_PUBLIC_API_URL=${API_URL}"
echo ""

if [[ -n "${JAVA_HOME:-}" ]]; then
  :
elif [[ -d "/Applications/Android Studio.app/Contents/jbr/Contents/Home" ]]; then
  export JAVA_HOME="/Applications/Android Studio.app/Contents/jbr/Contents/Home"
fi

cd "$MOBILE"

build_android() {
  unset ANDROID_DEVICE
  pnpm exec expo run:android
}

build_ios() {
  pnpm exec expo run:ios --device
}

case "$TARGET" in
  android) build_android ;;
  ios) build_ios ;;
  both)
    build_android
    build_ios
    ;;
  *)
    echo "Usage: $0 [android|ios|both]"
    exit 1
    ;;
esac
