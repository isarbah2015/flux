import { Feather } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { SymbolView } from 'expo-symbols';
import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Platform,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TAB_BAR_BOTTOM_GAP } from '@/constants/layout';

const NATIVE = Platform.OS !== 'web';
const ACCENT = '#7C72FF';
const FOCUS_BUBBLE_BG = 'rgba(124,114,255,0.18)';
const FOCUS_BUBBLE_BORDER = 'rgba(124,114,255,0.38)';
const PILL_RADIUS = 44;
const TAB_W = 52;
const TAB_H = 46;

type FeatherName = React.ComponentProps<typeof Feather>['name'];

const TABS: { icon: FeatherName; sf: string }[] = [
  { icon: 'grid', sf: 'square.grid.2x2.fill' },
  { icon: 'search', sf: 'magnifyingglass' },
  { icon: 'calendar', sf: 'calendar' },
  { icon: 'zap', sf: 'sparkles' },
  { icon: 'settings', sf: 'gearshape.fill' },
];

function Tab({
  config,
  isFocused,
  onPress,
  onBarPressIn,
  onBarPressOut,
}: {
  config: { icon: FeatherName; sf: string };
  isFocused: boolean;
  onPress: () => void;
  onBarPressIn: () => void;
  onBarPressOut: () => void;
}) {
  const pressScale = useRef(new Animated.Value(1)).current;
  const focusAnim = useRef(new Animated.Value(isFocused ? 1 : 0)).current;

  useEffect(() => {
    Animated.spring(focusAnim, {
      toValue: isFocused ? 1 : 0,
      speed: 18,
      bounciness: 10,
      useNativeDriver: NATIVE,
    }).start();
  }, [focusAnim, isFocused]);

  const handlePress = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    Animated.sequence([
      Animated.spring(pressScale, {
        toValue: 0.88,
        speed: 200,
        bounciness: 0,
        useNativeDriver: NATIVE,
      }),
      Animated.spring(pressScale, {
        toValue: 1,
        speed: 12,
        bounciness: 14,
        useNativeDriver: NATIVE,
      }),
    ]).start();
    onPress();
  };

  const iconColor = isFocused ? ACCENT : 'rgba(255,255,255,0.42)';

  return (
    <Pressable
      style={s.tab}
      onPress={handlePress}
      onPressIn={onBarPressIn}
      onPressOut={onBarPressOut}
      android_ripple={{ color: 'rgba(124,114,255,0.10)', borderless: true, radius: 22 }}
    >
      <Animated.View style={[s.tabInner, { transform: [{ scale: pressScale }] }]}>
        {isFocused ? (
          <Animated.View
            style={[
              s.bubble,
              {
                opacity: focusAnim,
                transform: [
                  {
                    scale: focusAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.5, 1],
                    }),
                  },
                ],
                backgroundColor: FOCUS_BUBBLE_BG,
                borderColor: FOCUS_BUBBLE_BORDER,
              },
            ]}
          />
        ) : null}
        {Platform.OS === 'ios' ? (
          <SymbolView name={config.sf as never} tintColor={iconColor} size={20} />
        ) : (
          <Feather name={config.icon} size={20} color={iconColor} />
        )}
      </Animated.View>
    </Pressable>
  );
}

interface TabBarProps {
  state: { index: number; routes: { key: string; name: string }[] };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  navigation: any;
}

function PillCard({ state, navigation }: TabBarProps) {
  const solidBg = 'rgba(10,10,22,0.82)';
  const pillLift = useRef(new Animated.Value(0)).current;
  const touchCount = useRef(0);

  const cardHoverStyle = {
    transform: [
      {
        translateY: pillLift.interpolate({
          inputRange: [0, 1],
          outputRange: [0, -10],
        }),
      },
      {
        scale: pillLift.interpolate({
          inputRange: [0, 1],
          outputRange: [1, 1.02],
        }),
      },
    ],
    shadowOpacity: pillLift.interpolate({
      inputRange: [0, 1],
      outputRange: [0.55, 0.88],
    }),
  };

  const glowHoverStyle = {
    opacity: pillLift.interpolate({
      inputRange: [0, 1],
      outputRange: [0.35, 0.65],
    }),
    transform: [
      {
        scale: pillLift.interpolate({
          inputRange: [0, 1],
          outputRange: [1, 1.08],
        }),
      },
    ],
  };

  const liftCard = () => {
    Animated.spring(pillLift, {
      toValue: 1,
      useNativeDriver: false,
      speed: 28,
      bounciness: 6,
    }).start();
  };

  const dropCard = () => {
    Animated.spring(pillLift, {
      toValue: 0,
      useNativeDriver: false,
      speed: 28,
      bounciness: 4,
    }).start();
  };

  const onBarPressIn = () => {
    touchCount.current += 1;
    liftCard();
  };

  const onBarPressOut = () => {
    touchCount.current = Math.max(0, touchCount.current - 1);
    if (touchCount.current === 0) dropCard();
  };

  return (
    <Animated.View style={[s.shadow, cardHoverStyle]}>
      <Animated.View style={[s.glow, glowHoverStyle]} pointerEvents="none" />
      <View
        // @ts-expect-error web — whole card hovers together
        onMouseEnter={Platform.OS === 'web' ? liftCard : undefined}
        onMouseLeave={Platform.OS === 'web' ? dropCard : undefined}
      >
        <View style={s.pillWrap}>
          {Platform.OS === 'ios' ? (
            <BlurView
              intensity={55}
              tint="dark"
              style={[StyleSheet.absoluteFill, { borderRadius: PILL_RADIUS }]}
            />
          ) : (
            <View
              style={[StyleSheet.absoluteFill, { backgroundColor: solidBg, borderRadius: PILL_RADIUS }]}
            />
          )}
          <View style={s.borderRing} pointerEvents="none" />
          <View style={s.pillRow}>
            {state.routes.map((route, index) => (
              <Tab
                key={route.key}
                config={TABS[index] ?? TABS[0]}
                isFocused={state.index === index}
                onBarPressIn={onBarPressIn}
                onBarPressOut={onBarPressOut}
                onPress={() => {
                  const event = navigation.emit({
                    type: 'tabPress',
                    target: route.key,
                    canPreventDefault: true,
                  });
                  if (state.index !== index && !event.defaultPrevented) {
                    navigation.navigate(route.name);
                  }
                }}
              />
            ))}
          </View>
        </View>
      </View>
    </Animated.View>
  );
}

/** Compact floating tab bar — one active bubble per tab; whole card lifts on hover/press. */
export function FloatingTabBar({ state, navigation }: TabBarProps) {
  const insets = useSafeAreaInsets();
  const bottom = (Platform.OS === 'web' ? 14 : Math.max(insets.bottom, 6)) + TAB_BAR_BOTTOM_GAP;

  return (
    <View style={[s.root, { bottom }]} pointerEvents="box-none">
      <PillCard state={state} navigation={navigation} />
    </View>
  );
}

const s = StyleSheet.create({
  root: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 999,
  },
  glow: {
    position: 'absolute',
    alignSelf: 'center',
    width: 240,
    height: 58,
    borderRadius: 40,
    shadowColor: ACCENT,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 32,
    elevation: 0,
  },
  shadow: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.55,
    shadowRadius: 28,
    elevation: 30,
    borderRadius: PILL_RADIUS,
  },
  pillWrap: {
    borderRadius: PILL_RADIUS,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.09)',
  },
  borderRing: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: PILL_RADIUS,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  pillRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 6,
    gap: 2,
  },
  tab: {
    width: TAB_W,
    height: TAB_H,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabInner: {
    width: TAB_W,
    height: TAB_H,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bubble: {
    position: 'absolute',
    width: 46,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
  },
});
