import React, { useEffect, useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { ScreenshotsProvider } from '@/context/ScreenshotsContext';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { PremiumProvider } from '@/context/PremiumContext';
import { ProfileProvider } from '@/context/ProfileContext';
import LoginScreen from '@/components/LoginScreen';
import BootstrapGate from '@/components/BootstrapGate';
import OnboardingGate from '@/components/OnboardingGate';
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

const queryClient = new QueryClient();

function AuthGate({ children }: { children: React.ReactNode }) {
  const { authEnabled, user } = useAuth();
  if (authEnabled && !user) return <LoginScreen />;
  return <>{children}</>;
}

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
    </Stack>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    DMSans_400Regular,
    DMSans_500Medium,
    DMSans_600SemiBold,
    DMSans_700Bold,
  });

  const fontsReady = fontsLoaded || !!fontError;

  if (!fontsReady) return null;

  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <BootstrapGate fontsReady={fontsReady}>
              <PremiumProvider>
                <ProfileProvider>
                  <ScreenshotsProvider>
                    <GestureHandlerRootView style={{ flex: 1 }}>
                      <KeyboardProvider>
                        <AuthGate>
                          <OnboardingGate>
                            <RootLayoutNav />
                          </OnboardingGate>
                        </AuthGate>
                      </KeyboardProvider>
                    </GestureHandlerRootView>
                  </ScreenshotsProvider>
                </ProfileProvider>
              </PremiumProvider>
            </BootstrapGate>
          </AuthProvider>
        </QueryClientProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
