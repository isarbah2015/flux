import React, { useEffect, useMemo, useState } from 'react';
import {
  FlatList,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useColors } from '@/hooks/useColors';
import { useScreenInsets } from '@/hooks/useScreenInsets';
import { useScreenshots, type Screenshot } from '@/context/ScreenshotsContext';
import { useLocale } from '@/context/LocaleContext';
import { translateCategory } from '@/lib/i18n';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { incrementSearchCount } from '@/lib/app-analytics';
import {
  searchScreenshotsAdvanced,
  type SearchFilter,
} from '@/lib/search-engine';
import { CATEGORY_COLORS, CATEGORY_ICONS } from '@/constants/colors';

const FALLBACK_SEARCHES = ['receipt', 'flight', 'nike', 'promise', 'meeting'];

function ResultRow({ item, query }: { item: Screenshot; query: string }) {
  const colors = useColors();
  const { locale } = useLocale();
  const catColor = CATEGORY_COLORS[item.category] ?? '#636384';
  const icon = CATEGORY_ICONS[item.category] ?? 'image';
  const catLabel = translateCategory(locale, item.category);

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
        <Text style={[styles.resultCat, { color: catColor }]} numberOfLines={1}>
          {catLabel.toUpperCase()}
        </Text>
        <Text
          style={[styles.snippet, { color: colors.foreground }]}
          numberOfLines={2}
          ellipsizeMode="tail"
        >
          {snippet}
        </Text>
      </View>
      <Feather name="chevron-right" size={15} color={colors.mutedForeground} />
    </Pressable>
  );
}

export default function SearchScreen() {
  const colors = useColors();
  const { topPad, bottomPad } = useScreenInsets();
  const {
    screenshots,
    totalIndexed,
    isScanning,
    scanDeviceScreenshots,
  } = useScreenshots();
  const { t } = useLocale();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<SearchFilter>('all');
  const [results, setResults] = useState<Screenshot[]>([]);
  const [searching, setSearching] = useState(false);

  const quickSearches = useMemo(() => {
    const fromData = new Set<string>();
    for (const shot of screenshots.slice(0, 40)) {
      if (shot.category !== 'unknown') fromData.add(shot.category);
      for (const tag of shot.tags.slice(0, 2)) {
        if (tag.length > 2) fromData.add(tag.toLowerCase());
      }
    }
    const merged = [...fromData, ...FALLBACK_SEARCHES];
    return [...new Set(merged)].slice(0, 6);
  }, [screenshots]);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }
    let cancelled = false;
    setSearching(true);
    const timer = setTimeout(() => {
      const hits = searchScreenshotsAdvanced(screenshots, query, filter);
      if (!cancelled) {
        setResults(hits);
        setSearching(false);
        void incrementSearchCount();
      }
    }, 160);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query, filter, screenshots]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPad }]}>
        <Text style={[styles.title, { color: colors.foreground }]} numberOfLines={1}>
          {t('search.title')}
        </Text>
        <Text
          style={[styles.subtitle, { color: colors.mutedForeground }]}
          numberOfLines={2}
          ellipsizeMode="tail"
        >
          {t('search.subtitle')}
        </Text>
      </View>

      <View style={[styles.searchWrap, { backgroundColor: colors.secondary }]}>
        <Feather name="search" size={17} color={colors.mutedForeground} />
        <TextInput
          style={[styles.input, { color: colors.foreground }]}
          placeholder={t('search.placeholder')}
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

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterRow}
        style={styles.filterScroll}
      >
        {(Object.keys({
          all: 1,
          receipt: 1,
          shopping: 1,
          travel: 1,
          conversation: 1,
          has_price: 1,
          has_promise: 1,
          has_calendar: 1,
          recent_30d: 1,
        }) as SearchFilter[]).map((key) => (
          <Pressable
            key={key}
            onPress={() => setFilter(key)}
            style={[
              styles.filterChip,
              {
                backgroundColor: filter === key ? colors.primary + '28' : colors.secondary,
                borderColor: filter === key ? colors.primary + '55' : 'transparent',
              },
            ]}
          >
            <Text
              style={{
                color: filter === key ? colors.primary : colors.mutedForeground,
                fontFamily: 'DMSans_600SemiBold',
                fontSize: 12,
              }}
            >
              {t(`searchFilter.${key}` as 'searchFilter.all')}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      {query.length > 0 && !searching && results.length > 0 ? (
        <FlatList
          style={styles.listFlex}
          data={results}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <ResultRow item={item} query={query} />}
          contentContainerStyle={[styles.list, { paddingBottom: bottomPad }]}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <Text style={[styles.count, { color: colors.mutedForeground }]}>
              {results.length === 1
                ? t('search.result', { count: results.length })
                : t('search.results', { count: results.length })}
            </Text>
          }
        />
      ) : (
        <ScrollView
          style={styles.listFlex}
          contentContainerStyle={[styles.scrollBody, { paddingBottom: bottomPad }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {query.length === 0 ? (
            totalIndexed === 0 ? (
              <View style={styles.emptyLibrary}>
                <View style={[styles.emptyIcon, { backgroundColor: colors.secondary }]}>
                  <Feather name="smartphone" size={30} color={colors.primary} />
                </View>
                <Text style={[styles.noResultsTitle, { color: colors.foreground }]}>
                  {t('search.indexFirst')}
                </Text>
                <Text style={[styles.noResultsSub, { color: colors.mutedForeground }]}>
                  {t('search.indexFirstSub')}
                </Text>
                <Pressable
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    void scanDeviceScreenshots();
                  }}
                  disabled={isScanning}
                  style={({ pressed }) => [{ opacity: pressed || isScanning ? 0.85 : 1, width: '100%' }]}
                >
                  <LinearGradient
                    colors={[colors.primary, '#9B8FFF']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.scanBtn}
                  >
                    <Feather name={isScanning ? 'loader' : 'zap'} size={16} color="#fff" />
                    <Text style={styles.scanBtnText}>
                      {isScanning ? t('common.scanning') : t('search.scanNow')}
                    </Text>
                  </LinearGradient>
                </Pressable>
              </View>
            ) : (
              <View style={styles.recentSection}>
                <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>
                  {t('search.trySearching')}
                </Text>
                <View style={styles.recentRow}>
                  {quickSearches.map((s) => (
                    <Pressable
                      key={s}
                      onPress={() => setQuery(s)}
                      style={({ pressed }) => [
                        styles.recentPill,
                        { backgroundColor: colors.secondary, opacity: pressed ? 0.7 : 1 },
                      ]}
                    >
                      <Feather name="search" size={11} color={colors.mutedForeground} />
                      <Text style={[styles.recentText, { color: colors.foreground }]} numberOfLines={1}>
                        {s}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            )
          ) : searching ? (
            <View style={styles.noResults}>
              <Text style={[styles.noResultsSub, { color: colors.mutedForeground }]}>
                {t('search.searching')}
              </Text>
            </View>
          ) : (
            <View style={styles.noResults}>
              <View style={[styles.emptyIcon, { backgroundColor: colors.secondary }]}>
                <Feather name="search" size={28} color={colors.mutedForeground} />
              </View>
              <Text style={[styles.noResultsTitle, { color: colors.foreground }]}>{t('search.noMatches')}</Text>
              <Text style={[styles.noResultsSub, { color: colors.mutedForeground }]}>
                {t('search.noMatchesFor', { query })}
              </Text>
            </View>
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  listFlex: { flex: 1 },
  scrollBody: { flexGrow: 1 },
  header: { paddingHorizontal: 22, paddingBottom: 16, gap: 3 },
  title: {
    fontSize: 30,
    fontFamily: 'DMSans_700Bold',
    letterSpacing: -1,
    includeFontPadding: false,
  },
  subtitle: {
    fontSize: 13,
    fontFamily: 'DMSans_400Regular',
    lineHeight: 18,
    includeFontPadding: false,
  },
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
  filterScroll: { marginBottom: 12, maxHeight: 40 },
  filterRow: { paddingHorizontal: 20, gap: 8 },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 16,
    borderWidth: 1,
  },
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
  noResults: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, paddingHorizontal: 24 },
  emptyLibrary: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
    paddingHorizontal: 12,
    paddingTop: 24,
  },
  scanBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 15,
    borderRadius: 16,
    marginTop: 8,
  },
  scanBtnText: { color: '#fff', fontSize: 16, fontFamily: 'DMSans_700Bold' },
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
  resultText: { flex: 1, minWidth: 0, gap: 3 },
  resultCat: { fontSize: 9, fontFamily: 'DMSans_700Bold', letterSpacing: 1.2 },
  snippet: { fontSize: 13, fontFamily: 'DMSans_400Regular', lineHeight: 18 },
});
