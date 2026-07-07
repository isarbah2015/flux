import { useCallback, useEffect, useState } from 'react';
import * as Google from 'expo-auth-session/providers/google';
import { makeRedirectUri } from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import { getGoogleClientIds, isGoogleSignInConfigured } from '@/lib/google-sign-in-config';

export { isGoogleSignInConfigured } from '@/lib/google-sign-in-config';

WebBrowser.maybeCompleteAuthSession();

/**
 * Google OAuth → Firebase via ID token.
 * Only imported from LoginScreen (lazy-loaded in AuthGate) so expo-auth-session
 * does not load during app bootstrap.
 */
export function useGoogleSignIn() {
  const { web, ios, android } = getGoogleClientIds();
  const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
    clientId: web,
    iosClientId: ios ?? web,
    androidClientId: android ?? web,
    redirectUri: makeRedirectUri({ scheme: 'mobile', path: 'oauth/google' }),
  });

  const [pending, setPending] = useState(false);
  const [idToken, setIdToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (response?.type === 'success') {
      const token = response.params.id_token;
      if (token) {
        setIdToken(token);
        setError(null);
      } else {
        setError('Google did not return a sign-in token.');
      }
      setPending(false);
    } else if (response?.type === 'error') {
      setError(response.error?.message ?? 'Google sign-in failed.');
      setPending(false);
    } else if (response?.type === 'dismiss' || response?.type === 'cancel') {
      setPending(false);
    }
  }, [response]);

  const signIn = useCallback(async (): Promise<string | null> => {
    if (!isGoogleSignInConfigured()) {
      throw new Error('Google Sign-In is not configured. Add EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID.');
    }
    if (!request) {
      throw new Error('Google Sign-In is still loading. Try again in a moment.');
    }
    setPending(true);
    setError(null);
    setIdToken(null);
    const result = await promptAsync();
    if (result.type === 'success' && result.params.id_token) {
      return result.params.id_token;
    }
    if (result.type === 'dismiss' || result.type === 'cancel') {
      return null;
    }
    throw new Error('Google sign-in did not complete.');
  }, [promptAsync, request]);

  const consumeIdToken = useCallback(() => {
    const token = idToken;
    setIdToken(null);
    return token;
  }, [idToken]);

  return {
    signIn,
    pending,
    error,
    idToken,
    consumeIdToken,
    ready: Boolean(request) && isGoogleSignInConfigured(),
    isConfigured: isGoogleSignInConfigured(),
  };
}
