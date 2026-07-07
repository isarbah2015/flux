import React, { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useColors } from '@/hooks/useColors';
import FluxLogo from '@/components/FluxLogo';

/**
 * Branded loading state shown while auth / onboarding / the first fetch resolve.
 */
export default function LoadingScreen({ label }: { label?: string }) {
  const colors = useColors();
  const pulse = useSharedValue(0);

  useEffect(() => {
    pulse.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 900, easing: Easing.out(Easing.quad) }),
        withTiming(0, { duration: 900, easing: Easing.in(Easing.quad) }),
      ),
      -1,
      false,
    );
  }, [pulse]);

  const logoStyle = useAnimatedStyle(() => ({
    opacity: 0.85 + pulse.value * 0.15,
    transform: [{ scale: 0.96 + pulse.value * 0.06 }],
  }));

  const ringStyle = useAnimatedStyle(() => ({
    opacity: 0.12 + pulse.value * 0.2,
    transform: [{ scale: 1 + pulse.value * 0.2 }],
  }));

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.center}>
        <Animated.View
          style={[styles.ring, { borderColor: colors.primary }, ringStyle]}
        />
        <Animated.View style={[styles.logoWrap, logoStyle]}>
          <FluxLogo size={88} />
        </Animated.View>
        <Text style={[styles.brand, { color: colors.foreground }]}>Flux</Text>
        <Text style={[styles.label, { color: colors.mutedForeground }]}>
          {label ?? 'Waking up your screenshot brain…'}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  center: { alignItems: 'center', gap: 14 },
  ring: {
    position: 'absolute',
    top: 0,
    width: 116,
    height: 116,
    borderRadius: 58,
    borderWidth: 2,
    zIndex: 0,
  },
  logoWrap: {
    zIndex: 2,
    marginTop: 14,
  },
  brand: {
    fontSize: 26,
    fontFamily: 'DMSans_700Bold',
    letterSpacing: -0.5,
    marginTop: 6,
  },
  label: {
    fontSize: 13,
    fontFamily: 'DMSans_400Regular',
  },
});
