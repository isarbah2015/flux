import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useColors } from '@/hooks/useColors';
import type { Insight } from '@/context/ScreenshotsContext';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';

const TYPE_ICONS: Record<string, string> = {
  price_drop: 'trending-down',
  price_watch: 'eye',
  promise: 'user-check',
  calendar: 'calendar',
};

interface Props {
  insight: Insight;
}

export default function InsightCard({ insight }: Props) {
  const colors = useColors();
  const icon = TYPE_ICONS[insight.type] ?? 'zap';

  function handlePress() {
    Haptics.selectionAsync();
    router.push(`/screenshot/${insight.screenshotId}`);
  }

  return (
    <Pressable
      onPress={handlePress}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: insight.colorHex + '0E',
          shadowColor: insight.urgent ? insight.colorHex : '#000',
          transform: [{ scale: pressed ? 0.97 : 1 }],
        },
      ]}
    >
      {/* Urgency glow strip at top */}
      {insight.urgent && (
        <View style={[styles.urgencyStrip, { backgroundColor: insight.colorHex }]} />
      )}

      <View style={styles.inner}>
        {/* Icon */}
        <View style={[styles.iconWrap, { backgroundColor: insight.colorHex + '25' }]}>
          <Feather name={icon as any} size={20} color={insight.colorHex} />
        </View>

        {/* Text */}
        <View style={styles.textBlock}>
          <Text style={[styles.title, { color: colors.foreground }]} numberOfLines={1}>
            {insight.title}
          </Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]} numberOfLines={2}>
            {insight.subtitle}
          </Text>
        </View>

        {/* Action chip */}
        <View style={[styles.chip, { backgroundColor: insight.colorHex + '22' }]}>
          <Text style={[styles.chipText, { color: insight.colorHex }]}>{insight.actionLabel}</Text>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 20,
    marginBottom: 10,
    borderRadius: 20,
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 18,
    elevation: 6,
  },
  urgencyStrip: {
    height: 3,
  },
  inner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 14,
  },
  iconWrap: {
    width: 46,
    height: 46,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  textBlock: {
    flex: 1,
    gap: 3,
  },
  title: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
    lineHeight: 20,
  },
  subtitle: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    lineHeight: 17,
  },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    flexShrink: 0,
  },
  chipText: {
    fontSize: 11,
    fontFamily: 'Inter_700Bold',
  },
});
