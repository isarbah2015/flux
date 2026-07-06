import React, { useState } from 'react';
import {
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { useScreenshots, type Screenshot } from '@/context/ScreenshotsContext';
import { CATEGORY_COLORS, CATEGORY_ICONS, CATEGORY_LABELS } from '@/constants/colors';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';

function highlight(text: string, query: string): string {
  return text;
}

function ResultRow({ item, query }: { item: Screenshot; query: string }) {
  const colors = useColors();
  const catColor = CATEGORY_COLORS[item.category] ?? '#636384';
  const catLabel = CATEGORY_LABELS[item.category] ?? 'Other';
  const icon = CATEGORY_ICONS[item.category] ?? 'image';

  // Find the matching snippet
  const q = query.toLowerCase();
  const idx = item.extractedText.toLowerCase().indexOf(q);
  let snippet = item.summary;
  if (idx !== -1) {
    const start = Math.max(0, idx - 30);
    const end = Math.min(item.extractedText.length, idx + query.length + 60);
    snippet = (start > 0 ? '…' : '') + item.extractedText.slice(start, end) + (end < item.extractedText.length ? '…' : '');
  }

  return (
    <Pressable
      onPress={() => { Haptics.selectionAsync(); router.push(`/screenshot/${item.id}`); }}
      style={({ pressed }) => [
        styles.resultRow,
        { backgroundColor: colors.card, borderColor: colors.border, opacity: pressed ? 0.85 : 1 },
      ]}
    >
      <View style={[styles.resultIcon, { backgroundColor: catColor + '22' }]}>
        <Feather name={icon as any} size={18} color={catColor} />
      </View>
      <View style={styles.resultContent}>
        <View style={styles.resultHeader}>
          <Text style={[styles.catLabel, { color: catColor }]}>{catLabel}</Text>
          <Text style={[styles.resultTime, { color: colors.mutedForeground }]}>
            {new Date(item.capturedAt).toLocaleDateString()}
          </Text>
        </View>
        <Text style={[styles.snippet, { color: colors.foreground }]} numberOfLines={2}>
          {snippet}
        </Text>
      </View>
      <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
    </Pressable>
  );
}

const RECENT_SEARCHES = ['flight', 'nike', 'receipt', 'promise', 'meeting'];

export default function SearchScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { searchScreenshots } = useScreenshots();
  const [query, setQuery] = useState('');
  const results = query.length > 0 ? searchScreenshots(query) : [];

  const topPad = Platform.OS === 'web' ? 67 : insets.top;
  const botPad = Platform.OS === 'web' ? 34 + 84 : insets.bottom + 60;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: topPad + 12 }]}>
        <Text style={[styles.title, { color: colors.foreground }]}>Search</Text>
        <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
          Every word in every screenshot
        </Text>
      </View>

      {/* Search bar */}
      <View style={[styles.searchBar, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
        <Feather name="search" size={18} color={colors.mutedForeground} />
        <TextInput
          style={[styles.searchInput, { color: colors.foreground }]}
          placeholder="Search screenshots…"
          placeholderTextColor={colors.mutedForeground}
          value={query}
          onChangeText={setQuery}
          autoCorrect={false}
          clearButtonMode="while-editing"
        />
        {query.length > 0 && Platform.OS !== 'ios' && (
          <Pressable onPress={() => setQuery('')}>
            <Feather name="x" size={16} color={colors.mutedForeground} />
          </Pressable>
        )}
      </View>

      {query.length === 0 ? (
        /* Recent searches */
        <View style={styles.recentWrap}>
          <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>Recent Searches</Text>
          <View style={styles.recentPills}>
            {RECENT_SEARCHES.map((s) => (
              <Pressable
                key={s}
                onPress={() => setQuery(s)}
                style={[styles.recentPill, { backgroundColor: colors.secondary, borderColor: colors.border }]}
              >
                <Feather name="clock" size={12} color={colors.mutedForeground} />
                <Text style={[styles.recentText, { color: colors.foreground }]}>{s}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      ) : results.length === 0 ? (
        <View style={styles.noResults}>
          <Feather name="search" size={36} color={colors.mutedForeground} />
          <Text style={[styles.noResultsTitle, { color: colors.foreground }]}>No results</Text>
          <Text style={[styles.noResultsSub, { color: colors.mutedForeground }]}>
            No screenshots contain "{query}"
          </Text>
        </View>
      ) : (
        <FlatList
          data={results}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <ResultRow item={item} query={query} />}
          contentContainerStyle={[styles.list, { paddingBottom: botPad }]}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <Text style={[styles.resultsCount, { color: colors.mutedForeground }]}>
              {results.length} result{results.length !== 1 ? 's' : ''}
            </Text>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    gap: 4,
  },
  title: {
    fontSize: 28,
    fontFamily: 'Inter_700Bold',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginHorizontal: 16,
    marginBottom: 20,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    fontFamily: 'Inter_400Regular',
  },
  recentWrap: {
    paddingHorizontal: 20,
    gap: 12,
  },
  sectionLabel: {
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  recentPills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  recentPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
  },
  recentText: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
  },
  noResults: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  noResultsTitle: {
    fontSize: 17,
    fontFamily: 'Inter_600SemiBold',
  },
  noResultsSub: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
  },
  list: {
    paddingHorizontal: 16,
    paddingTop: 4,
    gap: 8,
  },
  resultsCount: {
    fontSize: 12,
    fontFamily: 'Inter_500Medium',
    marginBottom: 8,
  },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 8,
  },
  resultIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resultContent: { flex: 1, gap: 3 },
  resultHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  catLabel: {
    fontSize: 11,
    fontFamily: 'Inter_600SemiBold',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  resultTime: {
    fontSize: 11,
    fontFamily: 'Inter_400Regular',
  },
  snippet: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    lineHeight: 18,
  },
});
