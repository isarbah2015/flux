import React, { useEffect, useState } from 'react';
import * as SplashScreen from 'expo-splash-screen';
import LoadingScreen from '@/components/LoadingScreen';
import { useAuth } from '@/context/AuthContext';

/**
 * Keeps the native splash visible until fonts + auth have resolved, then shows
 * the branded splash for a minimum beat so it's actually visible (boot often
 * resolves in <100ms, which would make the splash flash by unseen).
 *
 * Sequence: native splash → branded splash (min 3s) → login OR home
 */
const MIN_SPLASH_MS = 3000;

export default function BootstrapGate({
  fontsReady,
  children,
}: {
  fontsReady: boolean;
  children: React.ReactNode;
}) {
  const { authEnabled, isReady } = useAuth();
  const bootReady = fontsReady && (!authEnabled || isReady);
  const [minTimePassed, setMinTimePassed] = useState(false);

  // Hide the native splash as soon as fonts are ready so our branded splash
  // (which uses those fonts) can take over without a blank frame.
  useEffect(() => {
    if (fontsReady) {
      void SplashScreen.hideAsync();
    }
  }, [fontsReady]);

  useEffect(() => {
    const timer = setTimeout(() => setMinTimePassed(true), MIN_SPLASH_MS);
    return () => clearTimeout(timer);
  }, []);

  if (!bootReady || !minTimePassed) {
    return <LoadingScreen label="Starting Flux…" />;
  }

  return <>{children}</>;
}
