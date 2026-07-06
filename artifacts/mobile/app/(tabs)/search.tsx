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

const RECENT_SEARCHES = ['flight', 'nike', 'receipt', 'promise', 'meeting'];

function ResultRow({ item, query }: { item: Screenshot; query: string }) {
  const colors = useColors();
  const catColor = CATEGORY_COLORS[item.category] ?? '#636384';
  const icon = CATEGORY_ICONS[item.category] ?? 'image';
  const catLabel = CATEGORY_LABELS[item.category];

  const q = query.toLowerCase();
  const idx = item.extractedText.toLowerCase().indexOf(q);
  let snippet = item.summary;
  if (idx !== -1) {
    const start = Math.max(0, idx - 28);
    const end = Math.min(item.extractedText.length, idx + query.length + 55);
    snippet =
      (start > 0 ? '…' : '') +
      item.extractedText.slice(start, end) +
      (end < item.extractedText.length ? '…' : '');
  }

  return (
    <Pressable
      onPress={() => { Haptics.selectionAsync(); router.push(`/screenshot/${item.id}`); }}
      style={({ pressed }) => [
        styles.result,
        {
          backgroundColor: catColor + '0C',
          shadowColor: catColor,
          transform: [{ scale: pressed ? 0.97 : 1 }],
        },
      ]}
    >
      <View style={[styles.resultIcon, { backgroundColor: catColor + '25' }]}>
        <Feather name={icon as any} size={18} color={catColor} />
      </View>
      <View style={styles.resultText}>
        <Text style={[styles.resultCat, { color: catColor }]}>{catLabel.toUpperCase()}</Text>
        <Text style={[styles.snippet, { color: colors.foreground }]} numberOfLines={2}>
          {snippet}
        </Text>
      </View>
      <Feather name="chevron-right" size={15} color={colors.mutedForeground} />
    </Pressable>
  );
}

export default function SearchScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { searchScreenshots } = useScreenshots();
  const [query, setQuery] = useState('');
  const results = query.length > 0 ? searchScreenshots(query) : [];

  const topPad = Platform.OS === 'web' ? 67 : insets.top;
  const botPad = Platform.OS === 'web' ? 148 : Math.max(insets.bottom, 8) + 98;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 16 }]}>
        <Text style={[styles.title, { color: colors.foreground }]}>Search</Text>
        <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
          Every word, every screenshot
        </Text>
      </View>

      {/* Search bar — no border, just a filled surface */}
      <View style={[styles.searchWrap, { backgroundColor: colors.secondary }]}>
        <Feather name="search" size={17} color={colors.mutedForeground} />
        <TextInput
          style={[styles.input, { color: colors.foreground }]}
          placeholder="Type anything…"
          placeholderTextColor={colors.mutedForeground}
          value={query}
          onChangeText={setQuery}
          autoCorrect={false}
          clearButtonMode="while-editing"
        />
        {query.length > 0 && Platform.OS !== 'ios' && (
          <Pressable onPress={() => setQuery('')}>
            <Feather name="x-circle" size={16} color={colors.mutedForeground} />
          </Pressable>
        )}
      </View>

      {query.length === 0 ? (
        <View style={styles.recentSection}>
          <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>Recent</Text>
          <View style={styles.recentRow}>
            {RECENT_SEARCHES.map((s) => (
              <Pressable
                key={s}
                onPress={() => setQuery(s)}
                style={({ pressed }) => [
                  styles.recentPill,
                  { backgroundColor: colors.secondary, opacity: pressed ? 0.7 : 1 },
                ]}
              >
                <Feather name="clock" size={11} color={colors.mutedForeground} />
                <Text style={[styles.recentText, { color: colors.foreground }]}>{s}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      ) : results.length === 0 ? (
        <View style={styles.noResults}>
          <View style={[styles.emptyIcon, { backgroundColor: colors.secondary }]}>
            <Feather name="search" size={28} color={colors.mutedForeground} />
          </View>
          <Text style={[styles.noResultsTitle, { color: colors.foreground }]}>No matches</Text>
          <Text style={[styles.noResultsSub, { color: colors.mutedForeground }]}>
            Nothing found for "{query}"
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
            <Text style={[styles.count, { color: colors.mutedForeground }]}>
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
  header: { paddingHorizontal: 22, paddingBottom: 16, gap: 3 },
  title: { fontSize: 30, fontFamily: 'DMSans_700Bold', letterSpacing: -1 },
  subtitle: { fontSize: 13, fontFamily: 'DMSans_400Regular' },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginHorizontal: 20,
    marginBottom: 22,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 18,
  },
  input: { flex: 1, fontSize: 16, fontFamily: 'DMSans_400Regular' },
  recentSection: { paddingHorizontal: 22, gap: 12 },
  sectionLabel: {
    fontSize: 11,
    fontFamily: 'DMSans_600SemiBold',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  recentRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  recentPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 13,
    paddingVertical: 8,
    borderRadius: 20,
  },
  recentText: { fontSize: 13, fontFamily: 'DMSans_400Regular' },
  noResults: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  emptyIcon: { width: 72, height: 72, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  noResultsTitle: { fontSize: 17, fontFamily: 'DMSans_600SemiBold' },
  noResultsSub: { fontSize: 14, fontFamily: 'DMSans_400Regular' },
  list: { paddingHorizontal: 20, paddingTop: 4, gap: 8 },
  count: { fontSize: 12, fontFamily: 'DMSans_500Medium', marginBottom: 8 },
  result: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 18,
    marginBottom: 8,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 4,
  },
  resultIcon: { width: 42, height: 42, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  resultText: { flex: 1, gap: 3 },
  resultCat: { fontSize: 9, fontFamily: 'DMSans_700Bold', letterSpacing: 1.2 },
  snippet: { fontSize: 13, fontFamily: 'DMSans_400Regular', lineHeight: 18 },
});
