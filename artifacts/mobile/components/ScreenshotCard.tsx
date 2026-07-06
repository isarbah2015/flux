import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useColors } from '@/hooks/useColors';
import { CATEGORY_COLORS, CATEGORY_ICONS, CATEGORY_LABELS } from '@/constants/colors';
import type { Screenshot } from '@/context/ScreenshotsContext';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';

interface Props {
  item: Screenshot;
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export default function ScreenshotCard({ item }: Props) {
  const colors = useColors();
  const catColor = CATEGORY_COLORS[item.category] ?? '#636384';
  const catIcon = CATEGORY_ICONS[item.category] ?? 'image';
  const catLabel = CATEGORY_LABELS[item.category] ?? 'Other';

  const hasBadge = !!(item.priceTracking?.priceDropped || item.promise || item.calendarEvent);

  function handlePress() {
    Haptics.selectionAsync();
    router.push(`/screenshot/${item.id}`);
  }

  return (
    <Pressable
      onPress={handlePress}
      style={({ pressed }) => [styles.card, { backgroundColor: colors.card, borderColor: colors.border, opacity: pressed ? 0.85 : 1 }]}
    >
      {/* Thumbnail */}
      <View style={[styles.thumbnail, { backgroundColor: catColor + '18' }]}>
        <View style={[styles.accentBar, { backgroundColor: catColor }]} />
        <View style={styles.iconWrap}>
          <Feather name={catIcon as any} size={26} color={catColor} />
        </View>
        {hasBadge && (
          <View style={[styles.badge, { backgroundColor: catColor }]}>
            <Feather name="zap" size={8} color="#fff" />
          </View>
        )}
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <View style={[styles.catPill, { backgroundColor: catColor + '22' }]}>
          <Text style={[styles.catText, { color: catColor }]}>{catLabel}</Text>
        </View>
        <Text style={[styles.summary, { color: colors.foreground }]} numberOfLines={2}>
          {item.summary}
        </Text>
        <Text style={[styles.time, { color: colors.mutedForeground }]}>{timeAgo(item.capturedAt)}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    margin: 5,
    borderRadius: 14,
    borderWidth: 1,
    overflow: 'hidden',
  },
  thumbnail: {
    height: 130,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  accentBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 3,
  },
  iconWrap: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footer: {
    padding: 10,
    gap: 5,
  },
  catPill: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 20,
  },
  catText: {
    fontSize: 10,
    fontFamily: 'Inter_600SemiBold',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  summary: {
    fontSize: 12,
    fontFamily: 'Inter_500Medium',
    lineHeight: 17,
  },
  time: {
    fontSize: 11,
    fontFamily: 'Inter_400Regular',
  },
});
