import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut as fbSignOut,
  type User,
} from 'firebase/auth';
import { setAuthTokenGetter } from '@workspace/api-client-react';
import { auth, isFirebaseConfigured } from '@/lib/firebase';

interface AuthContextType {
  /** Whether Firebase auth is configured. When false, the login gate is skipped. */
  authEnabled: boolean;
  /** True once the initial auth state has resolved. */
  isReady: boolean;
  user: User | null;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

// Register the bearer-token source for every API call. Returns the current
// Firebase ID token, or null when auth is disabled / signed out.
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

  const value = useMemo<AuthContextType>(
    () => ({
      authEnabled: isFirebaseConfigured,
      isReady,
      user,
      async signInWithEmail(email, password) {
        if (!auth) throw new Error('Firebase auth is not configured.');
        await signInWithEmailAndPassword(auth, email, password);
      },
      async signUpWithEmail(email, password) {
        if (!auth) throw new Error('Firebase auth is not configured.');
        await createUserWithEmailAndPassword(auth, email, password);
      },
      async signOut() {
        if (!auth) return;
        await fbSignOut(auth);
      },
    }),
    [isReady, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
