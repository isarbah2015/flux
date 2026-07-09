import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useColors } from '@/hooks/useColors';
import FluxLogo from '@/components/FluxLogo';

/**
 * Branded loading state shown while auth / onboarding / the first fetch resolve.
 * Uses only core RN views (no Reanimated) to avoid Hermes SIGSEGV on cold start.
 */
export default function LoadingScreen({ label }: { label?: string }) {
  const colors = useColors();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.center}>
        <View style={[styles.ring, { borderColor: colors.primary }]} />
        <FluxLogo size={88} />
        <Text style={[styles.brand, { color: colors.foreground }]}>Flux</Text>
        <ActivityIndicator color={colors.primary} style={styles.spinner} />
        <Text style={[styles.label, { color: colors.mutedForeground }]}>
          {label ?? 'Waking up your screenshot brain…'}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  center: { alignItems: 'center', gap: 12 },
  ring: {
    position: 'absolute',
    top: 0,
    width: 116,
    height: 116,
    borderRadius: 58,
    borderWidth: 2,
    opacity: 0.25,
  },
  brand: {
    fontSize: 26,
    fontFamily: 'DMSans_700Bold',
    letterSpacing: -0.5,
    marginTop: 6,
  },
  spinner: { marginTop: 4 },
  label: {
    fontSize: 13,
    fontFamily: 'DMSans_400Regular',
    textAlign: 'center',
    maxWidth: 280,
  },
});
