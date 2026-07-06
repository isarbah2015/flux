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
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  return `${Math.floor(hrs / 24)}d`;
}

export default function ScreenshotCard({ item }: Props) {
  const colors = useColors();
  const catColor = CATEGORY_COLORS[item.category] ?? '#636384';
  const catIcon = CATEGORY_ICONS[item.category] ?? 'image';
  const catLabel = CATEGORY_LABELS[item.category] ?? 'Other';
  const hasInsight = !!(item.priceTracking?.priceDropped || item.promise || item.calendarEvent);

  return (
    <Pressable
      onPress={() => { Haptics.selectionAsync(); router.push(`/screenshot/${item.id}`); }}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: colors.card,
          shadowColor: catColor,
          transform: [{ scale: pressed ? 0.95 : 1 }],
        },
      ]}
    >
      {/* Thumbnail - only this area clips */}
      <View style={[styles.thumbnail, { backgroundColor: catColor + '16' }]}>
        {/* Soft corner accent */}
        <View style={[styles.accentCorner, { backgroundColor: catColor + '30' }]} />
        <View style={[styles.iconWrap, { backgroundColor: catColor + '28' }]}>
          <Feather name={catIcon as any} size={26} color={catColor} />
        </View>
        {hasInsight && (
          <View style={[styles.insightBadge, { backgroundColor: catColor }]}>
            <Feather name="zap" size={9} color="#fff" />
          </View>
        )}
        <Text style={[styles.timeStamp, { color: catColor + 'BB' }]}>{timeAgo(item.capturedAt)}</Text>
      </View>

      {/* Content – no border, just breathes */}
      <View style={styles.content}>
        <Text style={[styles.category, { color: catColor }]}>{catLabel.toUpperCase()}</Text>
        <Text style={[styles.summary, { color: colors.foreground }]} numberOfLines={2}>
          {item.summary}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    margin: 6,
    borderRadius: 20,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
  thumbnail: {
    height: 118,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    position: 'relative',
  },
  accentCorner: {
    position: 'absolute',
    top: -24,
    right: -24,
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  iconWrap: {
    width: 54,
    height: 54,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  insightBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timeStamp: {
    position: 'absolute',
    bottom: 8,
    right: 10,
    fontSize: 10,
    fontFamily: 'DMSans_500Medium',
  },
  content: {
    padding: 12,
    paddingTop: 10,
    gap: 4,
  },
  category: {
    fontSize: 9,
    fontFamily: 'DMSans_700Bold',
    letterSpacing: 1.2,
  },
  summary: {
    fontSize: 12,
    fontFamily: 'DMSans_500Medium',
    lineHeight: 17,
  },
});
