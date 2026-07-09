import React, { useMemo, useState } from 'react';
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useColors } from '@/hooks/useColors';
import { useScreenInsets } from '@/hooks/useScreenInsets';
import { useLocale } from '@/context/LocaleContext';
import type { LanguageOption } from '@/constants/languages';

export default function LanguageScreen() {
  const colors = useColors();
  const { topPad, bottomPad } = useScreenInsets({ tabBar: false });
  const { locale, languages, setLocale, t, hasFullTranslation } = useLocale();
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return languages;
    return languages.filter(
      (l) =>
        l.code.includes(q) ||
        l.name.toLowerCase().includes(q) ||
        l.nativeName.toLowerCase().includes(q),
    );
  }, [languages, query]);

  async function selectLanguage(code: string) {
    await setLocale(code);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    router.back();
  }

  function renderItem({ item }: { item: LanguageOption }) {
    const selected = item.code === locale;
    return (
      <Pressable
        onPress={() => { void selectLanguage(item.code); }}
        style={({ pressed }) => [
          styles.row,
          {
            backgroundColor: selected ? colors.primary + '18' : colors.card,
            borderColor: selected ? colors.primary + '40' : colors.border + '55',
            opacity: pressed ? 0.85 : 1,
          },
        ]}
      >
        <View style={styles.rowText}>
          <Text style={[styles.native, { color: colors.foreground }]}>{item.nativeName}</Text>
          <Text style={[styles.english, { color: colors.mutedForeground }]}>{item.name}</Text>
        </View>
        {selected ? <Feather name="check-circle" size={20} color={colors.primary} /> : null}
      </Pressable>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: topPad }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={styles.back}>
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </Pressable>
        <Text style={[styles.title, { color: colors.foreground }]}>{t('language.title')}</Text>
        <View style={styles.back} />
      </View>

      <View style={[styles.searchWrap, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Feather name="search" size={16} color={colors.mutedForeground} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder={t('language.search')}
          placeholderTextColor={colors.mutedForeground}
          style={[styles.searchInput, { color: colors.foreground }]}
          autoCorrect={false}
          clearButtonMode="while-editing"
        />
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.code}
        renderItem={renderItem}
        ListHeaderComponent={
          !hasFullTranslation ? (
            <Text style={[styles.notice, { color: colors.mutedForeground }]}>
              {t('language.partialNotice')}
            </Text>
          ) : null
        }
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: bottomPad, gap: 8 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      />
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
  back: { width: 36, alignItems: 'center' },
  title: { fontSize: 18, fontFamily: 'DMSans_700Bold' },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginHorizontal: 20,
    marginBottom: 14,
    paddingHorizontal: 14,
    height: 46,
    borderRadius: 14,
    borderWidth: 1,
  },
  searchInput: { flex: 1, fontSize: 15, fontFamily: 'DMSans_400Regular' },
  notice: {
    fontSize: 13,
    fontFamily: 'DMSans_400Regular',
    lineHeight: 19,
    marginBottom: 10,
    paddingHorizontal: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: 1,
  },
  rowText: { flex: 1, gap: 2 },
  native: { fontSize: 16, fontFamily: 'DMSans_600SemiBold' },
  english: { fontSize: 13, fontFamily: 'DMSans_400Regular' },
});
