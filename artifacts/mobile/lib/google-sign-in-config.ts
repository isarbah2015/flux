/** Env-only helpers — no native modules imported. */

export function getGoogleClientIds() {
  return {
    web: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
    ios: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
    android: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
  };
}

export function isGoogleSignInConfigured(): boolean {
  return Boolean(process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID);
}

/** Reversed iOS client ID for CFBundleURLSchemes / Expo config plugin. */
export function getGoogleIosUrlScheme(): string | null {
  const ios = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;
  if (!ios) return null;
  const prefix = 'com.googleusercontent.apps.';
  if (ios.startsWith(prefix)) return ios;
  const match = /^(\d+)-(.+)\.apps\.googleusercontent\.com$/.exec(ios);
  if (!match) return null;
  return `${prefix}${match[1]}-${match[2]}`;
}
