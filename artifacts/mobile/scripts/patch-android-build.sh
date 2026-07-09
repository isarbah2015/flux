#!/usr/bin/env bash
# Patches Android native project after expo prebuild for standalone device installs.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
STYLES="$ROOT/android/app/src/main/res/values/styles.xml"
GRADLE="$ROOT/android/app/build.gradle"

if [[ -f "$STYLES" ]]; then
  sed -i '' '/windowSplashScreenAnimatedIcon/d' "$STYLES" 2>/dev/null || \
    sed -i '/windowSplashScreenAnimatedIcon/d' "$STYLES"
  sed -i '' '/windowSplashScreenBehavior/d' "$STYLES" 2>/dev/null || \
    sed -i '/windowSplashScreenBehavior/d' "$STYLES"
fi

if [[ -f "$GRADLE" ]] && ! grep -q 'debuggableVariants = \[\]' "$GRADLE"; then
  sed -i '' 's/react {/react {\
    debuggableVariants = []/' "$GRADLE" 2>/dev/null || \
    sed -i 's/react {/react {\n    debuggableVariants = []/' "$GRADLE"
fi

echo "Android build patched for standalone APK."
