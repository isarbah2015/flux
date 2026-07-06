import React from 'react';
import { FlatList, Platform, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { useScreenshots, type Insight } from '@/context/ScreenshotsContext';
import InsightCard from '@/components/InsightCard';
import { Feather } from '@expo/vector-icons';

const SECTION_TITLES: Record<string, string> = {
  price_drop: 'Price Drops',
  price_watch: 'Watching',
  promise: 'Promises',
  calendar: 'Upcoming',
};

const SECTION_ICONS: Record<string, string> = {
  price_drop: 'trending-down',
  price_watch: 'eye',
  promise: 'user-check',
  calendar: 'calendar',
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
  const insets = useSafeAreaInsets();
  const { getInsights, totalIndexed } = useScreenshots();
  const insights = getInsights();
  const groups = groupInsights(insights);

  const topPad = Platform.OS === 'web' ? 67 : insets.top;
  const botPad = Platform.OS === 'web' ? 132 : Math.max(insets.bottom, 8) + 98;

  type ListItem =
    | { kind: 'header'; type: string }
    | { kind: 'insight'; insight: Insight };

  const listData: ListItem[] = [];
  for (const g of groups) {
    listData.push({ kind: 'header', type: g.type });
    for (const ins of g.data) listData.push({ kind: 'insight', insight: ins });
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 16 }]}>
        <Text style={[styles.title, { color: colors.foreground }]}>Insights</Text>
        <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
          Smart alerts from {totalIndexed} screenshots
        </Text>
      </View>

      {insights.length === 0 ? (
        <View style={styles.empty}>
          <View style={[styles.emptyIconWrap, { backgroundColor: colors.secondary }]}>
            <Feather name="zap" size={30} color={colors.mutedForeground} />
          </View>
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No insights yet</Text>
          <Text style={[styles.emptySub, { color: colors.mutedForeground }]}>
            {totalIndexed === 0
              ? 'Grant photo access to start indexing.'
              : 'Price drops, promises, and events appear here automatically.'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={listData}
          keyExtractor={(item, i) =>
            item.kind === 'header' ? `h_${item.type}` : item.insight.id
          }
          renderItem={({ item }) => {
            if (item.kind === 'header') {
              return (
                <View style={styles.sectionHeader}>
                  <Feather
                    name={SECTION_ICONS[item.type] as any}
                    size={13}
                    color={colors.mutedForeground}
                  />
                  <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>
                    {SECTION_TITLES[item.type] ?? item.type}
                  </Text>
                </View>
              );
            }
            return <InsightCard insight={item.insight} />;
          }}
          contentContainerStyle={{ paddingBottom: botPad, paddingTop: 4 }}
          showsVerticalScrollIndicator={false}
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
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 22,
    paddingTop: 20,
    paddingBottom: 10,
  },
  sectionTitle: {
    fontSize: 12,
    fontFamily: 'DMSans_600SemiBold',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
    paddingHorizontal: 40,
  },
  emptyIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 26,
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
});
