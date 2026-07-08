/**
 * Stub for Expo Go / Metro dev — the real package calls
 * TurboModuleRegistry.getEnforcing('RNGoogleSignin') at import time and
 * hard-crashes when the native module is missing.
 */
export const GoogleSignin = {
  configure: async () => {},
  signIn: async () => {
    throw new Error('Google Sign-In requires a dev build (npx expo run:android).');
  },
  signOut: async () => {},
  getCurrentUser: () => null,
  hasPlayServices: async () => true,
};

export const GoogleSigninButton = () => null;

export const statusCodes = {
  SIGN_IN_CANCELLED: 'SIGN_IN_CANCELLED',
  IN_PROGRESS: 'IN_PROGRESS',
  PLAY_SERVICES_NOT_AVAILABLE: 'PLAY_SERVICES_NOT_AVAILABLE',
};

export function isSuccessResponse(response: unknown): response is { data: { idToken: string | null } } {
  return Boolean(response && typeof response === 'object' && 'data' in (response as object));
}
