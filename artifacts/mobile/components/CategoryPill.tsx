import React from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { useColors } from '@/hooks/useColors';
import { CATEGORY_COLORS, CATEGORY_LABELS } from '@/constants/colors';
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
  const label = value === 'all' ? 'All' : CATEGORY_LABELS[value];
  const catColor = value === 'all' ? colors.primary : CATEGORY_COLORS[value];

  return (
    <Pressable
      onPress={() => { Haptics.selectionAsync(); onPress(); }}
      style={({ pressed }) => [
        styles.pill,
        {
          backgroundColor: active ? catColor : colors.secondary,
          transform: [{ scale: pressed ? 0.93 : 1 }],
        },
      ]}
    >
      <Text style={[styles.label, { color: active ? '#fff' : colors.mutedForeground }]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 22,
    marginRight: 8,
  },
  label: {
    fontSize: 13,
    fontFamily: 'DMSans_600SemiBold',
  },
});
