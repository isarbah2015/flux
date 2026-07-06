import React from 'react';
import {
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
import { CATEGORY_COLORS, CATEGORY_ICONS, CATEGORY_LABELS } from '@/constants/colors';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';

export default function ScreenshotDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { getScreenshot } = useScreenshots();
  const screenshot = getScreenshot(id ?? '');

  const topPad = Platform.OS === 'web' ? 67 : insets.top;
  const botPad = Platform.OS === 'web' ? 34 : insets.bottom + 24;

  if (!screenshot) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, paddingTop: topPad }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </Pressable>
        <View style={styles.centered}>
          <Text style={[styles.notFound, { color: colors.mutedForeground }]}>Not found</Text>
        </View>
      </View>
    );
  }

  const catColor = CATEGORY_COLORS[screenshot.category] ?? '#636384';
  const catIcon = CATEGORY_ICONS[screenshot.category] ?? 'image';
  const catLabel = CATEGORY_LABELS[screenshot.category] ?? 'Other';

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Floating back button */}
      <View style={[styles.topBar, { paddingTop: topPad + 8 }]}>
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [
            styles.backBtn,
            { backgroundColor: colors.secondary, opacity: pressed ? 0.7 : 1 },
          ]}
        >
          <Feather name="arrow-left" size={20} color={colors.foreground} />
        </Pressable>
        <View style={[styles.catChip, { backgroundColor: catColor + '22' }]}>
          <Feather name={catIcon as any} size={12} color={catColor} />
          <Text style={[styles.catChipText, { color: catColor }]}>{catLabel.toUpperCase()}</Text>
        </View>
        <Pressable
          style={({ pressed }) => [
            styles.backBtn,
            { backgroundColor: colors.secondary, opacity: pressed ? 0.7 : 1 },
          ]}
        >
          <Feather name="share-2" size={18} color={colors.foreground} />
        </Pressable>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scroll, { paddingBottom: botPad }]}
      >
        {/* Hero thumbnail — no border, no clipping except within itself */}
        <View style={[styles.hero, { backgroundColor: catColor + '14' }]}>
          {/* Decorative blob */}
          <View style={[styles.blob, { backgroundColor: catColor + '25' }]} />
          <View style={[styles.blob2, { backgroundColor: catColor + '15' }]} />
          <View style={[styles.heroIcon, { backgroundColor: catColor + '2A' }]}>
            <Feather name={catIcon as any} size={44} color={catColor} />
          </View>
          <Text style={[styles.heroDate, { color: catColor + 'AA' }]}>
            {new Date(screenshot.capturedAt).toLocaleString(undefined, {
              month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
            })}
          </Text>
        </View>

        {/* Summary */}
        <View style={styles.section}>
          <Text style={[styles.summaryText, { color: colors.foreground }]}>
            {screenshot.summary}
          </Text>
        </View>

        {/* Tags */}
        {screenshot.tags.length > 0 && (
          <View style={styles.tagsRow}>
            {screenshot.tags.map((tag) => (
              <View key={tag} style={[styles.tag, { backgroundColor: colors.secondary }]}>
                <Text style={[styles.tagText, { color: colors.mutedForeground }]}>#{tag}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Smart cards — no borders, each gets a tinted background */}
        {screenshot.priceTracking && (
          <SmartBlock color="#FF9F0A" icon="tag" title="Price Tracking">
            <Text style={[styles.smartProduct, { color: colors.foreground }]}>
              {screenshot.priceTracking.productName}
            </Text>
            <View style={styles.priceRow}>
              <View style={styles.priceCell}>
                <Text style={[styles.priceLabel, { color: colors.mutedForeground }]}>Was</Text>
                <Text style={[styles.priceOld, { color: colors.mutedForeground }]}>
                  {screenshot.priceTracking.detectedPrice}
                </Text>
              </View>
              <Feather name="arrow-right" size={14} color={colors.mutedForeground} />
              <View style={styles.priceCell}>
                <Text style={[styles.priceLabel, { color: colors.mutedForeground }]}>Now</Text>
                <Text style={[styles.priceNew, { color: '#FF9F0A' }]}>
                  {screenshot.priceTracking.currentPrice}
                </Text>
              </View>
              {screenshot.priceTracking.priceDropped && (
                <View style={[styles.dropBadge, { backgroundColor: '#FF9F0A' }]}>
                  <Text style={styles.dropText}>Price Dropped!</Text>
                </View>
              )}
            </View>
            <SmartBtn color="#FF9F0A" label="View Deal" icon="external-link" />
          </SmartBlock>
        )}

        {screenshot.promise && (
          <SmartBlock color="#FF375F" icon="user-check" title="Promise Detected">
            <Text style={[styles.smartProduct, { color: colors.foreground }]}>
              {screenshot.promise.from}
            </Text>
            <Text style={[styles.promiseQuote, { color: colors.mutedForeground }]}>
              "{screenshot.promise.content}"
            </Text>
            <View style={[styles.duePill, { backgroundColor: '#FF375F22' }]}>
              <Feather name="clock" size={12} color="#FF375F" />
              <Text style={[styles.dueText, { color: '#FF375F' }]}>
                Due: {screenshot.promise.deadline}
              </Text>
            </View>
            <SmartBtn color="#FF375F" label="Set Reminder" icon="bell" />
          </SmartBlock>
        )}

        {screenshot.calendarEvent && (
          <SmartBlock color="#00D4FF" icon="calendar" title="Calendar Event">
            <Text style={[styles.smartProduct, { color: colors.foreground }]}>
              {screenshot.calendarEvent.title}
            </Text>
            <Text style={[styles.promiseQuote, { color: colors.mutedForeground }]}>
              {screenshot.calendarEvent.date}
              {screenshot.calendarEvent.time ? '  ·  ' + screenshot.calendarEvent.time : ''}
            </Text>
            {screenshot.calendarEvent.location && (
              <View style={styles.locationRow}>
                <Feather name="map-pin" size={12} color="#00D4FF" />
                <Text style={[styles.locationText, { color: colors.mutedForeground }]}>
                  {screenshot.calendarEvent.location}
                </Text>
              </View>
            )}
            <SmartBtn color="#00D4FF" label="Add to Calendar" icon="plus" dark />
          </SmartBlock>
        )}

        {/* Extracted text */}
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>Extracted Text</Text>
          <View style={[styles.textBox, { backgroundColor: colors.secondary }]}>
            <Text style={[styles.extractedText, { color: colors.foreground }]}>
              {screenshot.extractedText}
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

/* ─── Sub-components ──────────────────────────────────────── */

function SmartBlock({
  color, icon, title, children,
}: {
  color: string; icon: string; title: string; children: React.ReactNode;
}) {
  const colors = useColors();
  return (
    <View style={[styles.smartBlock, { backgroundColor: color + '10' }]}>
      <View style={styles.smartBlockHeader}>
        <View style={[styles.smartBlockIcon, { backgroundColor: color + '25' }]}>
          <Feather name={icon as any} size={14} color={color} />
        </View>
        <Text style={[styles.smartBlockTitle, { color }]}>{title.toUpperCase()}</Text>
      </View>
      {children}
    </View>
  );
}

function SmartBtn({
  color, label, icon, dark,
}: {
  color: string; label: string; icon: string; dark?: boolean;
}) {
  return (
    <Pressable
      onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
      style={({ pressed }) => [
        styles.smartBtn,
        { backgroundColor: color, opacity: pressed ? 0.85 : 1 },
      ]}
    >
      <Text style={[styles.smartBtnText, dark && { color: '#0C0C14' }]}>{label}</Text>
      <Feather name={icon as any} size={14} color={dark ? '#0C0C14' : '#fff'} />
    </Pressable>
  );
}

/* ─── Styles ──────────────────────────────────────────────── */

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  notFound: { fontSize: 16, fontFamily: 'DMSans_400Regular' },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  catChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 13,
    paddingVertical: 8,
    borderRadius: 20,
  },
  catChipText: { fontSize: 11, fontFamily: 'DMSans_700Bold', letterSpacing: 1 },
  scroll: { paddingHorizontal: 20, gap: 16 },
  hero: {
    height: 190,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    position: 'relative',
    gap: 12,
  },
  blob: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 80,
    top: -50,
    right: -40,
  },
  blob2: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
    bottom: -30,
    left: -20,
  },
  heroIcon: {
    width: 86,
    height: 86,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroDate: { fontSize: 12, fontFamily: 'DMSans_500Medium' },
  section: { gap: 10 },
  sectionLabel: {
    fontSize: 11,
    fontFamily: 'DMSans_600SemiBold',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  summaryText: { fontSize: 17, fontFamily: 'DMSans_600SemiBold', lineHeight: 25 },
  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  tag: { paddingHorizontal: 11, paddingVertical: 6, borderRadius: 20 },
  tagText: { fontSize: 12, fontFamily: 'DMSans_400Regular' },
  smartBlock: {
    borderRadius: 20,
    padding: 18,
    gap: 12,
  },
  smartBlockHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  smartBlockIcon: { width: 30, height: 30, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  smartBlockTitle: { fontSize: 10, fontFamily: 'DMSans_700Bold', letterSpacing: 1.2 },
  smartProduct: { fontSize: 18, fontFamily: 'DMSans_700Bold' },
  priceRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  priceCell: { gap: 2 },
  priceLabel: { fontSize: 11, fontFamily: 'DMSans_400Regular' },
  priceOld: { fontSize: 17, fontFamily: 'DMSans_500Medium', textDecorationLine: 'line-through' },
  priceNew: { fontSize: 24, fontFamily: 'DMSans_700Bold' },
  dropBadge: { paddingHorizontal: 9, paddingVertical: 4, borderRadius: 20, marginLeft: 'auto' },
  dropText: { fontSize: 11, fontFamily: 'DMSans_700Bold', color: '#fff' },
  promiseQuote: { fontSize: 15, fontFamily: 'DMSans_400Regular', fontStyle: 'italic', lineHeight: 22 },
  duePill: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20 },
  dueText: { fontSize: 13, fontFamily: 'DMSans_600SemiBold' },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  locationText: { fontSize: 13, fontFamily: 'DMSans_400Regular' },
  smartBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 14,
    borderRadius: 14,
  },
  smartBtnText: { color: '#fff', fontSize: 15, fontFamily: 'DMSans_700Bold' },
  textBox: { borderRadius: 16, padding: 16 },
  extractedText: { fontSize: 13, fontFamily: 'DMSans_400Regular', lineHeight: 21 },
});
