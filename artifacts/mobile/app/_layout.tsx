import React, { useCallback, useEffect, useState } from 'react';
import AppLockOverlay from '@/components/AppLockOverlay';
import TestingModeBanner from '@/components/TestingModeBanner';
import { AppLockProvider, useAppLock } from '@/context/AppLockContext';
import { LogBox, StyleSheet, View } from 'react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import AnimatedSplash from '@/components/AnimatedSplash';
import BootFlowGate from '@/components/BootFlowGate';
import FirstScanExperience from '@/components/FirstScanExperience';
import { ScreenshotsProvider } from '@/context/ScreenshotsContext';
import { AuthProvider } from '@/context/AuthContext';
import { PremiumProvider } from '@/context/PremiumContext';
import { ProfileProvider } from '@/context/ProfileContext';
import { LocaleProvider } from '@/context/LocaleContext';
import { useBootReady } from '@/hooks/useBootReady';
import { Feather } from '@expo/vector-icons';
import {
  DMSans_400Regular,
  DMSans_500Medium,
  DMSans_600SemiBold,
  DMSans_700Bold,
  useFonts,
} from '@expo-google-fonts/dm-sans';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import '@/lib/api';
import { injectWebStyles } from '@/lib/webStyles';

injectWebStyles();
SplashScreen.preventAutoHideAsync();

if (__DEV__) {
  LogBox.ignoreLogs([
    '[Flux] Icon font load failed',
    '[Flux DB] FTS5 unavailable',
    '[Flux] local DB unavailable',
    'ACCESS_MEDIA_LOCATION',
    'ExifInterface',
  ]);
}

if (__DEV__) {
  const defaultHandler = (
    global as {
      ErrorUtils?: {
        getGlobalHandler?: () => (e: Error, isFatal?: boolean) => void;
        setGlobalHandler?: (h: (e: Error, isFatal?: boolean) => void) => void;
      };
    }
  ).ErrorUtils?.getGlobalHandler?.();
  (
    global as {
      ErrorUtils?: {
        setGlobalHandler?: (h: (e: Error, isFatal?: boolean) => void) => void;
      };
    }
  ).ErrorUtils?.setGlobalHandler?.((error, isFatal) => {
    // eslint-disable-next-line no-console
    console.error('[Flux] Uncaught error', isFatal ? '(fatal)' : '', error);
    defaultHandler?.(error, isFatal);
  });
}

const queryClient = new QueryClient();
const BOOT_BG = '#0C0C14';

function RootLayoutNav() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen
        name="screenshot/[id]"
        options={{ headerShown: false, presentation: 'card', animation: 'slide_from_right' }}
      />
      <Stack.Screen
        name="import"
        options={{ headerShown: false, presentation: 'modal', animation: 'slide_from_bottom' }}
      />
      <Stack.Screen
        name="profile"
        options={{ headerShown: false, presentation: 'card', animation: 'slide_from_right' }}
      />
      <Stack.Screen
        name="stats"
        options={{ headerShown: false, presentation: 'card', animation: 'slide_from_right' }}
      />
      <Stack.Screen
        name="language"
        options={{ headerShown: false, presentation: 'card', animation: 'slide_from_right' }}
      />
    </Stack>
  );
}

function AppShell() {
  const [splashDone, setSplashDone] = useState(false);
  const { bootReady } = useBootReady(splashDone);
  const { setGuardActive } = useAppLock();
  const finishSplash = useCallback(() => setSplashDone(true), []);

  useEffect(() => {
    setGuardActive(bootReady);
  }, [bootReady, setGuardActive]);

  return (
    <GestureHandlerRootView style={styles.root}>
      {bootReady && <RootLayoutNav />}
      {!splashDone && <AnimatedSplash onDone={finishSplash} />}
      {splashDone && !bootReady && <BootFlowGate />}
      {splashDone && bootReady && <FirstScanExperience />}
      {bootReady && <AppLockOverlay />}
      {bootReady && <TestingModeBanner />}
    </GestureHandlerRootView>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    DMSans_400Regular,
    DMSans_500Medium,
    DMSans_600SemiBold,
    DMSans_700Bold,
    ...Feather.font,
  });

  // Never block the app on fonts — a hung font load used to trap users on the native splash.
  const fontsReady = fontsLoaded || !!fontError;

  useEffect(() => {
    if (fontsReady) {
      void SplashScreen.hideAsync();
      return;
    }
    const fallback = setTimeout(() => {
      void SplashScreen.hideAsync();
    }, 2500);
    return () => clearTimeout(fallback);
  }, [fontsReady]);

  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <LocaleProvider>
            <AuthProvider>
              <PremiumProvider>
                <ProfileProvider>
                  <AppLockProvider>
                    <ScreenshotsProvider>
                      <AppShell />
                    </ScreenshotsProvider>
                  </AppLockProvider>
                </ProfileProvider>
              </PremiumProvider>
            </AuthProvider>
          </LocaleProvider>
        </QueryClientProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: BOOT_BG },
});
