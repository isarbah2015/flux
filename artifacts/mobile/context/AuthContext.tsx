import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithCredential,
  signInWithEmailAndPassword,
  signOut as fbSignOut,
  type User,
} from 'firebase/auth';
import { setAuthTokenGetter } from '@workspace/api-client-react';
import { auth, isFirebaseConfigured } from '@/lib/firebase';
import { getGoogleClientIds, isGoogleSignInConfigured } from '@/lib/google-sign-in-config';

const IS_EXPO_GO = Constants.appOwnership === 'expo';

let googleConfigured = false;

async function loadGoogleSignin() {
  return import('@react-native-google-signin/google-signin');
}

async function ensureGoogleConfigured(): Promise<boolean> {
  if (googleConfigured) return true;
  const { web, ios } = getGoogleClientIds();
  if (!web) return false;

  try {
    const { GoogleSignin } = await loadGoogleSignin();
    GoogleSignin.configure({
      webClientId: web,
      iosClientId: ios ?? web,
      offlineAccess: false,
      forceCodeForRefreshToken: false,
    });
    googleConfigured = true;
    return true;
  } catch {
    return false;
  }
}

function googleNativeErrorMessage(e: unknown): string {
  const code = String((e as { code?: string }).code ?? '');
  const msg = e instanceof Error ? e.message : String(e);

  if (/SIGN_IN_CANCELLED|cancel|dismiss/i.test(code + msg)) return '';
  if (/IN_PROGRESS/i.test(code)) return 'Google sign-in is already in progress.';
  if (/PLAY_SERVICES/i.test(code + msg)) {
    return 'Google Play Services is missing or out of date on this device.';
  }
  if (/DEVELOPER_ERROR|10:|ApiException:\s*10/i.test(msg)) {
    return 'Google Sign-In is misconfigured for this build. Check Firebase SHA-1 / client IDs.';
  }
  return msg || 'Google sign-in failed';
}

interface AuthContextType {
  authEnabled: boolean;
  isReady: boolean;
  isExpoGo: boolean;
  googleSignInAvailable: boolean;
  user: User | null;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

setAuthTokenGetter(async () => {
  if (!auth?.currentUser) return null;
  try {
    return await auth.currentUser.getIdToken();
  } catch {
    return null;
  }
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(auth?.currentUser ?? null);
  const [isReady, setIsReady] = useState(!isFirebaseConfigured);

  useEffect(() => {
    if (!auth) {
      setIsReady(true);
      return;
    }
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setIsReady(true);
    });
    return unsub;
  }, []);

  const signInWithGoogle = useCallback(async () => {
    if (!auth) throw new Error('Firebase auth is not configured.');

    if (IS_EXPO_GO) {
      throw new Error(
        'Google Sign-In needs an installed app build (not Expo Go).\n\nUse email/password here, or run: npx expo run:ios / run:android',
      );
    }

    if (!isGoogleSignInConfigured()) {
      throw new Error('Google Sign-In is not configured. Add EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID.');
    }

    const ok = await ensureGoogleConfigured();
    if (!ok) {
      throw new Error('Google Sign-In is unavailable in this build.');
    }

    const { GoogleSignin, isSuccessResponse } = await loadGoogleSignin();

    if (Platform.OS === 'android') {
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
    }

    const response = await GoogleSignin.signIn();
    if (!isSuccessResponse(response)) return;

    const idToken = response.data.idToken;
    if (!idToken) {
      throw new Error('Google did not return an ID token. Try again.');
    }

    await signInWithCredential(auth, GoogleAuthProvider.credential(idToken));
  }, []);

  const signOut = useCallback(async () => {
    if (!auth) return;
    try {
      const { GoogleSignin } = await loadGoogleSignin();
      const current = GoogleSignin.getCurrentUser();
      if (current) await GoogleSignin.signOut();
    } catch {
      // ignore
    }
    await fbSignOut(auth);
  }, []);

  const value = useMemo<AuthContextType>(
    () => ({
      authEnabled: isFirebaseConfigured,
      isReady,
      isExpoGo: IS_EXPO_GO,
      googleSignInAvailable: isGoogleSignInConfigured(),
      user,
      async signInWithEmail(email, password) {
        if (!auth) throw new Error('Firebase auth is not configured.');
        await signInWithEmailAndPassword(auth, email, password);
      },
      async signUpWithEmail(email, password) {
        if (!auth) throw new Error('Firebase auth is not configured.');
        await createUserWithEmailAndPassword(auth, email, password);
      },
      signInWithGoogle,
      signOut,
    }),
    [isReady, signInWithGoogle, signOut, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

export { googleNativeErrorMessage };
