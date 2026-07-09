import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
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

const TYPE_GRADIENTS: Record<string, [string, string, string]> = {
  price_drop: ['#1B3D2F', '#0F1F18', '#0C0C14'],
  price_watch: ['#1A2540', '#101828', '#0C0C14'],
  promise: ['#2A1F3D', '#181028', '#0C0C14'],
  calendar: ['#1F2A3D', '#121A28', '#0C0C14'],
};

interface Props {
  insight: Insight;
  index?: number;
}

export default function InsightCard({ insight, index = 0 }: Props) {
  const colors = useColors();
  const icon = TYPE_ICONS[insight.type] ?? 'zap';
  const gradient = TYPE_GRADIENTS[insight.type] ?? ['#1A1830', '#13131F', '#0C0C14'];

  function handlePress() {
    Haptics.selectionAsync();
    router.push(`/screenshot/${insight.screenshotId}`);
  }

  return (
    <Pressable
      onPress={handlePress}
      style={({ pressed }) => [
        styles.wrap,
        { transform: [{ scale: pressed ? 0.985 : 1 }] },
      ]}
    >
      <LinearGradient
        colors={gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.card, { borderColor: insight.colorHex + '35' }]}
      >
        {insight.urgent && (
          <LinearGradient
            colors={[insight.colorHex, insight.colorHex + '00']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.urgentBar}
          />
        )}

        <View style={styles.topRow}>
          <View style={[styles.iconOrb, { backgroundColor: insight.colorHex + '28' }]}>
            <Feather name={icon as keyof typeof Feather.glyphMap} size={18} color={insight.colorHex} />
          </View>
          <View style={styles.badgeRow}>
            {insight.urgent ? (
              <View style={[styles.liveBadge, { backgroundColor: insight.colorHex + '30' }]}>
                <View style={[styles.liveDot, { backgroundColor: insight.colorHex }]} />
                <Text style={[styles.liveText, { color: insight.colorHex }]}>LIVE</Text>
              </View>
            ) : null}
            <Text style={[styles.indexLabel, { color: colors.mutedForeground }]}>
              #{String(index + 1).padStart(2, '0')}
            </Text>
          </View>
        </View>

        <Text style={[styles.title, { color: colors.foreground }]} numberOfLines={2}>
          {insight.title}
        </Text>
        <Text style={[styles.subtitle, { color: colors.mutedForeground }]} numberOfLines={3}>
          {insight.subtitle}
        </Text>

        <View style={styles.footer}>
          <BlurView intensity={28} tint="dark" style={styles.actionPill}>
            <Text style={[styles.actionText, { color: insight.colorHex }]} numberOfLines={1}>
              {insight.actionLabel}
            </Text>
            <Feather name="arrow-up-right" size={14} color={insight.colorHex} />
          </BlurView>
        </View>
      </LinearGradient>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: { marginHorizontal: 20, marginBottom: 14 },
  card: {
    borderRadius: 22,
    borderWidth: 1,
    padding: 18,
    overflow: 'hidden',
    gap: 10,
  },
  urgentBar: { position: 'absolute', top: 0, left: 0, right: 0, height: 3 },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  iconOrb: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 20,
  },
  liveDot: { width: 6, height: 6, borderRadius: 3 },
  liveText: { fontSize: 10, fontFamily: 'DMSans_700Bold', letterSpacing: 0.8 },
  indexLabel: { fontSize: 11, fontFamily: 'DMSans_500Medium' },
  title: {
    fontSize: 17,
    fontFamily: 'DMSans_700Bold',
    lineHeight: 24,
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 13,
    fontFamily: 'DMSans_400Regular',
    lineHeight: 19,
  },
  footer: { marginTop: 4 },
  actionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    overflow: 'hidden',
  },
  actionText: { fontSize: 12, fontFamily: 'DMSans_600SemiBold' },
});
