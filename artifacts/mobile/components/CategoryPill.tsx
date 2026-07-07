import React, { useEffect, useRef } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
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

// Lighten a hex color by mixing it toward white
function lighten(hex: string, amount = 0.35): string {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.min(255, Math.round(((n >> 16) & 0xff) + (255 - ((n >> 16) & 0xff)) * amount));
  const g = Math.min(255, Math.round(((n >> 8)  & 0xff) + (255 - ((n >> 8)  & 0xff)) * amount));
  const b = Math.min(255, Math.round(( n        & 0xff) + (255 - ( n        & 0xff)) * amount));
  return `#${[r, g, b].map(v => v.toString(16).padStart(2, '0')).join('')}`;
}

export default function CategoryPill({ value, active, onPress }: Props) {
  const colors = useColors();

  const label  = value === 'all' ? 'All'    : CATEGORY_LABELS[value];
  const icon   = value === 'all' ? 'layers' : CATEGORY_ICONS[value];
  const accent = value === 'all' ? colors.primary : CATEGORY_COLORS[value];
  const light  = lighten(accent, 0.3);

  // Native-driver opacity cross-fade between two rendered states
  const fadeActive = useRef(new Animated.Value(active ? 1 : 0)).current;

  useEffect(() => {
    Animated.spring(fadeActive, {
      toValue: active ? 1 : 0,
      useNativeDriver: true,
      speed: 30,
      bounciness: 4,
    }).start();
  }, [active]);

  const fadeInactive = fadeActive.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0],
  });

  return (
    <Pressable
      onPress={() => { Haptics.selectionAsync(); onPress(); }}
      style={({ pressed }) => [
        styles.hitArea,
        pressed && { opacity: 0.75, transform: [{ scale: 0.93 }] },
      ]}
    >
      <View style={styles.pillBase}>

        {/* ── INACTIVE layer ── */}
        <Animated.View
          pointerEvents={active ? 'none' : 'auto'}
          style={[StyleSheet.absoluteFill, styles.layer, styles.inactiveLayer,
            { borderColor: colors.border + '70',
              backgroundColor: colors.card,
              opacity: fadeInactive },
          ]}
        >
          <View style={[styles.iconWrap, { backgroundColor: colors.secondary }]}>
            <Feather name={icon as any} size={11} color={colors.mutedForeground} />
          </View>
          <Text style={[styles.label, { color: colors.mutedForeground }]}>{label}</Text>
        </Animated.View>

        {/* ── ACTIVE layer ── */}
        <Animated.View
          pointerEvents={active ? 'auto' : 'none'}
          style={[StyleSheet.absoluteFill, styles.layer,
            { opacity: fadeActive,
              // colored glow
              shadowColor: accent,
              shadowOffset: { width: 0, height: 6 },
              shadowOpacity: 0.55,
              shadowRadius: 14,
              elevation: 10,
            } as any,
          ]}
        >
          <LinearGradient
            colors={[light, accent]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[StyleSheet.absoluteFill, styles.gradientLayer]}
          />
          {/* subtle inner border for depth */}
          <View style={[StyleSheet.absoluteFill, styles.activeBorder]} />

          <View style={[styles.iconWrap, { backgroundColor: 'rgba(255,255,255,0.25)' }]}>
            <Feather name={icon as any} size={11} color="#fff" />
          </View>
          <Text style={[styles.label, styles.activeLabel]}>{label}</Text>
        </Animated.View>

        {/* Invisible spacer so the pill keeps its size */}
        <View style={styles.spacer}>
          <View style={styles.iconWrap} />
          <Text style={styles.label}>{label}</Text>
        </View>

      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  hitArea: {
    marginRight: 8,
  },
  pillBase: {
    // sizing container — layers are absolute on top
  },
  layer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 13,
    paddingVertical: 9,
    borderRadius: 26,
  },
  inactiveLayer: {
    borderWidth: 1.5,
  },
  gradientLayer: {
    borderRadius: 26,
  },
  activeBorder: {
    borderRadius: 26,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.30)',
  },
  iconWrap: {
    width: 22,
    height: 22,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: 13,
    fontFamily: 'DMSans_700Bold',
    letterSpacing: 0.1,
  },
  activeLabel: {
    color: '#fff',
    textShadowColor: 'rgba(0,0,0,0.18)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  // invisible sizer
  spacer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 13,
    paddingVertical: 9,
    opacity: 0,
  },
});
