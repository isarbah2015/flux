import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { useLocale } from '@/context/LocaleContext';
import { CATEGORY_COLORS, CATEGORY_ICONS } from '@/constants/colors';
import type { FilterCategory } from '@/constants/categories';
import * as Haptics from 'expo-haptics';

interface Props {
  value: FilterCategory;
  active: boolean;
  count?: number;
  dimmed?: boolean;
  onPress: () => void;
}

export default function CategoryPill({ value, active, count = 0, dimmed = false, onPress }: Props) {
  const colors = useColors();
  const { t } = useLocale();

  const label = t(value === 'all' ? 'category.all' : (`category.${value}` as 'category.shopping'));
  const icon = value === 'all' ? 'layers' : CATEGORY_ICONS[value];
  const accent = value === 'all' ? colors.primary : CATEGORY_COLORS[value];
  const showCount = value !== 'all' && count > 0;

  return (
    <Pressable
      onPress={() => {
        Haptics.selectionAsync();
        onPress();
      }}
      style={({ pressed }) => [
        styles.hitArea,
        dimmed && !active && styles.dimmed,
        pressed && { opacity: 0.85, transform: [{ scale: 0.97 }] },
      ]}
    >
      {active ? (
        <LinearGradient
          colors={[accent, accent + 'CC']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.pill, styles.pillActive, { shadowColor: accent }]}
        >
          <Feather name={icon as keyof typeof Feather.glyphMap} size={11} color="#fff" />
          <Text style={styles.labelActive} numberOfLines={1}>
            {label}
          </Text>
          {showCount ? (
            <View style={styles.countActive}>
              <Text style={styles.countTextActive}>{count}</Text>
            </View>
          ) : null}
        </LinearGradient>
      ) : (
        <View style={[styles.pill, styles.pillInactive, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Feather name={icon as keyof typeof Feather.glyphMap} size={11} color={colors.mutedForeground} />
          <Text style={[styles.label, { color: colors.mutedForeground }]} numberOfLines={1}>
            {label}
          </Text>
          {showCount ? (
            <View style={[styles.count, { backgroundColor: colors.secondary }]}>
              <Text style={[styles.countText, { color: colors.mutedForeground }]}>{count}</Text>
            </View>
          ) : null}
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  hitArea: {
    marginRight: 8,
  },
  dimmed: {
    opacity: 0.42,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    height: 36,
  },
  pillInactive: {
    borderWidth: 1,
  },
  pillActive: {
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.28,
    shadowRadius: 8,
    elevation: 4,
  },
  label: {
    fontSize: 12,
    fontFamily: 'DMSans_600SemiBold',
    includeFontPadding: false,
    maxWidth: 88,
  },
  labelActive: {
    fontSize: 12,
    fontFamily: 'DMSans_700Bold',
    color: '#fff',
    includeFontPadding: false,
    maxWidth: 88,
  },
  count: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
  },
  countActive: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
    backgroundColor: 'rgba(255,255,255,0.22)',
  },
  countText: {
    fontSize: 10,
    fontFamily: 'DMSans_700Bold',
    includeFontPadding: false,
  },
  countTextActive: {
    fontSize: 10,
    fontFamily: 'DMSans_700Bold',
    color: '#fff',
    includeFontPadding: false,
  },
});
