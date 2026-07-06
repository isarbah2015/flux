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
          backgroundColor: colors.card,
          borderColor: insight.urgent ? insight.colorHex + '55' : colors.border,
          opacity: pressed ? 0.85 : 1,
        },
      ]}
    >
      {/* Left accent */}
      <View style={[styles.accentBar, { backgroundColor: insight.colorHex }]} />

      {/* Icon */}
      <View style={[styles.iconWrap, { backgroundColor: insight.colorHex + '22' }]}>
        <Feather name={icon as any} size={18} color={insight.colorHex} />
      </View>

      {/* Text */}
      <View style={styles.content}>
        <View style={styles.titleRow}>
          <Text style={[styles.title, { color: colors.foreground }]} numberOfLines={1}>
            {insight.title}
          </Text>
          {insight.urgent && (
            <View style={[styles.urgentDot, { backgroundColor: insight.colorHex }]} />
          )}
        </View>
        <Text style={[styles.subtitle, { color: colors.mutedForeground }]} numberOfLines={2}>
          {insight.subtitle}
        </Text>
      </View>

      {/* Action */}
      <View style={[styles.actionBadge, { backgroundColor: insight.colorHex + '22' }]}>
        <Text style={[styles.actionText, { color: insight.colorHex }]}>{insight.actionLabel}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 10,
    borderRadius: 14,
    borderWidth: 1,
    overflow: 'hidden',
    paddingRight: 12,
    paddingVertical: 14,
    gap: 12,
  },
  accentBar: {
    width: 4,
    alignSelf: 'stretch',
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    gap: 3,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  title: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
    flex: 1,
  },
  urgentDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  subtitle: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    lineHeight: 17,
  },
  actionBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  actionText: {
    fontSize: 11,
    fontFamily: 'Inter_700Bold',
  },
});
