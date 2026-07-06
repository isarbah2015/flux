import React from 'react';
import { FlatList, Platform, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { useScreenshots, type Insight } from '@/context/ScreenshotsContext';
import InsightCard from '@/components/InsightCard';
import { Feather } from '@expo/vector-icons';

const SECTION_TITLES: Record<string, string> = {
  price_drop: '🔥 Price Drops',
  price_watch: '👁 Watching',
  promise: '🤝 Promises',
  calendar: '📅 Upcoming',
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
  const botPad = Platform.OS === 'web' ? 34 + 84 : insets.bottom + 60;

  type ListItem =
    | { kind: 'header'; title: string }
    | { kind: 'insight'; insight: Insight };

  const listData: ListItem[] = [];
  for (const g of groups) {
    listData.push({ kind: 'header', title: SECTION_TITLES[g.type] ?? g.type });
    for (const ins of g.data) {
      listData.push({ kind: 'insight', insight: ins });
    }
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: topPad + 12 }]}>
        <Text style={[styles.title, { color: colors.foreground }]}>Insights</Text>
        <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
          Smart alerts from {totalIndexed} screenshots
        </Text>
      </View>

      {insights.length === 0 ? (
        <View style={styles.empty}>
          <View style={[styles.emptyIcon, { backgroundColor: colors.secondary }]}>
            <Feather name="zap" size={32} color={colors.mutedForeground} />
          </View>
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
            No insights yet
          </Text>
          <Text style={[styles.emptySub, { color: colors.mutedForeground }]}>
            {totalIndexed === 0
              ? 'Grant photo access to start indexing your screenshots.'
              : 'Price drops, promises, and calendar events will appear here automatically.'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={listData}
          keyExtractor={(item, i) =>
            item.kind === 'header' ? `h_${item.title}` : item.insight.id
          }
          renderItem={({ item }) => {
            if (item.kind === 'header') {
              return (
                <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>
                  {item.title}
                </Text>
              );
            }
            return <InsightCard insight={item.insight} />;
          }}
          contentContainerStyle={[styles.list, { paddingBottom: botPad }]}
          showsVerticalScrollIndicator={false}
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
  list: {
    paddingTop: 4,
    paddingBottom: 20,
  },
  sectionTitle: {
    fontSize: 13,
    fontFamily: 'Inter_600SemiBold',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
    paddingHorizontal: 40,
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    fontSize: 20,
    fontFamily: 'Inter_700Bold',
  },
  emptySub: {
    fontSize: 15,
    fontFamily: 'Inter_400Regular',
    textAlign: 'center',
    lineHeight: 22,
  },
});
