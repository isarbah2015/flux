import React from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
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

function FluxTabBar({ state, navigation }: { state: any; navigation: any; descriptors: any }) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const bottom = Platform.OS === 'web' ? 34 : Math.max(insets.bottom, 8);

  // pointerEvents prop (not style) is required for native touch passthrough
  return (
    <View style={[styles.wrapper, { bottom: bottom + 12 }]} pointerEvents="box-none">
      {/* Glow halo behind the pill */}
      <View style={[styles.glow, { shadowColor: colors.primary }]} pointerEvents="none" />

      <View style={styles.pillShadow}>
        <BlurView intensity={55} tint="dark" style={styles.blurPill}>
          <View style={[styles.pill, { borderColor: 'rgba(255,255,255,0.09)' }]}>
            {state.routes.map((route: any, index: number) => {
              const isFocused = state.index === index;
              const tab = TABS[index];

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
                <Pressable
                  key={route.key}
                  onPress={onPress}
                  style={({ pressed }) => [
                    styles.tabBtn,
                    isFocused && [styles.tabBtnActive, { backgroundColor: colors.primary + '2A' }],
                    { transform: [{ scale: pressed ? 0.88 : 1 }], opacity: pressed ? 0.8 : 1 },
                  ]}
                >
                  {Platform.OS === 'ios' ? (
                    <SymbolView
                      name={tab.sf as any}
                      tintColor={isFocused ? colors.primary : colors.mutedForeground}
                      size={21}
                    />
                  ) : (
                    <Feather
                      name={tab.icon}
                      size={20}
                      color={isFocused ? colors.primary : colors.mutedForeground}
                    />
                  )}
                  {isFocused && (
                    <View style={[styles.activeDot, { backgroundColor: colors.primary }]} />
                  )}
                </Pressable>
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
    gap: 6,
  },
  tabBtn: {
    width: 58,
    height: 50,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  tabBtnActive: {},
  activeDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
});
