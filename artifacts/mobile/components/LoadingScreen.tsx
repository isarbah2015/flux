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
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';

/**
 * Branded loading state shown while auth / onboarding / the first fetch resolve.
 * Uses the Feather zap mark (not the full app icon asset) — same as the last
 * known-stable boot screen before on-device SQLite / Google Sign-In landed.
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

  const glowStyle = useAnimatedStyle(() => ({
    opacity: 0.35 + pulse.value * 0.5,
    transform: [{ scale: 0.94 + pulse.value * 0.12 }],
  }));

  const ringStyle = useAnimatedStyle(() => ({
    opacity: 0.15 + pulse.value * 0.25,
    transform: [{ scale: 1 + pulse.value * 0.35 }],
  }));

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.center}>
        <Animated.View
          style={[styles.ring, { borderColor: colors.primary }, ringStyle]}
        />
        <Animated.View style={glowStyle}>
          <LinearGradient
            colors={[colors.primary, colors.accent]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.logo}
          >
            <Feather name="zap" size={30} color="#fff" />
          </LinearGradient>
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
    top: -18,
    width: 108,
    height: 108,
    borderRadius: 54,
    borderWidth: 2,
  },
  logo: {
    width: 72,
    height: 72,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
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
