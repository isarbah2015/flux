import React, { useCallback } from 'react';
import {
  FlatList,
  Platform,
  Pressable,
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
import { router } from 'expo-router';

const CATEGORIES: (Category | 'all')[] = [
  'all',
  'shopping',
  'work',
  'travel',
  'receipt',
  'conversation',
  'unknown',
];

export default function LibraryScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const {
    hasOnboarded,
    isLoading,
    isProcessing,
    processingProgress,
    filteredScreenshots,
    activeCategory,
    setActiveCategory,
    totalIndexed,
  } = useScreenshots();

  const topPad = Platform.OS === 'web' ? 67 : insets.top;
  const botPad = Platform.OS === 'web' ? 34 + 84 : insets.bottom + 60;

  const renderItem = useCallback(
    ({ item }: { item: { left: Screenshot; right: Screenshot | null } | '__empty__' }) => {
      if (item === '__empty__') {
        return (
          <View style={styles.emptyState}>
            <Feather name="image" size={40} color={colors.mutedForeground} />
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No screenshots yet</Text>
            <Text style={[styles.emptySubtitle, { color: colors.mutedForeground }]}>
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

  // Wait for AsyncStorage to resolve before deciding which screen to show
  if (isLoading) return null;

  if (!hasOnboarded) {
    return <OnboardingScreen />;
  }

  // Build paired rows for 2-column grid
  type GridRow = { left: Screenshot; right: Screenshot | null } | '__empty__';
  const gridData: GridRow[] = filteredScreenshots.length === 0
    ? ['__empty__']
    : Array.from({ length: Math.ceil(filteredScreenshots.length / 2) }, (_, i) => ({
        left: filteredScreenshots[i * 2],
        right: filteredScreenshots[i * 2 + 1] ?? null,
      }));

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: topPad + 12 }]}>
        <View style={styles.headerLeft}>
          <Text style={[styles.logo, { color: colors.foreground }]}>Flux</Text>
          {totalIndexed > 0 && (
            <View style={[styles.indexedBadge, { backgroundColor: colors.primary + '22' }]}>
              <Text style={[styles.indexedText, { color: colors.primary }]}>
                {totalIndexed} indexed
              </Text>
            </View>
          )}
        </View>
        <Pressable
          onPress={() => router.push('/screenshot/1')}
          style={[styles.headerBtn, { backgroundColor: colors.secondary }]}
        >
          <Feather name="sliders" size={18} color={colors.foreground} />
        </Pressable>
      </View>

      {/* Processing banner */}
      {isProcessing && (
        <View style={[styles.processingBanner, { backgroundColor: colors.primary + '18', borderColor: colors.primary + '44' }]}>
          <Feather name="cpu" size={14} color={colors.primary} />
          <Text style={[styles.processingText, { color: colors.primary }]}>
            Analyzing screenshots… {Math.round(processingProgress)}%
          </Text>
          <View style={[styles.progressTrack, { backgroundColor: colors.primary + '33' }]}>
            <View
              style={[
                styles.progressFill,
                { backgroundColor: colors.primary, width: `${processingProgress}%` as any },
              ]}
            />
          </View>
        </View>
      )}

      {/* Category pills */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.pillsRow}
        style={styles.pillsScroll}
      >
        {CATEGORIES.map((cat) => (
          <CategoryPill
            key={cat}
            value={cat}
            active={activeCategory === cat}
            onPress={() => setActiveCategory(cat)}
          />
        ))}
      </ScrollView>

      {/* Grid */}
      <FlatList
        data={gridData}
        keyExtractor={(item, i) => (typeof item === 'string' ? item : item.left.id)}
        renderItem={renderItem}
        contentContainerStyle={[styles.grid, { paddingBottom: botPad }]}
        showsVerticalScrollIndicator={false}
        scrollEnabled={filteredScreenshots.length > 0}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  logo: {
    fontSize: 28,
    fontFamily: 'Inter_700Bold',
    letterSpacing: -1,
  },
  indexedBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  indexedText: {
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
  },
  headerBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  processingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  processingText: {
    fontSize: 13,
    fontFamily: 'Inter_500Medium',
    flex: 1,
  },
  progressTrack: {
    width: 60,
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: 4,
    borderRadius: 2,
  },
  pillsScroll: {
    flexGrow: 0,
    marginBottom: 8,
  },
  pillsRow: {
    paddingHorizontal: 16,
    paddingVertical: 4,
  },
  grid: {
    paddingHorizontal: 10,
    paddingTop: 4,
  },
  row: {
    flexDirection: 'row',
  },
  emptyCell: {
    flex: 1,
    margin: 5,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    gap: 10,
  },
  emptyTitle: {
    fontSize: 17,
    fontFamily: 'Inter_600SemiBold',
  },
  emptySubtitle: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    textAlign: 'center',
    maxWidth: 260,
  },
});
