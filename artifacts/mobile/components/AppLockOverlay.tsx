import React, { useCallback } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { Feather } from '@expo/vector-icons';
import FluxLogo from '@/components/FluxLogo';
import { useAppLock } from '@/context/AppLockContext';
import { useColors } from '@/hooks/useColors';
import { useScreenInsets } from '@/hooks/useScreenInsets';

export default function AppLockOverlay() {
  const colors = useColors();
  const { topPad, bottomPad } = useScreenInsets();
  const { isLocked, biometricLabel, unlock } = useAppLock();
  const [busy, setBusy] = React.useState(false);

  const onUnlock = useCallback(async () => {
    if (busy) return;
    setBusy(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      await unlock();
    } finally {
      setBusy(false);
    }
  }, [busy, unlock]);

  if (!isLocked) return null;

  return (
    <View
      style={[styles.overlay, { backgroundColor: colors.background, paddingTop: topPad, paddingBottom: bottomPad }]}
      accessibilityViewIsModal
    >
      <View style={styles.content}>
        <FluxLogo size={72} />
        <Text style={[styles.title, { color: colors.foreground }]}>Flux is locked</Text>
        <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
          Use {biometricLabel} or your device passcode to open your screenshot library.
        </Text>

        <Pressable
          onPress={() => void onUnlock()}
          disabled={busy}
          style={({ pressed }) => [
            styles.button,
            { backgroundColor: colors.primary, opacity: pressed || busy ? 0.85 : 1 },
          ]}
        >
          {busy ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Feather name="unlock" size={18} color="#fff" />
              <Text style={styles.buttonText}>Unlock with {biometricLabel}</Text>
            </>
          )}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 100,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 28,
  },
  content: {
    width: '100%',
    maxWidth: 340,
    alignItems: 'center',
    gap: 14,
  },
  title: {
    fontSize: 22,
    fontFamily: 'DMSans_700Bold',
    marginTop: 8,
  },
  subtitle: {
    fontSize: 15,
    fontFamily: 'DMSans_400Regular',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 8,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    minHeight: 52,
    width: '100%',
    borderRadius: 14,
    paddingHorizontal: 20,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'DMSans_600SemiBold',
  },
});
