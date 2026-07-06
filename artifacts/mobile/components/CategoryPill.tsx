import React from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { useColors } from '@/hooks/useColors';
import { CATEGORY_COLORS, CATEGORY_LABELS } from '@/constants/colors';
import type { Category } from '@/context/ScreenshotsContext';

type FilterCategory = Category | 'all';

interface Props {
  value: FilterCategory;
  active: boolean;
  onPress: () => void;
}

const ALL_LABEL = 'All';

export default function CategoryPill({ value, active, onPress }: Props) {
  const colors = useColors();
  const label = value === 'all' ? ALL_LABEL : CATEGORY_LABELS[value];
  const catColor = value === 'all' ? colors.primary : CATEGORY_COLORS[value];

  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.pill,
        {
          backgroundColor: active ? catColor : colors.secondary,
          borderColor: active ? catColor : colors.border,
        },
      ]}
    >
      <Text
        style={[
          styles.label,
          { color: active ? '#fff' : colors.mutedForeground },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pill: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 8,
  },
  label: {
    fontSize: 13,
    fontFamily: 'Inter_600SemiBold',
  },
});
