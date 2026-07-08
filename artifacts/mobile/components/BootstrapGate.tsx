import React, { useEffect } from 'react';
import * as SplashScreen from 'expo-splash-screen';
import LoadingScreen from '@/components/LoadingScreen';
import { useAuth } from '@/context/AuthContext';

/**
 * Keeps the native splash visible until fonts + auth have resolved, then routes
 * to login or home. (No artificial delay — that delayed mounting the app tree
 * and masked startup crashes.)
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
    if (fontsReady) {
      void SplashScreen.hideAsync();
    }
  }, [fontsReady]);

  if (!bootReady) {
    return <LoadingScreen label="Starting Flux…" />;
  }

  return <>{children}</>;
}
