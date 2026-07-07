import React, { useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { ScreenshotsProvider } from '@/context/ScreenshotsContext';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { PremiumProvider } from '@/context/PremiumContext';
import LoginScreen from '@/components/LoginScreen';
import {
  DMSans_400Regular,
  DMSans_500Medium,
  DMSans_600SemiBold,
  DMSans_700Bold,
  useFonts,
} from '@expo-google-fonts/dm-sans';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
// Side-effect import: configures the API client base URL at startup.
import '@/lib/api';
import { injectWebStyles } from '@/lib/webStyles';

injectWebStyles();

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

/** Renders the login screen when Firebase auth is enabled and no user is signed in. */
function AuthGate({ children }: { children: React.ReactNode }) {
  const { authEnabled, isReady, user } = useAuth();
  if (authEnabled && !isReady) return null; // resolving persisted session
  if (authEnabled && !user) return <LoginScreen />;
  return <>{children}</>;
}

function RootLayoutNav() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen
        name="screenshot/[id]"
        options={{
          headerShown: false,
          presentation: 'card',
          animation: 'slide_from_right',
        }}
      />
      <Stack.Screen
        name="import"
        options={{
          headerShown: false,
          presentation: 'modal',
          animation: 'slide_from_bottom',
        }}
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

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;

  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <PremiumProvider>
              <ScreenshotsProvider>
                <GestureHandlerRootView>
                  <KeyboardProvider>
                    <AuthGate>
                      <RootLayoutNav />
                    </AuthGate>
                  </KeyboardProvider>
                </GestureHandlerRootView>
              </ScreenshotsProvider>
            </PremiumProvider>
          </AuthProvider>
        </QueryClientProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
