/** Env-only helpers — no native modules imported. */
export function isGoogleSignInConfigured(): boolean {
  return Boolean(process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID);
}

export function getGoogleClientIds() {
  return {
    web: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
    ios: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
    android: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
  };
}
