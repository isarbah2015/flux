import React, { lazy, Suspense } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import OnboardingScreen from '@/components/OnboardingScreen';
import { useBootReady } from '@/hooks/useBootReady';
import { useColors } from '@/hooks/useColors';

const LoginScreen = lazy(() => import('@/components/LoginScreen'));

function BootSpinner() {
  const colors = useColors();
  return (
    <View style={[styles.overlay, { backgroundColor: colors.background }]}>
      <ActivityIndicator color={colors.primary} size="large" />
    </View>
  );
}

/** Full-screen boot overlays — main stack stays hidden until bootReady. */
export default function BootFlowGate() {
  const { phase } = useBootReady(true);

  if (phase === 'checking') {
    return <BootSpinner />;
  }

  if (phase === 'onboarding') {
    return (
      <View style={styles.overlay}>
        <OnboardingScreen />
      </View>
    );
  }

  if (phase === 'login') {
    return (
      <View style={styles.overlay}>
        <Suspense fallback={<BootSpinner />}>
          <LoginScreen />
        </Suspense>
      </View>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 9000,
  },
});
