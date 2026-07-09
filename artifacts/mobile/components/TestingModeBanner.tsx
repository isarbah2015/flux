import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { isTestingBuild } from '@/lib/flux-env';

export default function TestingModeBanner() {
  const insets = useSafeAreaInsets();

  if (!isTestingBuild) return null;

  return (
    <View pointerEvents="none" style={[styles.wrap, { top: insets.top + 6 }]}>
      <View style={styles.pill}>
        <Text style={styles.label}>Testing build</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 100,
    alignItems: 'center',
  },
  pill: {
    backgroundColor: 'rgba(255, 149, 0, 0.92)',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  label: {
    color: '#1a1200',
    fontSize: 11,
    fontFamily: 'DMSans_700Bold',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
});
