import React, { useCallback } from 'react';
import {
  FlatList,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { useScreenshots, type Category, type Screenshot } from '@/context/ScreenshotsContext';
import ScreenshotCard from '@/components/ScreenshotCard';
import CategoryPill from '@/components/CategoryPill';
import FluxLogo from '@/components/FluxLogo';
import { Feather } from '@expo/vector-icons';
import { router, type Href } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Pressable } from 'react-native';

const CATEGORIES: (Category | 'all')[] = [
  'all', 'shopping', 'work', 'travel', 'receipt', 'conversation', 'unknown',
];

export default function LibraryScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const {
    filteredScreenshots,
    activeCategory,
    setActiveCategory,
    totalIndexed,
    isLoading,
    isScanning,
    scanMessage,
    scanProgress,
    scanDeviceScreenshots,
  } = useScreenshots();

  const runScan = useCallback(() => {
    Haptics.selectionAsync();
    void scanDeviceScreenshots();
  }, [scanDeviceScreenshots]);

  const openImport = useCallback(() => {
    Haptics.selectionAsync();
    // Cast: the typed-routes union regenerates to include '/import' when the
    // Expo dev server runs; the cast keeps typecheck green until then.
    router.push('/import' as Href);
  }, []);

  const topPad = Platform.OS === 'web' ? 67 : insets.top;
  // Clear the floating pill (66px) + its bottom margin + breathing room
  const botPad = Platform.OS === 'web' ? 148 : Math.max(insets.bottom, 8) + 98;

  type GridRow = { left: Screenshot; right: Screenshot | null } | '__empty__';

  const renderItem = useCallback(
    ({ item }: { item: GridRow }) => {
      if (item === '__empty__') {
        return (
          <View style={styles.emptyState}>
            <Feather name="image" size={38} color={colors.mutedForeground} />
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>Nothing here yet</Text>
            <Text style={[styles.emptySub, { color: colors.mutedForeground }]}>
              Take a screenshot, open Flux, or tap the scan button above
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
    [colors],
  );

  if (isLoading) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: colors.background }]}>
        <FluxLogo size={64} />
        <Text style={[styles.loadingText, { color: colors.mutedForeground }]}>Loading library…</Text>
      </View>
    );
  }

  const gridData: GridRow[] =
    filteredScreenshots.length === 0
      ? ['__empty__']
      : Array.from({ length: Math.ceil(filteredScreenshots.length / 2) }, (_, i) => ({
          left: filteredScreenshots[i * 2],
          right: filteredScreenshots[i * 2 + 1] ?? null,
        }));

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: topPad + 16 }]}>
        <View style={styles.headerLeft}>
          <FluxLogo size={36} style={styles.logoMark} />
          <View>
            <Text style={[styles.logo, { color: colors.foreground }]}>Library</Text>
            <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
              {totalIndexed} screenshot{totalIndexed === 1 ? '' : 's'} indexed
            </Text>
          </View>
        </View>
        <View style={styles.headerActions}>
          <Pressable
            onPress={runScan}
            disabled={isScanning}
            hitSlop={10}
            style={({ pressed }) => [
              styles.scanBtn,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
                opacity: isScanning ? 0.6 : pressed ? 0.85 : 1,
              },
            ]}
          >
            {isScanning ? (
              <Feather name="loader" size={18} color={colors.primary} />
            ) : (
              <Feather name="refresh-cw" size={18} color={colors.foreground} />
            )}
          </Pressable>
          <Pressable
            onPress={openImport}
            hitSlop={10}
            style={({ pressed }) => [
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
          <Text style={[styles.scanBannerText, { color: colors.mutedForeground }]}>
            {isScanning && scanProgress
              ? scanMessage
              : isScanning
                ? 'Scanning your Screenshots album…'
                : scanMessage}
          </Text>
        </View>
      )}

      {/* Category pills — inner View carries the padding so left edge isn't clipped on web */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.pillsScroll}
      >
        <View style={styles.pillsRow}>
          {CATEGORIES.map((cat) => (
            <CategoryPill
              key={cat}
              value={cat}
              active={activeCategory === cat}
              onPress={() => setActiveCategory(cat)}
            />
          ))}
        </View>
      </ScrollView>

      {/* Grid */}
      <FlatList
        data={gridData}
        keyExtractor={(item) => (typeof item === 'string' ? item : item.left.id)}
        renderItem={renderItem}
        contentContainerStyle={[styles.grid, { paddingBottom: botPad }]}
        showsVerticalScrollIndicator={false}
        scrollEnabled={filteredScreenshots.length > 0}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingHorizontal: 22,
    paddingBottom: 14,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  logoMark: {
    flexShrink: 0,
  },
  logo: {
    fontSize: 30,
    fontFamily: 'DMSans_700Bold',
    letterSpacing: -1,
  },
  subtitle: {
    fontSize: 13,
    fontFamily: 'DMSans_400Regular',
    marginTop: 2,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  scanBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scanBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 22,
    marginBottom: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  scanBannerText: {
    flex: 1,
    fontSize: 13,
    fontFamily: 'DMSans_400Regular',
    lineHeight: 18,
  },
  importBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillsScroll: { flexGrow: 0, marginBottom: 6 },
  pillsRow: { flexDirection: 'row', paddingHorizontal: 20, paddingVertical: 4 },
  grid: { paddingHorizontal: 6, paddingTop: 4 },
  row: { flexDirection: 'row' },
  emptyCell: { flex: 1, margin: 6 },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 70,
    gap: 10,
  },
  emptyTitle: {
    fontSize: 17,
    fontFamily: 'DMSans_600SemiBold',
  },
  emptySub: {
    fontSize: 14,
    fontFamily: 'DMSans_400Regular',
    textAlign: 'center',
    maxWidth: 240,
  },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText: { fontSize: 14, fontFamily: 'DMSans_400Regular' },
});
