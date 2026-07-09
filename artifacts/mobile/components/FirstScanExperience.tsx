import React, { useEffect, useRef } from 'react';
import {
  ActivityIndicator,
  Animated,
  Easing,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import FluxLogoMark from '@/components/FluxLogoMark';
import { useScreenshots } from '@/context/ScreenshotsContext';
import { computeInsightCounts } from '@/lib/app-analytics';

const ACCENT = '#7C72FF';

export default function FirstScanExperience() {
  const insets = useSafeAreaInsets();
  const {
    showFirstScan,
    dismissFirstScan,
    isScanning,
    totalIndexed,
    scanProgress,
    scanMessage,
    scanStatus,
    getInsights,
    screenshots,
  } = useScreenshots();

  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!showFirstScan) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1.04,
          duration: 900,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 1,
          duration: 900,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse, showFirstScan]);

  const insights = React.useMemo(() => getInsights().slice(0, 3), [getInsights, totalIndexed]);
  const categoryWow = React.useMemo(() => computeInsightCounts(screenshots), [screenshots, totalIndexed]);

  if (!showFirstScan) return null;

  const total = scanProgress?.total ?? 0;
  const done = scanProgress?.done ?? totalIndexed;
  const progress = total > 0 ? Math.min(1, done / total) : isScanning ? 0.08 : totalIndexed > 0 ? 1 : 0;

  const canContinue = !isScanning || totalIndexed > 0 || scanStatus === 'denied';

  function handleContinue() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    void dismissFirstScan();
  }

  return (
    <View style={[styles.overlay, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 20 }]}>
      <LinearGradient
        colors={['#12121E', '#0C0C14', '#0A0A12']}
        style={StyleSheet.absoluteFill}
      />

      <View style={styles.body}>
        <Animated.View style={{ transform: [{ scale: pulse }] }}>
          <FluxLogoMark size={72} />
        </Animated.View>

        <Text style={styles.title}>Making your screenshots useful</Text>
        <Text style={styles.subtitle}>
          Flux reads text on your device — nothing leaves your phone.
        </Text>

        <View style={styles.counterCard}>
          <Text style={styles.counterValue}>{totalIndexed}</Text>
          <Text style={styles.counterLabel}>
            screenshot{totalIndexed === 1 ? '' : 's'} indexed
          </Text>
          {isScanning && (
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${Math.max(progress * 100, 6)}%` }]} />
            </View>
          )}
          <View style={styles.statusRow}>
            {isScanning ? (
              <ActivityIndicator color={ACCENT} size="small" />
            ) : (
              <Feather
                name={scanStatus === 'denied' ? 'alert-circle' : 'check-circle'}
                size={16}
                color={scanStatus === 'denied' ? '#FF9F0A' : '#30D158'}
              />
            )}
            <Text style={styles.statusText} numberOfLines={2}>
              {scanMessage ??
                (isScanning
                  ? 'Scanning your camera roll…'
                  : totalIndexed > 0
                    ? 'Ready to search everything'
                    : 'Waiting for photo access…')}
            </Text>
          </View>
        </View>

        {totalIndexed > 0 ? (
          <View style={styles.wowRow}>
            {categoryWow.price_drop + categoryWow.price_watch > 0 ? (
              <Text style={styles.wowChip}>🛍 Shopping</Text>
            ) : null}
            {categoryWow.promise > 0 ? <Text style={styles.wowChip}>🤝 Promises</Text> : null}
            {categoryWow.calendar > 0 ? <Text style={styles.wowChip}>📅 Events</Text> : null}
          </View>
        ) : null}

        {insights.length > 0 ? (
          <View style={styles.insightBlock}>
            <Text style={styles.insightHeading}>Already found</Text>
            {insights.map((ins) => (
              <View key={ins.id} style={styles.insightRow}>
                <View style={[styles.insightDot, { backgroundColor: ins.colorHex }]} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.insightTitle} numberOfLines={1}>
                    {ins.title}
                  </Text>
                  <Text style={styles.insightSub} numberOfLines={1}>
                    {ins.subtitle}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        ) : null}
      </View>

      <Pressable
        onPress={handleContinue}
        disabled={!canContinue}
        style={({ pressed }) => [
          styles.continueBtn,
          { opacity: !canContinue ? 0.45 : pressed ? 0.88 : 1 },
        ]}
      >
        <LinearGradient
          colors={[ACCENT, '#9B8FFF']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.continueGrad}
        >
          <Text style={styles.continueText}>
            {totalIndexed > 0 ? 'Continue to Flux' : 'Continue'}
          </Text>
          <Feather name="arrow-right" size={18} color="#fff" />
        </LinearGradient>
      </Pressable>

      {isScanning && totalIndexed > 0 ? (
        <Pressable onPress={handleContinue} style={styles.skipBtn}>
          <Text style={styles.skipText}>Continue while scanning</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 9500,
    paddingHorizontal: 24,
    justifyContent: 'space-between',
  },
  body: { alignItems: 'center', gap: 16 },
  title: {
    color: '#F4F4F8',
    fontSize: 26,
    fontFamily: 'DMSans_700Bold',
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  subtitle: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 15,
    fontFamily: 'DMSans_400Regular',
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: 300,
  },
  counterCard: {
    width: '100%',
    marginTop: 12,
    padding: 22,
    borderRadius: 22,
    backgroundColor: 'rgba(124,114,255,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(124,114,255,0.22)',
    alignItems: 'center',
    gap: 6,
  },
  counterValue: {
    color: '#A78BFA',
    fontSize: 48,
    fontFamily: 'DMSans_700Bold',
    letterSpacing: -1,
  },
  counterLabel: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 14,
    fontFamily: 'DMSans_500Medium',
  },
  progressTrack: {
    width: '100%',
    height: 5,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.08)',
    marginTop: 10,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
    backgroundColor: ACCENT,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  statusText: {
    flex: 1,
    color: 'rgba(255,255,255,0.65)',
    fontSize: 13,
    fontFamily: 'DMSans_400Regular',
    lineHeight: 18,
  },
  insightBlock: {
    width: '100%',
    gap: 10,
    marginTop: 8,
  },
  insightHeading: {
    color: 'rgba(255,255,255,0.45)',
    fontSize: 11,
    fontFamily: 'DMSans_600SemiBold',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  insightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  insightDot: { width: 8, height: 8, borderRadius: 4 },
  insightTitle: { color: '#F4F4F8', fontSize: 14, fontFamily: 'DMSans_600SemiBold' },
  insightSub: { color: 'rgba(255,255,255,0.5)', fontSize: 12, fontFamily: 'DMSans_400Regular' },
  wowRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center', marginTop: 4 },
  wowChip: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 13,
    fontFamily: 'DMSans_600SemiBold',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  continueBtn: { borderRadius: 16, overflow: 'hidden' },
  continueGrad: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
  },
  continueText: { color: '#fff', fontSize: 17, fontFamily: 'DMSans_700Bold' },
  skipBtn: { alignItems: 'center', paddingVertical: 8 },
  skipText: { color: 'rgba(255,255,255,0.45)', fontSize: 14, fontFamily: 'DMSans_500Medium' },
});
