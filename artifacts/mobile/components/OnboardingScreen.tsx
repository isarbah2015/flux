import React, { useRef, useState, useMemo } from 'react';
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
import { useLocale } from '@/context/LocaleContext';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

const { width } = Dimensions.get('window');

import type { I18nKey } from '@/lib/i18n/en';

const SLIDE_META: { icon: string; color: string; titleKey: I18nKey; subKey: I18nKey }[] = [
  { icon: 'zap', color: '#7C72FF', titleKey: 'onboarding.slide1Title', subKey: 'onboarding.slide1Sub' },
  { icon: 'search', color: '#00D4FF', titleKey: 'onboarding.slide2Title', subKey: 'onboarding.slide2Sub' },
  { icon: 'bell', color: '#FF375F', titleKey: 'onboarding.slide3Title', subKey: 'onboarding.slide3Sub' },
  { icon: 'smartphone', color: '#FFD60A', titleKey: 'onboarding.slide4Title', subKey: 'onboarding.slide4Sub' },
  { icon: 'shield', color: '#30D158', titleKey: 'onboarding.slide5Title', subKey: 'onboarding.slide5Sub' },
];

export default function OnboardingScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { completeOnboarding } = useScreenshots();
  const { t } = useLocale();
  const [page, setPage] = useState(0);
  const scrollRef = useRef<ScrollView>(null);
  const fadeAnim = useRef(new Animated.Value(1)).current;

  const slides = useMemo(
    () =>
      SLIDE_META.map((s) => ({
        icon: s.icon,
        color: s.color,
        title: t(s.titleKey),
        subtitle: t(s.subKey),
      })),
    [t],
  );

  function goNext() {
    if (page < slides.length - 1) {
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

  const slide = slides[page];

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
        {slides.map((s, i) => (
          <View key={i} style={[styles.slide, { width, paddingTop: topPad + 60 }]}>
            <View style={styles.iconArea}>
              <View
                style={[
                  styles.glowBlob,
                  { backgroundColor: s.color + '22' },
                ]}
              />
              <View style={[styles.iconCircle, { backgroundColor: s.color + '22' }]}>
                <Feather name={s.icon as any} size={44} color={s.color} />
              </View>
            </View>
            <Text style={[styles.title, { color: colors.foreground }]}>{s.title}</Text>
            <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>{s.subtitle}</Text>
          </View>
        ))}
      </ScrollView>

      {/* Dots */}
      <View style={styles.dotsRow}>
        {slides.map((_, i) => (
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
            {page < slides.length - 1 ? t('onboarding.continue') : t('onboarding.getStarted')}
          </Text>
          <Feather name="arrow-right" size={18} color="#fff" />
        </Pressable>
        {page === slides.length - 1 && (
          <Text style={[styles.privacyNote, { color: colors.mutedForeground }]}>
            {t('onboarding.privacyNote')}
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
  iconArea: {
    width: 220,
    height: 220,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glowBlob: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
  },
  iconCircle: {
    width: 100,
    height: 100,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
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
