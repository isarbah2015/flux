import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
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
      onPress={() => {
        Haptics.selectionAsync();
        router.push(`/screenshot/${item.id}`);
      }}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
          transform: [{ scale: pressed ? 0.96 : 1 }],
        },
      ]}
    >
      <LinearGradient
        colors={[catColor + '28', catColor + '08', colors.card]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.thumbnail}
      >
        <View style={[styles.accentCorner, { backgroundColor: catColor + '35' }]} />
        <View style={[styles.iconWrap, { backgroundColor: catColor + '30' }]}>
          <Feather name={catIcon as keyof typeof Feather.glyphMap} size={26} color={catColor} />
        </View>
        {hasInsight && (
          <View style={[styles.insightBadge, { backgroundColor: catColor }]}>
            <Feather name="zap" size={9} color="#fff" />
          </View>
        )}
        <View style={[styles.timePill, { backgroundColor: colors.background + 'CC' }]}>
          <Text style={[styles.timeStamp, { color: colors.mutedForeground }]}>
            {timeAgo(item.capturedAt)}
          </Text>
        </View>
      </LinearGradient>

      <View style={styles.content}>
        <Text style={[styles.category, { color: catColor }]}>{catLabel.toUpperCase()}</Text>
        <Text style={[styles.summary, { color: colors.foreground }]} numberOfLines={2}>
          {item.summary}
        </Text>
        {item.tags.length > 0 && (
          <Text style={[styles.tagLine, { color: colors.mutedForeground }]} numberOfLines={1}>
            {item.tags.slice(0, 3).join(' · ')}
          </Text>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    margin: 6,
    borderRadius: 20,
    borderWidth: 1,
    overflow: 'hidden',
  },
  thumbnail: {
    height: 118,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    position: 'relative',
  },
  accentCorner: {
    position: 'absolute',
    top: -28,
    right: -28,
    width: 90,
    height: 90,
    borderRadius: 45,
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
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timePill: {
    position: 'absolute',
    bottom: 8,
    right: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  timeStamp: {
    fontSize: 10,
    fontFamily: 'DMSans_500Medium',
  },
  content: {
    padding: 12,
    paddingTop: 10,
    gap: 3,
  },
  category: {
    fontSize: 9,
    fontFamily: 'DMSans_700Bold',
    letterSpacing: 1.2,
  },
  summary: {
    fontSize: 12,
    fontFamily: 'DMSans_600SemiBold',
    lineHeight: 17,
  },
  tagLine: {
    fontSize: 10,
    fontFamily: 'DMSans_400Regular',
    marginTop: 2,
  },
});
