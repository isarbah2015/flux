import React, { useCallback } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Clipboard from 'expo-clipboard';
import { useColors } from '@/hooks/useColors';
import { useScreenInsets } from '@/hooks/useScreenInsets';
import { usePremiumGate } from '@/hooks/usePremiumGate';
import { useScreenshots } from '@/context/ScreenshotsContext';
import { CATEGORY_COLORS, CATEGORY_ICONS, CATEGORY_LABELS } from '@/constants/colors';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import {
  addToCalendar,
  openProductDeal,
  setPromiseReminder,
  shareScreenshot,
} from '@/lib/actions';
import {
  copyFollowUpMessage,
  copyProofPack,
  openSmsFollowUp,
} from '@/lib/promise-follow-up';
import FormattedExtractedText from '@/components/FormattedExtractedText';
import ScreenshotImage from '@/components/ScreenshotImage';
import { formatExtractedText, formattedTextForCopy } from '@/lib/format-extracted-text';

export default function ScreenshotDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const { topPad, bottomPad } = useScreenInsets({ tabBar: false });
  const { getScreenshot, deleteScreenshot } = useScreenshots();
  const { requirePremium } = usePremiumGate();
  const screenshot = getScreenshot(id ?? '');

  const copyText = useCallback(async () => {
    if (!screenshot?.extractedText?.trim()) return;
    const paragraphs = formatExtractedText(screenshot.extractedText);
    await Clipboard.setStringAsync(formattedTextForCopy(paragraphs));
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, [screenshot?.extractedText]);

  const confirmDelete = useCallback(() => {
    if (!screenshot) return;
    Alert.alert(
      'Delete screenshot?',
      'This removes it from your library on this device.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            void (async () => {
              await deleteScreenshot(screenshot.id);
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              router.back();
            })();
          },
        },
      ],
    );
  }, [deleteScreenshot, screenshot]);

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
  const hasText = !!screenshot.extractedText?.trim();
  const wordCount = hasText
    ? screenshot.extractedText.trim().split(/\s+/).filter(Boolean).length
    : 0;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <LinearGradient
        colors={[catColor + '22', colors.background]}
        style={[styles.headerGlow, { paddingTop: topPad }]}
      >
        <View style={styles.topBar}>
          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => [
              styles.iconBtn,
              { backgroundColor: colors.card, opacity: pressed ? 0.7 : 1 },
            ]}
          >
            <Feather name="arrow-left" size={20} color={colors.foreground} />
          </Pressable>
          <View style={[styles.catChip, { backgroundColor: catColor + '28', borderColor: catColor + '55' }]}>
            <Feather name={catIcon as keyof typeof Feather.glyphMap} size={12} color={catColor} />
            <Text
              style={[styles.catChipText, { color: catColor }]}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {catLabel.toUpperCase()}
            </Text>
          </View>
          <Pressable
            onPress={() => { void shareScreenshot(screenshot); }}
            style={({ pressed }) => [
              styles.iconBtn,
              { backgroundColor: colors.card, opacity: pressed ? 0.7 : 1 },
            ]}
          >
            <Feather name="share-2" size={18} color={colors.foreground} />
          </Pressable>
          <Pressable
            onPress={confirmDelete}
            style={({ pressed }) => [
              styles.iconBtn,
              { backgroundColor: colors.card, opacity: pressed ? 0.7 : 1 },
            ]}
          >
            <Feather name="trash-2" size={18} color={colors.destructive} />
          </Pressable>
        </View>
      </LinearGradient>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scroll, { paddingBottom: bottomPad }]}
      >
        <View style={[styles.hero, { borderColor: catColor + '30' }]}>
          <ScreenshotImage
            imageUri={screenshot.imageUri}
            localAssetId={screenshot.localAssetId}
            screenshotId={screenshot.id}
            fallbackColor={catColor}
            style={styles.heroImage}
            contentFit="contain"
            iconSize={44}
          />
          <LinearGradient
            colors={['transparent', 'rgba(8,8,16,0.85)']}
            style={styles.heroFade}
            pointerEvents="none"
          />
          <View style={styles.heroMeta}>
            <Text style={styles.heroTitle} numberOfLines={2}>
              {screenshot.summary}
            </Text>
            <Text style={styles.heroDate}>
              {new Date(screenshot.capturedAt).toLocaleString(undefined, {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </Text>
          </View>
        </View>

        {screenshot.tags.length > 0 && (
          <View style={styles.tagsRow}>
            {screenshot.tags.map((tag) => (
              <View key={tag} style={[styles.tag, { backgroundColor: catColor + '18', borderColor: catColor + '35' }]}>
                <Text style={[styles.tagText, { color: catColor }]}>#{tag}</Text>
              </View>
            ))}
          </View>
        )}

        {screenshot.priceTracking && (
          <SmartBlock color="#FF9F0A" icon="tag" title="Price Watch">
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
            </View>
            <SmartBtn
              color="#FF9F0A"
              label="View Deal"
              icon="external-link"
              onPress={() => { void openProductDeal(screenshot); }}
            />
          </SmartBlock>
        )}

        {screenshot.promise && (
          <SmartBlock color="#FF375F" icon="user-check" title="Promise Tracker">
            <Text style={[styles.smartProduct, { color: colors.foreground }]}>
              {screenshot.promise.from}
            </Text>
            <Text style={[styles.promiseQuote, { color: colors.mutedForeground }]}>
              "{screenshot.promise.content}"
            </Text>
            <SmartBtn
              color="#FF375F"
              label="Set Reminder"
              icon="bell"
              onPress={() => {
                requirePremium('promise_reminders', () => {
                  void setPromiseReminder(screenshot);
                });
              }}
            />
            <SmartBtn
              color="#FF375F"
              label="Copy follow-up"
              icon="message-circle"
              onPress={() => {
                void copyFollowUpMessage(screenshot).then(() => {
                  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                });
              }}
            />
            <SmartBtn
              color="#FF375F"
              label="Proof pack"
              icon="clipboard"
              onPress={() => {
                void copyProofPack(screenshot).then(() => {
                  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                });
              }}
            />
            <SmartBtn
              color="#FF375F"
              label="Open Messages"
              icon="send"
              onPress={() => {
                void openSmsFollowUp(screenshot);
              }}
            />
          </SmartBlock>
        )}

        {screenshot.calendarEvent && (
          <SmartBlock color="#00D4FF" icon="calendar" title="Calendar">
            <Text style={[styles.smartProduct, { color: colors.foreground }]}>
              {screenshot.calendarEvent.title}
            </Text>
            <SmartBtn
              color="#00D4FF"
              label="Add to Calendar"
              icon="plus"
              dark
              onPress={() => {
                requirePremium('calendar_sync', () => {
                  void addToCalendar(screenshot);
                });
              }}
            />
          </SmartBlock>
        )}

        <View style={[styles.textCard, { borderColor: colors.border }]}>
          <LinearGradient
            colors={['#1A1830', '#13131F']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.textCardInner}
          >
            <View style={styles.textHeader}>
              <View style={styles.textHeaderLeft}>
                <View style={[styles.textIcon, { backgroundColor: '#7C72FF28' }]}>
                  <Feather name="type" size={14} color="#7C72FF" />
                </View>
                <View>
                  <Text style={styles.textTitle}>Extracted Text</Text>
                  <Text style={styles.textSub}>
                    {hasText
                      ? `${wordCount} word${wordCount === 1 ? '' : 's'} · searchable on device`
                      : 'Reading on your device…'}
                  </Text>
                </View>
              </View>
              {hasText && (
                <Pressable onPress={() => { void copyText(); }} style={styles.copyBtn}>
                  <Feather name="copy" size={14} color="#BAB4FF" />
                  <Text style={styles.copyLabel}>Copy</Text>
                </Pressable>
              )}
            </View>

            <View style={[styles.textBody, { backgroundColor: 'rgba(0,0,0,0.28)' }]}>
              {hasText ? (
                <FormattedExtractedText
                  text={screenshot.extractedText}
                  color="#EDEDF8"
                  mutedColor={colors.mutedForeground}
                  emptyMessage=""
                />
              ) : (
                <Text style={[styles.extractedText, { color: colors.mutedForeground }]}>
                  Flux is extracting text from this screenshot on your phone. Pull down on Library to re-scan if this stays empty after a minute.
                </Text>
              )}
            </View>
          </LinearGradient>
        </View>
      </ScrollView>
    </View>
  );
}

function SmartBlock({
  color, icon, title, children,
}: {
  color: string; icon: string; title: string; children: React.ReactNode;
}) {
  const colors = useColors();
  return (
    <View style={[styles.smartBlock, { backgroundColor: color + '10', borderColor: color + '28' }]}>
      <View style={styles.smartBlockHeader}>
        <View style={[styles.smartBlockIcon, { backgroundColor: color + '25' }]}>
          <Feather name={icon as keyof typeof Feather.glyphMap} size={14} color={color} />
        </View>
        <Text style={[styles.smartBlockTitle, { color }]}>{title.toUpperCase()}</Text>
      </View>
      {children}
    </View>
  );
}

function SmartBtn({
  color, label, icon, dark, onPress,
}: {
  color: string; label: string; icon: string; dark?: boolean; onPress?: () => void;
}) {
  return (
    <Pressable
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress?.();
      }}
      style={({ pressed }) => [
        styles.smartBtn,
        { backgroundColor: color, opacity: pressed ? 0.85 : 1 },
      ]}
    >
      <Text style={[styles.smartBtnText, dark && { color: '#0C0C14' }]}>{label}</Text>
      <Feather name={icon as keyof typeof Feather.glyphMap} size={14} color={dark ? '#0C0C14' : '#fff'} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  notFound: { fontSize: 16, fontFamily: 'DMSans_400Regular' },
  headerGlow: { paddingBottom: 4 },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 10,
    gap: 8,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  catChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    minWidth: 0,
    maxWidth: '52%',
  },
  catChipText: {
    fontSize: 11,
    fontFamily: 'DMSans_700Bold',
    letterSpacing: 1,
    flexShrink: 1,
    includeFontPadding: false,
  },
  scroll: { paddingHorizontal: 18, gap: 16, paddingTop: 4 },
  hero: {
    height: 300,
    borderRadius: 26,
    overflow: 'hidden',
    backgroundColor: '#0E0E18',
    borderWidth: 1,
  },
  heroImage: { flex: 1, width: '100%', height: '100%' },
  heroFade: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '55%',
  },
  heroMeta: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 16,
    gap: 4,
  },
  heroTitle: {
    color: '#fff',
    fontSize: 18,
    fontFamily: 'DMSans_700Bold',
    lineHeight: 24,
  },
  heroDate: {
    color: 'rgba(255,255,255,0.72)',
    fontSize: 12,
    fontFamily: 'DMSans_500Medium',
  },
  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tag: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  tagText: { fontSize: 12, fontFamily: 'DMSans_600SemiBold' },
  smartBlock: {
    borderRadius: 22,
    padding: 18,
    gap: 12,
    borderWidth: 1,
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
  promiseQuote: { fontSize: 15, fontFamily: 'DMSans_400Regular', fontStyle: 'italic', lineHeight: 22 },
  smartBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 14,
    borderRadius: 14,
  },
  smartBtnText: { color: '#fff', fontSize: 15, fontFamily: 'DMSans_700Bold' },
  textCard: {
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
  },
  textCardInner: {
    padding: 18,
    gap: 14,
  },
  textHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  textHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  textIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textTitle: {
    color: '#fff',
    fontSize: 15,
    fontFamily: 'DMSans_700Bold',
  },
  textSub: {
    color: 'rgba(186,180,255,0.65)',
    fontSize: 11,
    fontFamily: 'DMSans_400Regular',
    marginTop: 2,
  },
  copyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 12,
    backgroundColor: 'rgba(124,114,255,0.15)',
  },
  copyLabel: {
    color: '#BAB4FF',
    fontSize: 12,
    fontFamily: 'DMSans_600SemiBold',
  },
  textBody: {
    borderRadius: 16,
    padding: 16,
  },
  extractedText: {
    fontSize: 14,
    fontFamily: 'DMSans_400Regular',
    lineHeight: 23,
  },
});
