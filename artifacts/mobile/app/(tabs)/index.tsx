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
import OnboardingScreen from '@/components/OnboardingScreen';
import { Feather } from '@expo/vector-icons';

const CATEGORIES: (Category | 'all')[] = [
  'all', 'shopping', 'work', 'travel', 'receipt', 'conversation', 'unknown',
];

export default function LibraryScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const {
    hasOnboarded, isLoading, isProcessing, processingProgress,
    filteredScreenshots, activeCategory, setActiveCategory, totalIndexed,
  } = useScreenshots();

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
              Screenshots in this category will appear here
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

  if (isLoading) return null;
  if (!hasOnboarded) return <OnboardingScreen />;

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
        <View>
          <Text style={[styles.logo, { color: colors.foreground }]}>Library</Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
            {totalIndexed} screenshots indexed
          </Text>
        </View>
        {isProcessing && (
          <View style={[styles.processingPill, { backgroundColor: colors.primary + '22' }]}>
            <Feather name="cpu" size={12} color={colors.primary} />
            <Text style={[styles.processingText, { color: colors.primary }]}>
              {Math.round(processingProgress)}%
            </Text>
          </View>
        )}
      </View>

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
  processingPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  processingText: {
    fontSize: 12,
    fontFamily: 'DMSans_600SemiBold',
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
});
