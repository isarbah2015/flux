import React, { useEffect, useRef } from 'react';
import { Animated, Platform, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { useScreenshots } from '@/context/ScreenshotsContext';
import { Feather } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { Tabs } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import * as Haptics from 'expo-haptics';

const NATIVE_DRIVER = Platform.OS !== 'web';

const TABS = [
  { name: 'index', icon: 'grid' as const, sf: 'square.grid.2x2.fill' },
  { name: 'search', icon: 'search' as const, sf: 'magnifyingglass' },
  { name: 'insights', icon: 'zap' as const, sf: 'sparkles' },
  { name: 'settings', icon: 'settings' as const, sf: 'gearshape.fill' },
];

/** iSync Pro tab — focus bubble + hover/press peek on every tab */
function TabButton({
  route,
  index,
  isFocused,
  colors,
  onPress,
}: {
  route: { key: string };
  index: number;
  isFocused: boolean;
  colors: ReturnType<typeof useColors>;
  onPress: () => void;
}) {
  const tab = TABS[index];
  const pressScale = useRef(new Animated.Value(1)).current;
  const focusAnim = useRef(new Animated.Value(isFocused ? 1 : 0)).current;
  const hoverAnim = useRef(new Animated.Value(0)).current;
  const iconScale = useRef(new Animated.Value(isFocused ? 1.14 : 1)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(focusAnim, {
        toValue: isFocused ? 1 : 0,
        speed: 18,
        bounciness: 10,
        useNativeDriver: NATIVE_DRIVER,
      }),
      Animated.spring(iconScale, {
        toValue: isFocused ? 1.14 : 1,
        speed: 18,
        bounciness: 8,
        useNativeDriver: NATIVE_DRIVER,
      }),
    ]).start();
  }, [focusAnim, iconScale, isFocused]);

  function peekIn() {
    Animated.parallel([
      Animated.spring(hoverAnim, {
        toValue: 1,
        speed: 28,
        bounciness: 8,
        useNativeDriver: NATIVE_DRIVER,
      }),
      Animated.spring(iconScale, {
        toValue: 1.12,
        speed: 28,
        bounciness: 6,
        useNativeDriver: NATIVE_DRIVER,
      }),
    ]).start();
  }

  function peekOut() {
    Animated.parallel([
      Animated.spring(hoverAnim, {
        toValue: 0,
        speed: 24,
        bounciness: 4,
        useNativeDriver: NATIVE_DRIVER,
      }),
      Animated.spring(iconScale, {
        toValue: isFocused ? 1.14 : 1,
        speed: 18,
        bounciness: 8,
        useNativeDriver: NATIVE_DRIVER,
      }),
    ]).start();
  }

  function handlePress() {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    Animated.sequence([
      Animated.spring(pressScale, {
        toValue: 0.78,
        speed: 200,
        bounciness: 0,
        useNativeDriver: NATIVE_DRIVER,
      }),
      Animated.spring(pressScale, {
        toValue: 1,
        speed: 12,
        bounciness: 18,
        useNativeDriver: NATIVE_DRIVER,
      }),
    ]).start();
    onPress();
  }

  const iconColor = isFocused ? colors.accent : colors.mutedForeground;

  const focusBubbleScale = focusAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.5, 1],
  });

  const hoverBubbleScale = hoverAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.6, 1],
  });

  return (
    <Pressable
      key={route.key}
      style={styles.tabBtn}
      onPress={handlePress}
      onPressIn={peekIn}
      onPressOut={peekOut}
      onHoverIn={Platform.OS === 'web' ? peekIn : undefined}
      onHoverOut={Platform.OS === 'web' ? peekOut : undefined}
    >
      <Animated.View style={[styles.tabBtnInner, { transform: [{ scale: pressScale }] }]}>
        {/* Hover / press peek — visible on every tab when touched or hovered */}
        <Animated.View
          style={[
            styles.bubble,
            {
              opacity: hoverAnim,
              transform: [{ scale: hoverBubbleScale }],
              backgroundColor: 'rgba(255,255,255,0.10)',
              borderColor: 'rgba(255,255,255,0.18)',
            },
          ]}
        />
        {/* Active tab bubble — iSync cyan accent */}
        <Animated.View
          style={[
            styles.bubble,
            {
              opacity: focusAnim,
              transform: [{ scale: focusBubbleScale }],
              backgroundColor: 'rgba(0,229,255,0.14)',
              borderColor: 'rgba(0,229,255,0.32)',
            },
          ]}
        />
        <Animated.View style={{ transform: [{ scale: iconScale }] }}>
          {Platform.OS === 'ios' ? (
            <SymbolView name={tab.sf as any} tintColor={iconColor} size={21} />
          ) : (
            <Feather name={tab.icon} size={20} color={iconColor} />
          )}
        </Animated.View>
        {isFocused && (
          <View style={[styles.activeDot, { backgroundColor: colors.accent }]} />
        )}
      </Animated.View>
    </Pressable>
  );
}

function FluxTabBar({ state, navigation }: { state: any; navigation: any; descriptors: any }) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { hasOnboarded } = useScreenshots();
  const pillLift = useRef(new Animated.Value(0)).current;

  const bottom = Platform.OS === 'web' ? 14 : Math.max(insets.bottom, 6);

  const pillHoverStyle = {
    transform: [
      {
        translateY: pillLift.interpolate({
          inputRange: [0, 1],
          outputRange: [0, -10],
        }),
      },
    ],
    shadowOpacity: pillLift.interpolate({
      inputRange: [0, 1],
      outputRange: [0.55, 0.85],
    }),
  };

  function liftPill() {
    Animated.spring(pillLift, {
      toValue: 1,
      useNativeDriver: false,
      speed: 28,
      bounciness: 6,
    }).start();
  }

  function dropPill() {
    Animated.spring(pillLift, {
      toValue: 0,
      useNativeDriver: false,
      speed: 28,
      bounciness: 4,
    }).start();
  }

  // Lift the whole pill when the active tab changes.
  useEffect(() => {
    liftPill();
    const timer = setTimeout(dropPill, 220);
    return () => clearTimeout(timer);
  }, [state.index]);

  if (!hasOnboarded) return null;

  return (
    <View style={[styles.wrapper, { bottom: bottom + 6 }]} pointerEvents="box-none">
      <View style={[styles.glow, { shadowColor: colors.accent }]} pointerEvents="none" />

      <View
        // @ts-expect-error web hover lifts the whole pill
        onMouseEnter={liftPill}
        onMouseLeave={dropPill}
      >
        <Animated.View style={[styles.pillShadow, pillHoverStyle]}>
          <BlurView intensity={55} tint="dark" style={styles.blurPill}>
            <View style={[styles.pill, { borderColor: 'rgba(255,255,255,0.09)' }]}>
              {state.routes.map((route: any, index: number) => {
                const isFocused = state.index === index;

                function onPress() {
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
        </Animated.View>
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
  tabBtn: {
    width: 58,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabBtnInner: {
    width: 58,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  bubble: {
    position: 'absolute',
    width: 50,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
  },
  activeDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
});
