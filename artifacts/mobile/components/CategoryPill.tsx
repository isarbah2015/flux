import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { CATEGORY_COLORS, CATEGORY_ICONS, CATEGORY_LABELS } from '@/constants/colors';
import type { Category } from '@/context/ScreenshotsContext';
import * as Haptics from 'expo-haptics';

type FilterCategory = Category | 'all';

interface Props {
  value: FilterCategory;
  active: boolean;
  onPress: () => void;
}

export default function CategoryPill({ value, active, onPress }: Props) {
  const colors = useColors();

  const label    = value === 'all' ? 'All'          : CATEGORY_LABELS[value];
  const icon     = value === 'all' ? 'layers'       : CATEGORY_ICONS[value];
  const catColor = value === 'all' ? colors.primary : CATEGORY_COLORS[value];

  return (
    <Pressable
      onPress={() => { Haptics.selectionAsync(); onPress(); }}
      style={({ pressed }) => [
        styles.pill,
        active
          ? { backgroundColor: catColor + '22', borderColor: catColor + '70' }
          : { backgroundColor: colors.card,     borderColor: colors.border + '80' },
        pressed && { transform: [{ scale: 0.93 }], opacity: 0.85 },
      ]}
    >
      {/* Icon dot */}
      <View style={[styles.iconWrap, { backgroundColor: catColor + (active ? '33' : '20') }]}>
        <Feather
          name={icon as any}
          size={11}
          color={active ? catColor : colors.mutedForeground}
        />
      </View>

      {/* Label */}
      <Text
        style={[
          styles.label,
          { color: active ? catColor : colors.mutedForeground },
        ]}
      >
        {label}
      </Text>

      {/* Active indicator dot */}
      {active && <View style={[styles.activeDot, { backgroundColor: catColor }]} />}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 24,
    borderWidth: 1,
    marginRight: 8,
  },
  iconWrap: {
    width: 20,
    height: 20,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: 13,
    fontFamily: 'DMSans_600SemiBold',
    letterSpacing: 0.1,
  },
  activeDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    marginLeft: 2,
  },
});
