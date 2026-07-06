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
  const botPad = Platform.OS === 'web' ? 34 : insets.bottom;

  if (!screenshot) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, paddingTop: topPad }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </Pressable>
        <View style={styles.notFound}>
          <Text style={[styles.notFoundText, { color: colors.mutedForeground }]}>
            Screenshot not found
          </Text>
        </View>
      </View>
    );
  }

  const catColor = CATEGORY_COLORS[screenshot.category] ?? '#636384';
  const catIcon = CATEGORY_ICONS[screenshot.category] ?? 'image';
  const catLabel = CATEGORY_LABELS[screenshot.category] ?? 'Other';

  function handleAction(label: string) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: topPad + 8 }]}>
        <Pressable
          onPress={() => router.back()}
          style={[styles.backBtn, { backgroundColor: colors.secondary }]}
        >
          <Feather name="arrow-left" size={20} color={colors.foreground} />
        </Pressable>
        <View style={[styles.catPill, { backgroundColor: catColor + '22' }]}>
          <Text style={[styles.catLabel, { color: catColor }]}>{catLabel}</Text>
        </View>
        <Pressable style={[styles.backBtn, { backgroundColor: colors.secondary }]}>
          <Feather name="share-2" size={18} color={colors.foreground} />
        </Pressable>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scroll, { paddingBottom: botPad + 24 }]}
      >
        {/* Thumbnail */}
        <View style={[styles.thumbnail, { backgroundColor: catColor + '18' }]}>
          <View style={[styles.accentBar, { backgroundColor: catColor }]} />
          <View style={[styles.iconCircle, { backgroundColor: catColor + '22' }]}>
            <Feather name={catIcon as any} size={40} color={catColor} />
          </View>
          <Text style={[styles.capturedAt, { color: colors.mutedForeground }]}>
            {new Date(screenshot.capturedAt).toLocaleString()}
          </Text>
        </View>

        {/* Summary */}
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>Summary</Text>
          <Text style={[styles.summary, { color: colors.foreground }]}>{screenshot.summary}</Text>
        </View>

        {/* Tags */}
        {screenshot.tags.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>Tags</Text>
            <View style={styles.tagsRow}>
              {screenshot.tags.map((tag) => (
                <View
                  key={tag}
                  style={[styles.tag, { backgroundColor: colors.secondary, borderColor: colors.border }]}
                >
                  <Text style={[styles.tagText, { color: colors.mutedForeground }]}>#{tag}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Smart data */}
        {screenshot.priceTracking && (
          <View style={[styles.smartCard, { backgroundColor: '#FF9F0A' + '12', borderColor: '#FF9F0A' + '44' }]}>
            <View style={styles.smartCardHeader}>
              <Feather name="tag" size={16} color="#FF9F0A" />
              <Text style={[styles.smartCardTitle, { color: '#FF9F0A' }]}>Price Tracking</Text>
              {screenshot.priceTracking.priceDropped && (
                <View style={[styles.dropBadge, { backgroundColor: '#FF9F0A' }]}>
                  <Text style={styles.dropBadgeText}>Price Dropped!</Text>
                </View>
              )}
            </View>
            <Text style={[styles.smartCardProduct, { color: colors.foreground }]}>
              {screenshot.priceTracking.productName}
            </Text>
            <View style={styles.priceRow}>
              <View>
                <Text style={[styles.priceLabel, { color: colors.mutedForeground }]}>Was</Text>
                <Text style={[styles.priceOld, { color: colors.mutedForeground }]}>
                  {screenshot.priceTracking.detectedPrice}
                </Text>
              </View>
              <Feather name="arrow-right" size={16} color={colors.mutedForeground} />
              <View>
                <Text style={[styles.priceLabel, { color: colors.mutedForeground }]}>Now</Text>
                <Text style={[styles.priceNew, { color: '#FF9F0A' }]}>
                  {screenshot.priceTracking.currentPrice}
                </Text>
              </View>
              <View style={styles.priceRetailer}>
                <Text style={[styles.priceRetailerLabel, { color: colors.mutedForeground }]}>on</Text>
                <Text style={[styles.priceRetailerName, { color: colors.foreground }]}>
                  {screenshot.priceTracking.retailer}
                </Text>
              </View>
            </View>
            <Pressable
              onPress={() => handleAction('view deal')}
              style={[styles.smartBtn, { backgroundColor: '#FF9F0A' }]}
            >
              <Text style={styles.smartBtnText}>View Deal</Text>
              <Feather name="external-link" size={14} color="#fff" />
            </Pressable>
          </View>
        )}

        {screenshot.promise && (
          <View style={[styles.smartCard, { backgroundColor: '#FF375F' + '12', borderColor: '#FF375F' + '44' }]}>
            <View style={styles.smartCardHeader}>
              <Feather name="user-check" size={16} color="#FF375F" />
              <Text style={[styles.smartCardTitle, { color: '#FF375F' }]}>Promise Detected</Text>
            </View>
            <Text style={[styles.smartCardProduct, { color: colors.foreground }]}>
              {screenshot.promise.from}
            </Text>
            <Text style={[styles.promiseContent, { color: colors.mutedForeground }]}>
              "{screenshot.promise.content}"
            </Text>
            <View style={[styles.promiseDue, { backgroundColor: '#FF375F' + '22' }]}>
              <Feather name="clock" size={13} color="#FF375F" />
              <Text style={[styles.promiseDueText, { color: '#FF375F' }]}>
                Due: {screenshot.promise.deadline}
              </Text>
            </View>
            <Pressable
              onPress={() => handleAction('set reminder')}
              style={[styles.smartBtn, { backgroundColor: '#FF375F' }]}
            >
              <Text style={styles.smartBtnText}>Set Reminder</Text>
              <Feather name="bell" size={14} color="#fff" />
            </Pressable>
          </View>
        )}

        {screenshot.calendarEvent && (
          <View style={[styles.smartCard, { backgroundColor: '#00D4FF' + '12', borderColor: '#00D4FF' + '44' }]}>
            <View style={styles.smartCardHeader}>
              <Feather name="calendar" size={16} color="#00D4FF" />
              <Text style={[styles.smartCardTitle, { color: '#00D4FF' }]}>Calendar Event</Text>
            </View>
            <Text style={[styles.smartCardProduct, { color: colors.foreground }]}>
              {screenshot.calendarEvent.title}
            </Text>
            <Text style={[styles.promiseContent, { color: colors.mutedForeground }]}>
              {screenshot.calendarEvent.date}
              {screenshot.calendarEvent.time ? ' · ' + screenshot.calendarEvent.time : ''}
            </Text>
            {screenshot.calendarEvent.location && (
              <View style={styles.locationRow}>
                <Feather name="map-pin" size={13} color="#00D4FF" />
                <Text style={[styles.locationText, { color: colors.mutedForeground }]}>
                  {screenshot.calendarEvent.location}
                </Text>
              </View>
            )}
            <Pressable
              onPress={() => handleAction('add to calendar')}
              style={[styles.smartBtn, { backgroundColor: '#00D4FF' }]}
            >
              <Text style={[styles.smartBtnText, { color: '#0C0C14' }]}>Add to Calendar</Text>
              <Feather name="plus" size={14} color="#0C0C14" />
            </Pressable>
          </View>
        )}

        {/* Extracted text */}
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>Extracted Text</Text>
          <View style={[styles.textBox, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
            <Text style={[styles.extractedText, { color: colors.foreground }]}>
              {screenshot.extractedText}
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  catPill: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
  },
  catLabel: {
    fontSize: 13,
    fontFamily: 'Inter_600SemiBold',
  },
  scroll: {
    paddingHorizontal: 16,
    gap: 16,
  },
  thumbnail: {
    height: 180,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    gap: 12,
    overflow: 'hidden',
  },
  accentBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 4,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  capturedAt: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
  },
  section: { gap: 8 },
  sectionLabel: {
    fontSize: 11,
    fontFamily: 'Inter_600SemiBold',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  summary: {
    fontSize: 16,
    fontFamily: 'Inter_500Medium',
    lineHeight: 24,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  tag: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
  },
  tagText: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
  },
  smartCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    gap: 10,
  },
  smartCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  smartCardTitle: {
    fontSize: 13,
    fontFamily: 'Inter_700Bold',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    flex: 1,
  },
  dropBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
  },
  dropBadgeText: {
    fontSize: 11,
    fontFamily: 'Inter_700Bold',
    color: '#fff',
  },
  smartCardProduct: {
    fontSize: 17,
    fontFamily: 'Inter_700Bold',
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  priceLabel: {
    fontSize: 11,
    fontFamily: 'Inter_400Regular',
  },
  priceOld: {
    fontSize: 16,
    fontFamily: 'Inter_500Medium',
    textDecorationLine: 'line-through',
  },
  priceNew: {
    fontSize: 22,
    fontFamily: 'Inter_700Bold',
  },
  priceRetailer: { marginLeft: 'auto' },
  priceRetailerLabel: {
    fontSize: 11,
    fontFamily: 'Inter_400Regular',
  },
  priceRetailerName: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
  },
  smartBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 12,
  },
  smartBtnText: {
    color: '#fff',
    fontSize: 15,
    fontFamily: 'Inter_700Bold',
  },
  promiseContent: {
    fontSize: 15,
    fontFamily: 'Inter_400Regular',
    fontStyle: 'italic',
    lineHeight: 22,
  },
  promiseDue: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  promiseDueText: {
    fontSize: 13,
    fontFamily: 'Inter_600SemiBold',
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  locationText: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
  },
  textBox: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
  },
  extractedText: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    lineHeight: 20,
  },
  notFound: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notFoundText: {
    fontSize: 16,
    fontFamily: 'Inter_400Regular',
  },
});
