import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
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
import { isExpoGo } from '@/lib/runtime';

const IS_EXPO_GO = isExpoGo;

let googleConfigured = false;

async function loadGoogleSignin() {
  if (IS_EXPO_GO) {
    return import('@/lib/google-sign-in-stub');
  }
  // Direct import — same as when Google Sign-In last worked on dev builds.
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
  } catch (err) {
    if (__DEV__) {
      // eslint-disable-next-line no-console
      console.error('[Flux] GoogleSignin.configure failed:', err);
    }
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

const GUEST_MODE_KEY = 'flux_guest_mode';

interface AuthContextType {
  authEnabled: boolean;
  isReady: boolean;
  guestModeChecked: boolean;
  isExpoGo: boolean;
  googleSignInAvailable: boolean;
  guestMode: boolean;
  user: User | null;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  continueAsGuest: () => Promise<void>;
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
  const [guestMode, setGuestMode] = useState(false);
  const [guestModeChecked, setGuestModeChecked] = useState(!isFirebaseConfigured);

  useEffect(() => {
    void (async () => {
      const stored = await AsyncStorage.getItem(GUEST_MODE_KEY);
      if (stored === '1') setGuestMode(true);
      setGuestModeChecked(true);
    })();
  }, []);

  useEffect(() => {
    if (!auth) {
      setIsReady(true);
      return;
    }
    const timeout = setTimeout(() => setIsReady(true), 6000);
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setIsReady(true);
      clearTimeout(timeout);
    });
    return () => {
      unsub();
      clearTimeout(timeout);
    };
  }, []);

  const signInWithGoogle = useCallback(async () => {
    if (!auth) throw new Error('Firebase auth is not configured.');

    if (IS_EXPO_GO) {
      throw new Error(
        'Google Sign-In needs an installed app build (not Expo Go).\n\nUse email/password here, or run: npx expo run:android',
      );
    }

    if (!isGoogleSignInConfigured()) {
      throw new Error('Google Sign-In is not configured. Add EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID.');
    }

    const ok = await ensureGoogleConfigured();
    if (!ok) {
      throw new Error('Google Sign-In failed to initialize. Rebuild the app (npx expo run:android).');
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
    await AsyncStorage.removeItem(GUEST_MODE_KEY);
    setGuestMode(false);
  }, []);

  const continueAsGuest = useCallback(async () => {
    await AsyncStorage.setItem(GUEST_MODE_KEY, '1');
    setGuestMode(true);
  }, []);

  const signOut = useCallback(async () => {
    await AsyncStorage.removeItem(GUEST_MODE_KEY);
    setGuestMode(false);
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
      guestModeChecked,
      isExpoGo: IS_EXPO_GO,
      googleSignInAvailable: isGoogleSignInConfigured() && !IS_EXPO_GO,
      guestMode,
      user,
      async signInWithEmail(email, password) {
        if (!auth) throw new Error('Firebase auth is not configured.');
        await signInWithEmailAndPassword(auth, email, password);
        await AsyncStorage.removeItem(GUEST_MODE_KEY);
        setGuestMode(false);
      },
      async signUpWithEmail(email, password) {
        if (!auth) throw new Error('Firebase auth is not configured.');
        await createUserWithEmailAndPassword(auth, email, password);
        await AsyncStorage.removeItem(GUEST_MODE_KEY);
        setGuestMode(false);
      },
      signInWithGoogle,
      continueAsGuest,
      signOut,
    }),
    [continueAsGuest, guestMode, guestModeChecked, isReady, signInWithGoogle, signOut, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

export { googleNativeErrorMessage };
