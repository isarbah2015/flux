import React, { useCallback, useMemo } from 'react';
import {
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useColors } from '@/hooks/useColors';
import { useScreenInsets } from '@/hooks/useScreenInsets';
import { useScreenshots } from '@/context/ScreenshotsContext';
import { useLocale } from '@/context/LocaleContext';
import { CATEGORY_FILTER_ORDER, type FilterCategory } from '@/constants/categories';
import ScreenshotCard from '@/components/ScreenshotCard';
import CategoryPill from '@/components/CategoryPill';
import FluxLogo from '@/components/FluxLogo';
import { Feather } from '@expo/vector-icons';
import { router, type Href } from 'expo-router';
import * as Haptics from 'expo-haptics';

type GridRow =
  | { left: ReturnType<typeof useScreenshots>['filteredScreenshots'][number]; right: ReturnType<typeof useScreenshots>['filteredScreenshots'][number] | null }
  | '__empty__';

export default function LibraryScreen() {
  const colors = useColors();
  const { topPad, bottomPad } = useScreenInsets();
  const {
    screenshots,
    filteredScreenshots,
    activeCategory,
    setActiveCategory,
    totalIndexed,
    isLoading,
    isScanning,
    scanMessage,
    scanProgress,
    scanDeviceScreenshots,
    refresh,
  } = useScreenshots();
  const { t } = useLocale();

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { all: screenshots.length };
    for (const shot of screenshots) {
      counts[shot.category] = (counts[shot.category] ?? 0) + 1;
    }
    return counts;
  }, [screenshots]);

  const runScan = useCallback(() => {
    Haptics.selectionAsync();
    void scanDeviceScreenshots();
  }, [scanDeviceScreenshots]);

  const onRefresh = useCallback(() => {
    refresh();
    void scanDeviceScreenshots();
  }, [refresh, scanDeviceScreenshots]);

  const openImport = useCallback(() => {
    Haptics.selectionAsync();
    router.push('/import' as Href);
  }, []);

  const gridData: GridRow[] = useMemo(
    () =>
      filteredScreenshots.length === 0
        ? ['__empty__']
        : Array.from({ length: Math.ceil(filteredScreenshots.length / 2) }, (_, i) => ({
            left: filteredScreenshots[i * 2],
            right: filteredScreenshots[i * 2 + 1] ?? null,
          })),
    [filteredScreenshots],
  );

  const listHeader = useMemo(
    () => (
      <View style={styles.headerBlock}>
        <View style={[styles.header, { paddingTop: topPad }]}>
          <View style={styles.headerLeft}>
            <FluxLogo size={28} style={styles.logoMark} />
            <View style={styles.headerText}>
              <Text style={[styles.logo, { color: colors.foreground }]} numberOfLines={1}>
                {t('library.title')}
              </Text>
              <Text
                style={[styles.subtitle, { color: colors.mutedForeground }]}
                numberOfLines={2}
                ellipsizeMode="tail"
              >
                {t('library.subtitle', { count: totalIndexed })}
              </Text>
            </View>
          </View>
          <View style={styles.headerActions}>
            <Pressable
              onPress={runScan}
              disabled={isScanning}
              hitSlop={10}
              style={({ pressed }) => [
                styles.iconBtn,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                  opacity: isScanning ? 0.6 : pressed ? 0.85 : 1,
                },
              ]}
            >
              <Feather
                name={isScanning ? 'loader' : 'refresh-cw'}
                size={18}
                color={isScanning ? colors.primary : colors.foreground}
              />
            </Pressable>
            <Pressable
              onPress={openImport}
              hitSlop={10}
              style={({ pressed }) => [
                styles.iconBtn,
                styles.importBtn,
                { backgroundColor: colors.primary, transform: [{ scale: pressed ? 0.92 : 1 }] },
              ]}
            >
              <Feather name="plus" size={20} color={colors.primaryForeground} />
            </Pressable>
          </View>
        </View>

        {(isScanning || scanMessage) && (
          <View style={[styles.scanBanner, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Feather
              name={isScanning ? 'smartphone' : 'check-circle'}
              size={16}
              color={isScanning ? colors.primary : '#30D158'}
            />
            <Text
              style={[styles.scanBannerText, { color: colors.mutedForeground }]}
              numberOfLines={3}
              ellipsizeMode="tail"
            >
              {isScanning && scanProgress
                ? scanMessage
                : isScanning
                  ? t('library.scanReading')
                  : scanMessage}
            </Text>
          </View>
        )}

        <View style={styles.categoriesSection}>
          <Text style={[styles.categoriesLabel, { color: colors.mutedForeground }]}>{t('library.categories')}</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.pillsContent}
            style={styles.pillsScroll}
          >
            {CATEGORY_FILTER_ORDER.map((cat) => (
              <CategoryPill
                key={cat}
                value={cat as FilterCategory}
                active={activeCategory === cat}
                count={categoryCounts[cat] ?? 0}
                dimmed={cat !== 'all' && (categoryCounts[cat] ?? 0) === 0}
                onPress={() => setActiveCategory(cat as FilterCategory)}
              />
            ))}
          </ScrollView>
        </View>
      </View>
    ),
    [
      activeCategory,
      categoryCounts,
      colors,
      isScanning,
      runScan,
      openImport,
      scanMessage,
      scanProgress,
      setActiveCategory,
      topPad,
      totalIndexed,
      t,
    ],
  );

  const renderItem = useCallback(
    ({ item }: { item: GridRow }) => {
      if (item === '__empty__') {
        return (
          <View style={styles.emptyState}>
            <Feather name="zap" size={36} color={colors.primary} />
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
              {isScanning ? t('library.indexing') : t('library.emptyTitle')}
            </Text>
            <Text style={[styles.emptySub, { color: colors.mutedForeground }]}>
              {isScanning
                ? t('library.emptyScanning')
                : totalIndexed === 0
                  ? t('library.emptyNoIndex')
                  : t('library.emptyHasIndex')}
            </Text>
          </View>
        );
      }
      return (
        <View style={styles.row}>
          <ScreenshotCard item={item.left} />
          {item.right ? <ScreenshotCard item={item.right} /> : <View style={styles.emptyCell} />}
        </View>
      );
    },
    [colors, isScanning, totalIndexed, t],
  );

  if (isLoading) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: colors.background }]}>
        <FluxLogo size={48} />
        <Text style={[styles.loadingText, { color: colors.mutedForeground }]}>{t('library.loading')}</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <FlatList
        style={styles.list}
        data={gridData}
        keyExtractor={(item) => (typeof item === 'string' ? item : item.left.id)}
        renderItem={renderItem}
        ListHeaderComponent={listHeader}
        contentContainerStyle={[styles.grid, { paddingBottom: bottomPad }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isScanning} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  list: { flex: 1 },
  headerBlock: { gap: 0 },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  headerLeft: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginRight: 10,
  },
  headerText: { flex: 1, minWidth: 0 },
  logoMark: { flexShrink: 0 },
  logo: {
    fontSize: 28,
    fontFamily: 'DMSans_700Bold',
    letterSpacing: -0.8,
    includeFontPadding: false,
  },
  subtitle: {
    fontSize: 12,
    fontFamily: 'DMSans_400Regular',
    marginTop: 4,
    lineHeight: 17,
    includeFontPadding: false,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexShrink: 0,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  importBtn: { borderWidth: 0 },
  scanBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginHorizontal: 20,
    marginBottom: 10,
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderRadius: 14,
    borderWidth: 1,
  },
  scanBannerText: {
    flex: 1,
    fontSize: 13,
    fontFamily: 'DMSans_400Regular',
    lineHeight: 18,
    includeFontPadding: false,
  },
  categoriesSection: { marginBottom: 6, gap: 6 },
  categoriesLabel: {
    paddingHorizontal: 20,
    fontSize: 11,
    fontFamily: 'DMSans_600SemiBold',
    letterSpacing: 1,
    textTransform: 'uppercase',
    includeFontPadding: false,
  },
  pillsScroll: { flexGrow: 0 },
  pillsContent: {
    paddingHorizontal: 18,
    paddingVertical: 4,
    paddingRight: 24,
    alignItems: 'center',
  },
  grid: { paddingHorizontal: 4, flexGrow: 1 },
  row: { flexDirection: 'row' },
  emptyCell: { flex: 1, margin: 6 },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    paddingHorizontal: 28,
    gap: 10,
  },
  emptyTitle: {
    fontSize: 17,
    fontFamily: 'DMSans_600SemiBold',
    textAlign: 'center',
    includeFontPadding: false,
  },
  emptySub: {
    fontSize: 14,
    fontFamily: 'DMSans_400Regular',
    textAlign: 'center',
    lineHeight: 21,
    maxWidth: 300,
    includeFontPadding: false,
  },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText: { fontSize: 14, fontFamily: 'DMSans_400Regular' },
});
