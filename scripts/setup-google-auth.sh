#!/usr/bin/env bash
# Fetch Google OAuth client IDs for Flux mobile from Firebase (requires: firebase login).
set -euo pipefail

PROJECT_ID="${FIREBASE_PROJECT_ID:-flux-screenshotos}"
ENV_FILE="${1:-artifacts/mobile/.env}"

if ! command -v firebase >/dev/null 2>&1; then
  echo "Install Firebase CLI: npm i -g firebase-tools && firebase login"
  exit 1
fi

tmpdir="$(mktemp -d)"
trap 'rm -rf "$tmpdir"' EXIT

echo "Fetching Android google-services.json for $PROJECT_ID…"
firebase apps:sdkconfig ANDROID "$PROJECT_ID" -o "$tmpdir/google-services.json" 2>/dev/null || true

web=""
ios=""
android=""

if [[ -f "$tmpdir/google-services.json" ]]; then
  mapfile -t ids < <(node -e "
    const j=require('$tmpdir/google-services.json');
    const clients=j.client?.[0]?.oauth_client??[];
    const webClient=clients.find(c=>c.client_type===3);
    const androidClient=clients.find(c=>c.client_type===1);
    console.log(webClient?.client_id??'');
    console.log(androidClient?.client_id??'');
  ")
  web="${ids[0]:-}"
  android="${ids[1]:-}"
fi

echo "Fetching iOS GoogleService-Info.plist for $PROJECT_ID…"
firebase apps:sdkconfig IOS "$PROJECT_ID" -o "$tmpdir/GoogleService-Info.plist" 2>/dev/null || true

if [[ -f "$tmpdir/GoogleService-Info.plist" ]]; then
  ios="$(/usr/libexec/PlistBuddy -c 'Print :CLIENT_ID' "$tmpdir/GoogleService-Info.plist" 2>/dev/null || true)"
  if [[ -z "$web" ]]; then
    web="$(/usr/libexec/PlistBuddy -c 'Print :REVERSED_CLIENT_ID' "$tmpdir/GoogleService-Info.plist" 2>/dev/null | sed 's/^com.googleusercontent.apps.//' | awk -F. '{print $1"-"$2".apps.googleusercontent.com"}' || true)"
  fi
fi

if [[ -z "$web" && -z "$ios" && -z "$android" ]]; then
  echo ""
  echo "Could not auto-fetch OAuth clients. Enable Google sign-in in Firebase Console:"
  echo "  https://console.firebase.google.com/project/$PROJECT_ID/authentication/providers"
  echo "Then copy the Web client ID into $ENV_FILE as EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID"
  exit 1
fi

touch "$ENV_FILE"
upsert() {
  local key="$1" val="$2"
  [[ -z "$val" ]] && return
  if grep -q "^${key}=" "$ENV_FILE"; then
    sed -i '' "s|^${key}=.*|${key}=${val}|" "$ENV_FILE"
  else
    echo "${key}=${val}" >> "$ENV_FILE"
  fi
}

upsert EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID "$web"
upsert EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID "$ios"
upsert EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID "$android"

echo "Updated $ENV_FILE:"
echo "  EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=${web:-<empty>}"
echo "  EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=${ios:-<empty>}"
echo "  EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID=${android:-<empty>}"
echo ""
echo "Restart Expo: cd artifacts/mobile && pnpm run dev:local -- --clear"
