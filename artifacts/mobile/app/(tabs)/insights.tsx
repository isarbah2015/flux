import React, { useMemo } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useColors } from '@/hooks/useColors';
import { useScreenInsets } from '@/hooks/useScreenInsets';
import { premiumBillingSummary } from '@/lib/pricing';
import { useLocale } from '@/context/LocaleContext';
import { usePremium } from '@/context/PremiumContext';
import { useScreenshots, type Insight } from '@/context/ScreenshotsContext';
import InsightCard from '@/components/InsightCard';
import { Feather } from '@expo/vector-icons';

const SECTION_KEYS = {
  price_drop: 'insights.section.price_drop',
  price_watch: 'insights.section.price_watch',
  promise: 'insights.section.promise',
  calendar: 'insights.section.calendar',
} as const;

const SECTION_ICONS: Record<string, { icon: string; accent: string }> = {
  price_drop: { icon: 'trending-down', accent: '#30D158' },
  price_watch: { icon: 'eye', accent: '#5AC8FA' },
  promise: { icon: 'user-check', accent: '#BF5AF2' },
  calendar: { icon: 'calendar', accent: '#FFD60A' },
};

function groupInsights(insights: Insight[]): { type: string; data: Insight[] }[] {
  const order = ['price_drop', 'promise', 'calendar', 'price_watch'];
  const map: Record<string, Insight[]> = {};
  for (const ins of insights) {
    if (!map[ins.type]) map[ins.type] = [];
    map[ins.type].push(ins);
  }
  return order.filter((t) => map[t]?.length > 0).map((t) => ({ type: t, data: map[t] }));
}

export default function InsightsScreen() {
  const colors = useColors();
  const { topPad, bottomPad } = useScreenInsets();
  const { t } = useLocale();
  const { isPremium, startCheckout } = usePremium();
  const { getInsights, totalIndexed } = useScreenshots();
  const insights = getInsights();
  const groups = groupInsights(insights);

  const stats = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const ins of insights) {
      counts[ins.type] = (counts[ins.type] ?? 0) + 1;
    }
    return counts;
  }, [insights]);

  const urgentCount = insights.filter((i) => i.urgent).length;

  type ListItem =
    | { kind: 'hero' }
    | { kind: 'premium' }
    | { kind: 'stats' }
    | { kind: 'header'; type: string }
    | { kind: 'insight'; insight: Insight; index: number };

  const listData: ListItem[] = [{ kind: 'hero' }];
  if (!isPremium) listData.push({ kind: 'premium' });
  if (insights.length > 0) listData.push({ kind: 'stats' });

  let insightIndex = 0;
  for (const g of groups) {
    listData.push({ kind: 'header', type: g.type });
    for (const ins of g.data) {
      listData.push({ kind: 'insight', insight: ins, index: insightIndex });
      insightIndex += 1;
    }
  }

  function renderPremiumBanner() {
    return (
      <Pressable
        onPress={() => { void startCheckout(); }}
        style={({ pressed }) => [{ opacity: pressed ? 0.9 : 1, marginHorizontal: 20, marginBottom: 14 }]}
      >
        <LinearGradient
          colors={['#7C72FF40', '#9B8FFF20', colors.card]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.premiumBanner, { borderColor: colors.primary + '40' }]}
        >
          <Feather name="lock" size={18} color={colors.primary} />
          <View style={{ flex: 1, gap: 4 }}>
            <Text style={[styles.premiumTitle, { color: colors.foreground }]}>
              Unlock price & promise insights
            </Text>
            <Text style={[styles.premiumSub, { color: colors.mutedForeground }]}>
              Premium adds price-drop alerts, promise reminders, and calendar sync — {premiumBillingSummary()}.
            </Text>
          </View>
          <Feather name="arrow-right" size={18} color={colors.primary} />
        </LinearGradient>
      </Pressable>
    );
  }

  function renderHero() {
    return (
      <LinearGradient
        colors={['#2A2450', '#16142A', colors.background]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.hero, { borderColor: colors.primary + '30' }]}
      >
        <View style={styles.heroTop}>
          <View style={[styles.heroIcon, { backgroundColor: colors.primary + '25' }]}>
            <Feather name="zap" size={22} color={colors.primary} />
          </View>
          <View style={styles.heroBadge}>
            <Text style={[styles.heroBadgeText, { color: colors.primary }]}>
              {urgentCount > 0 ? `${urgentCount} urgent` : 'Smart feed'}
            </Text>
          </View>
        </View>
        <Text style={[styles.heroTitle, { color: colors.foreground }]}>{t('insights.title')}</Text>
        <Text style={[styles.heroSub, { color: colors.mutedForeground }]}>
          {t('insights.subtitle', { count: totalIndexed })}
        </Text>
        <View style={styles.heroCountRow}>
          <Text style={[styles.heroCount, { color: colors.foreground }]}>{insights.length}</Text>
          <Text style={[styles.heroCountLabel, { color: colors.mutedForeground }]}>
            active insights
          </Text>
        </View>
      </LinearGradient>
    );
  }

  function renderStats() {
    const chips = Object.entries(SECTION_ICONS)
      .filter(([type]) => (stats[type] ?? 0) > 0)
      .map(([type, meta]) => ({
        type,
        ...meta,
        title: t(SECTION_KEYS[type as keyof typeof SECTION_KEYS] ?? 'insights.title'),
        count: stats[type] ?? 0,
      }));

    return (
      <View style={styles.statsRow}>
        {chips.map((chip) => (
          <View
            key={chip.type}
            style={[styles.statChip, { backgroundColor: chip.accent + '14', borderColor: chip.accent + '35' }]}
          >
            <Feather name={chip.icon as keyof typeof Feather.glyphMap} size={14} color={chip.accent} />
            <Text style={[styles.statVal, { color: chip.accent }]}>{chip.count}</Text>
            <Text style={[styles.statLbl, { color: colors.mutedForeground }]} numberOfLines={1}>
              {chip.title}
            </Text>
          </View>
        ))}
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {insights.length === 0 ? (
        <View style={{ flex: 1, paddingTop: topPad, paddingBottom: bottomPad }}>
          {renderHero()}
          <View style={styles.empty}>
            <View style={[styles.emptyOrb, { backgroundColor: colors.secondary }]}>
              <Feather name="activity" size={32} color={colors.primary} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>{t('insights.emptyTitle')}</Text>
            <Text style={[styles.emptySub, { color: colors.mutedForeground }]}>
              {totalIndexed === 0 ? t('insights.emptySubNoIndex') : t('insights.emptySub')}
            </Text>
          </View>
        </View>
      ) : (
        <FlatList
          style={styles.list}
          data={listData}
          keyExtractor={(item, idx) => {
            if (item.kind === 'hero') return 'hero';
            if (item.kind === 'premium') return 'premium';
            if (item.kind === 'stats') return 'stats';
            if (item.kind === 'header') return `h_${item.type}`;
            return item.insight.id;
          }}
          ListHeaderComponent={<View style={{ height: topPad }} />}
          renderItem={({ item }) => {
            if (item.kind === 'hero') return renderHero();
            if (item.kind === 'premium') return renderPremiumBanner();
            if (item.kind === 'stats') return renderStats();
            if (item.kind === 'header') {
              const icons = SECTION_ICONS[item.type] ?? { icon: 'zap', accent: colors.primary };
              const titleKey = SECTION_KEYS[item.type as keyof typeof SECTION_KEYS];
              const title = titleKey ? t(titleKey) : item.type;
              return (
                <View style={styles.sectionHeader}>
                  <LinearGradient
                    colors={[icons.accent + '30', 'transparent']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.sectionAccent}
                  />
                  <Feather name={icons.icon as keyof typeof Feather.glyphMap} size={14} color={icons.accent} />
                  <Text style={[styles.sectionTitle, { color: colors.foreground }]}>{title}</Text>
                  <View style={[styles.sectionCount, { backgroundColor: icons.accent + '20' }]}>
                    <Text style={[styles.sectionCountText, { color: icons.accent }]}>
                      {stats[item.type] ?? 0}
                    </Text>
                  </View>
                </View>
              );
            }
            return <InsightCard insight={item.insight} index={item.index} />;
          }}
          contentContainerStyle={{ paddingBottom: bottomPad }}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  list: { flex: 1 },
  hero: {
    marginHorizontal: 20,
    marginBottom: 16,
    borderRadius: 24,
    borderWidth: 1,
    padding: 20,
    gap: 8,
  },
  heroTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  heroIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    backgroundColor: 'rgba(124,114,255,0.15)',
  },
  heroBadgeText: { fontSize: 11, fontFamily: 'DMSans_700Bold', letterSpacing: 0.6 },
  heroTitle: { fontSize: 28, fontFamily: 'DMSans_700Bold', letterSpacing: -0.8, marginTop: 4 },
  heroSub: { fontSize: 13, fontFamily: 'DMSans_400Regular', lineHeight: 18 },
  heroCountRow: { flexDirection: 'row', alignItems: 'baseline', gap: 8, marginTop: 8 },
  heroCount: { fontSize: 36, fontFamily: 'DMSans_700Bold', letterSpacing: -1 },
  heroCountLabel: { fontSize: 13, fontFamily: 'DMSans_500Medium' },
  statsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingHorizontal: 20,
    marginBottom: 8,
  },
  statChip: {
    flexBasis: '47%',
    flexGrow: 1,
    borderRadius: 16,
    borderWidth: 1,
    padding: 12,
    gap: 4,
  },
  statVal: { fontSize: 20, fontFamily: 'DMSans_700Bold' },
  statLbl: { fontSize: 11, fontFamily: 'DMSans_500Medium' },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 22,
    paddingTop: 22,
    paddingBottom: 12,
    overflow: 'hidden',
  },
  sectionAccent: {
    position: 'absolute',
    left: 0,
    top: 18,
    bottom: 8,
    width: 4,
    borderRadius: 2,
  },
  sectionTitle: { fontSize: 15, fontFamily: 'DMSans_700Bold', flex: 1 },
  sectionCount: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  sectionCountText: { fontSize: 12, fontFamily: 'DMSans_700Bold' },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
    paddingHorizontal: 40,
  },
  emptyOrb: {
    width: 88,
    height: 88,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: { fontSize: 20, fontFamily: 'DMSans_700Bold' },
  emptySub: {
    fontSize: 15,
    fontFamily: 'DMSans_400Regular',
    textAlign: 'center',
    lineHeight: 22,
  },
  premiumBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
  },
  premiumTitle: { fontSize: 15, fontFamily: 'DMSans_700Bold' },
  premiumSub: { fontSize: 12, fontFamily: 'DMSans_400Regular', lineHeight: 17 },
});
