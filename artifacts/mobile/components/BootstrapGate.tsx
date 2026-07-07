import React, { useEffect } from 'react';
import * as SplashScreen from 'expo-splash-screen';
import LoadingScreen from '@/components/LoadingScreen';
import { useAuth } from '@/context/AuthContext';

/**
 * Keeps the native splash visible until fonts + auth have resolved, then shows
 * one branded loading frame before routing to login or home.
 *
 * Sequence: native splash → branded splash → login OR home
 */
export default function BootstrapGate({
  fontsReady,
  children,
}: {
  fontsReady: boolean;
  children: React.ReactNode;
}) {
  const { authEnabled, isReady } = useAuth();
  const bootReady = fontsReady && (!authEnabled || isReady);

  useEffect(() => {
    if (bootReady) {
      void SplashScreen.hideAsync();
    }
  }, [bootReady]);

  if (!bootReady) {
    return <LoadingScreen label="Starting Flux…" />;
  }

  return <>{children}</>;
}
