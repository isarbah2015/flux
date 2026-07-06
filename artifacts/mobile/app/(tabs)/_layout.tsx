import React, { useRef } from 'react';
import { Animated, Platform, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { useScreenshots } from '@/context/ScreenshotsContext';
import { Feather } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { Tabs } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import * as Haptics from 'expo-haptics';

const TABS = [
  { name: 'index',    icon: 'grid'     as const, sf: 'square.grid.2x2.fill' },
  { name: 'search',   icon: 'search'   as const, sf: 'magnifyingglass'       },
  { name: 'insights', icon: 'zap'      as const, sf: 'sparkles'              },
  { name: 'settings', icon: 'settings' as const, sf: 'gearshape.fill'        },
];

/** One animated tab button — handles hover + press independently */
function TabButton({
  route,
  index,
  isFocused,
  colors,
  onPress,
}: {
  route: any;
  index: number;
  isFocused: boolean;
  colors: any;
  onPress: () => void;
}) {
  const tab = TABS[index];
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const glowAnim  = useRef(new Animated.Value(0)).current;

  function animateIn() {
    Animated.parallel([
      Animated.spring(scaleAnim, { toValue: 1.13, useNativeDriver: true, speed: 40, bounciness: 6 }),
      Animated.timing(glowAnim,  { toValue: 1,    useNativeDriver: false, duration: 120 }),
    ]).start();
  }

  function animateOut() {
    Animated.parallel([
      Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, speed: 30, bounciness: 4 }),
      Animated.timing(glowAnim,  { toValue: 0, useNativeDriver: false, duration: 150 }),
    ]).start();
  }

  function animatePress() {
    Animated.sequence([
      Animated.spring(scaleAnim, { toValue: 0.84, useNativeDriver: true, speed: 60, bounciness: 0 }),
      Animated.spring(scaleAnim, { toValue: 1,    useNativeDriver: true, speed: 30, bounciness: 8 }),
    ]).start();
  }

  // Interpolate hover glow background opacity
  const hoverBg = glowAnim.interpolate({
    inputRange:  [0, 1],
    outputRange: [
      isFocused ? colors.primary + '28' : 'rgba(255,255,255,0)',
      isFocused ? colors.primary + '45' : 'rgba(255,255,255,0.14)',
    ],
  });

  const iconColor = isFocused ? colors.primary : colors.mutedForeground;

  return (
    <Pressable
      key={route.key}
      onPress={() => { animatePress(); onPress(); }}
      onHoverIn={() => { if (Platform.OS === 'web') animateIn(); }}
      onHoverOut={() => { if (Platform.OS === 'web') animateOut(); }}
      style={styles.tabBtn}
    >
      <Animated.View
        style={[
          styles.tabBtnInner,
          { backgroundColor: hoverBg, transform: [{ scale: scaleAnim }] },
        ]}
      >
        {Platform.OS === 'ios' ? (
          <SymbolView
            name={tab.sf as any}
            tintColor={iconColor}
            size={21}
          />
        ) : (
          <Feather name={tab.icon} size={20} color={iconColor} />
        )}
        {isFocused && (
          <View style={[styles.activeDot, { backgroundColor: colors.primary }]} />
        )}
      </Animated.View>
    </Pressable>
  );
}

function FluxTabBar({ state, navigation }: { state: any; navigation: any; descriptors: any }) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { hasOnboarded } = useScreenshots();

  const bottom = Platform.OS === 'web' ? 14 : Math.max(insets.bottom, 6);

  if (!hasOnboarded) return null;

  return (
    <View style={[styles.wrapper, { bottom: bottom + 6 }]} pointerEvents="box-none">
      <View style={[styles.glow, { shadowColor: colors.primary }]} pointerEvents="none" />

      <View style={styles.pillShadow}>
        <BlurView intensity={55} tint="dark" style={styles.blurPill}>
          <View style={[styles.pill, { borderColor: 'rgba(255,255,255,0.09)' }]}>
            {state.routes.map((route: any, index: number) => {
              const isFocused = state.index === index;

              function onPress() {
                Haptics.selectionAsync();
                const event = navigation.emit({
                  type: 'tabPress',
                  target: route.key,
                  canPreventDefault: true,
                });
                if (!isFocused && !event.defaultPrevented) {
                  navigation.navigate(route.name);
                }
              }

              return (
                <TabButton
                  key={route.key}
                  route={route}
                  index={index}
                  isFocused={isFocused}
                  colors={colors}
                  onPress={onPress}
                />
              );
            })}
          </View>
        </BlurView>
      </View>
    </View>
  );
}

export default function TabLayout() {
  return (
    <Tabs
      tabBar={(props) => <FluxTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tabs.Screen name="index" />
      <Tabs.Screen name="search" />
      <Tabs.Screen name="insights" />
      <Tabs.Screen name="settings" />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 999,
  },
  glow: {
    position: 'absolute',
    width: 220,
    height: 60,
    borderRadius: 40,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.35,
    shadowRadius: 28,
    elevation: 0,
  },
  pillShadow: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.55,
    shadowRadius: 28,
    elevation: 30,
    borderRadius: 44,
  },
  blurPill: {
    borderRadius: 44,
    overflow: 'hidden',
  },
  pill: {
    flexDirection: 'row',
    paddingHorizontal: 8,
    paddingVertical: 8,
    backgroundColor: 'rgba(10, 10, 22, 0.82)',
    borderRadius: 44,
    borderWidth: 1,
    gap: 4,
  },
  // Outer touchable — sized for hit area
  tabBtn: {
    width: 58,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Inner animated view — sized the same, renders the visual
  tabBtnInner: {
    width: 58,
    height: 50,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  activeDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
});
