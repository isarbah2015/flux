import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useColors } from '@/hooks/useColors';
import { CATEGORY_COLORS, CATEGORY_ICONS, CATEGORY_LABELS } from '@/constants/colors';
import type { Screenshot } from '@/context/ScreenshotsContext';
import ScreenshotImage from '@/components/ScreenshotImage';
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
          transform: [{ scale: pressed ? 0.97 : 1 }],
        },
      ]}
    >
      <View style={styles.thumbWrap}>
        <ScreenshotImage
          imageUri={item.imageUri}
          localAssetId={item.localAssetId}
          fallbackColor={catColor}
          style={styles.thumbnail}
          iconSize={24}
        />

        <View style={[styles.catPill, { backgroundColor: catColor + 'E8' }]}>
          <Feather name={catIcon as keyof typeof Feather.glyphMap} size={9} color="#fff" />
          <Text style={styles.catPillText} numberOfLines={1}>
            {catLabel}
          </Text>
        </View>

        {hasInsight && (
          <View style={[styles.insightBadge, { backgroundColor: catColor }]}>
            <Feather name="zap" size={9} color="#fff" />
          </View>
        )}

        <View style={styles.timePill}>
          <Text style={styles.timeStamp}>{timeAgo(item.capturedAt)}</Text>
        </View>
      </View>

      <View style={styles.content}>
        <Text
          style={[styles.summary, { color: colors.foreground }]}
          numberOfLines={2}
          ellipsizeMode="tail"
        >
          {item.summary}
        </Text>
        {item.extractedText ? (
          <Text
            style={[styles.preview, { color: colors.mutedForeground }]}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {item.extractedText}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}

const THUMB_H = 124;

const styles = StyleSheet.create({
  card: {
    flex: 1,
    margin: 6,
    borderRadius: 18,
    borderWidth: 1,
    overflow: 'hidden',
  },
  thumbWrap: {
    height: THUMB_H,
    width: '100%',
    position: 'relative',
  },
  thumbnail: {
    height: THUMB_H,
    width: '100%',
  },
  catPill: {
    position: 'absolute',
    top: 8,
    left: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 4,
    borderRadius: 8,
    maxWidth: '72%',
  },
  catPillText: {
    color: '#fff',
    fontSize: 8,
    fontFamily: 'DMSans_700Bold',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    flexShrink: 1,
    includeFontPadding: false,
  },
  insightBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timePill: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 7,
    backgroundColor: 'rgba(10,10,16,0.78)',
  },
  timeStamp: {
    fontSize: 9,
    fontFamily: 'DMSans_600SemiBold',
    color: 'rgba(255,255,255,0.92)',
    includeFontPadding: false,
  },
  content: {
    paddingHorizontal: 11,
    paddingTop: 9,
    paddingBottom: 11,
    gap: 3,
    minHeight: 52,
  },
  summary: {
    fontSize: 12,
    fontFamily: 'DMSans_600SemiBold',
    lineHeight: 16,
    includeFontPadding: false,
  },
  preview: {
    fontSize: 10,
    fontFamily: 'DMSans_400Regular',
    lineHeight: 14,
    includeFontPadding: false,
  },
});
