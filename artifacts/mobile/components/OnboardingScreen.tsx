import React, { useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { useScreenshots } from '@/context/ScreenshotsContext';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

const { width } = Dimensions.get('window');

const SLIDES = [
  {
    icon: 'zap',
    color: '#7C72FF',
    title: 'Your screenshots,\nalive.',
    subtitle:
      "You've taken thousands of screenshots. Right now they're just clutter. Flux turns every one into searchable, actionable intelligence.",
  },
  {
    icon: 'search',
    color: '#00D4FF',
    title: 'Every word,\nsearchable.',
    subtitle:
      "Type anything — a name, a price, a place — and find the screenshot instantly. No more scrolling through thousands of images.",
  },
  {
    icon: 'bell',
    color: '#FF375F',
    title: 'Smart alerts,\nzero effort.',
    subtitle:
      "Flux tracks prices, detects promises, and reminds you before flights. It works silently in the background so you don't have to.",
  },
  {
    icon: 'shield',
    color: '#30D158',
    title: 'Private by\ndesign.',
    subtitle:
      "Every screenshot is processed on your device. Nothing leaves your phone. No account. No cloud. Just intelligence that stays yours.",
  },
];

export default function OnboardingScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { completeOnboarding } = useScreenshots();
  const [page, setPage] = useState(0);
  const scrollRef = useRef<ScrollView>(null);
  const fadeAnim = useRef(new Animated.Value(1)).current;

  function goNext() {
    if (page < SLIDES.length - 1) {
      Haptics.selectionAsync();
      const next = page + 1;
      setPage(next);
      scrollRef.current?.scrollTo({ x: next * width, animated: true });
    } else {
      handleGetStarted();
    }
  }

  function handleGetStarted() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      completeOnboarding();
    });
  }

  const topPad = Platform.OS === 'web' ? 67 : insets.top;
  // Onboarding has no tab bar, just clear the device edge
  const botPad = Platform.OS === 'web' ? 40 : Math.max(insets.bottom, 16) + 16;

  const slide = SLIDES[page];

  return (
    <Animated.View
      style={[styles.container, { backgroundColor: colors.background, opacity: fadeAnim }]}
    >
      {/* Slide area */}
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        scrollEnabled={false}
        showsHorizontalScrollIndicator={false}
        style={{ flex: 1 }}
      >
        {SLIDES.map((s, i) => (
          <View key={i} style={[styles.slide, { width, paddingTop: topPad + 60 }]}>
            {/* Glow blob */}
            <View
              style={[
                styles.glowBlob,
                { backgroundColor: s.color + '22', width: 220, height: 220, borderRadius: 110 },
              ]}
            />
            <View style={[styles.iconCircle, { backgroundColor: s.color + '22' }]}>
              <Feather name={s.icon as any} size={44} color={s.color} />
            </View>
            <Text style={[styles.title, { color: colors.foreground }]}>{s.title}</Text>
            <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>{s.subtitle}</Text>
          </View>
        ))}
      </ScrollView>

      {/* Dots */}
      <View style={styles.dotsRow}>
        {SLIDES.map((_, i) => (
          <View
            key={i}
            style={[
              styles.dot,
              {
                backgroundColor:
                  i === page ? slide.color : colors.border,
                width: i === page ? 24 : 7,
              },
            ]}
          />
        ))}
      </View>

      {/* Button */}
      <View style={[styles.footer, { paddingBottom: botPad }]}>
        <Pressable
          onPress={goNext}
          style={({ pressed }) => [
            styles.btn,
            { backgroundColor: slide.color, opacity: pressed ? 0.85 : 1 },
          ]}
        >
          <Text style={styles.btnText}>
            {page < SLIDES.length - 1 ? 'Continue' : 'Get Started — It\'s Free'}
          </Text>
          <Feather name="arrow-right" size={18} color="#fff" />
        </Pressable>
        {page === SLIDES.length - 1 && (
          <Text style={[styles.privacyNote, { color: colors.mutedForeground }]}>
            Your photos never leave your device
          </Text>
        )}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  slide: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 24,
  },
  glowBlob: {
    position: 'absolute',
    top: '15%',
  },
  iconCircle: {
    width: 100,
    height: 100,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 40,
    fontFamily: 'DMSans_700Bold',
    textAlign: 'center',
    lineHeight: 46,
    letterSpacing: -1,
  },
  subtitle: {
    fontSize: 16,
    fontFamily: 'DMSans_400Regular',
    textAlign: 'center',
    lineHeight: 24,
    maxWidth: 320,
  },
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    marginBottom: 20,
  },
  dot: {
    height: 7,
    borderRadius: 4,
  },
  footer: {
    paddingHorizontal: 24,
    gap: 12,
    alignItems: 'center',
  },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    width: '100%',
    paddingVertical: 17,
    borderRadius: 16,
  },
  btnText: {
    color: '#fff',
    fontSize: 17,
    fontFamily: 'DMSans_700Bold',
  },
  privacyNote: {
    fontSize: 12,
    fontFamily: 'DMSans_400Regular',
  },
});
