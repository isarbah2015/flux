import React, { useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useColors } from '@/hooks/useColors';
import { useScreenInsets } from '@/hooks/useScreenInsets';
import { useScreenshots } from '@/context/ScreenshotsContext';
import { useLocale } from '@/context/LocaleContext';
import { usePremiumGate } from '@/hooks/usePremiumGate';
import { addToCalendar } from '@/lib/actions';
import {
  buildMonthGrid,
  collectCalendarEvents,
  daysUntil,
  formatMonthYear,
  groupEventsByDate,
  parseEventDate,
  sameCalendarDay,
  toDateKey,
  weekdayLabels,
  type CalendarDayEvent,
} from '@/lib/calendar-events';

function EventCard({
  event,
  onPress,
  onSync,
}: {
  event: CalendarDayEvent;
  onPress: () => void;
  onSync: () => void;
}) {
  const colors = useColors();
  const { t } = useLocale();
  const until = daysUntil(event.date);
  const urgency =
    until < 0
      ? t('calendar.past')
      : until === 0
        ? t('calendar.today')
        : until === 1
          ? t('calendar.tomorrow')
          : t('calendar.days', { count: until });

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [{ opacity: pressed ? 0.9 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] }]}
    >
      <LinearGradient
        colors={[`${event.colorHex}28`, '#13131F', '#0C0C14']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.eventCard, { borderColor: `${event.colorHex}40` }]}
      >
        <View style={styles.eventTop}>
          <View style={[styles.eventIcon, { backgroundColor: `${event.colorHex}30` }]}>
            <Feather name="calendar" size={16} color={event.colorHex} />
          </View>
          <View style={[styles.urgencyPill, { backgroundColor: `${event.colorHex}22` }]}>
            <Text style={[styles.urgencyText, { color: event.colorHex }]}>{urgency}</Text>
          </View>
        </View>
        <Text style={[styles.eventTitle, { color: colors.foreground }]} numberOfLines={2}>
          {event.title}
        </Text>
        <Text style={[styles.eventMeta, { color: colors.mutedForeground }]} numberOfLines={2}>
          {[event.time, event.location].filter(Boolean).join(' · ') || event.date}
        </Text>
        <View style={styles.eventActions}>
          <Pressable
            onPress={onSync}
            style={[styles.syncBtn, { borderColor: `${event.colorHex}50` }]}
          >
            <Feather name="plus-circle" size={14} color={event.colorHex} />
            <Text style={[styles.syncLabel, { color: event.colorHex }]}>{t('calendar.sync')}</Text>
          </Pressable>
          <Feather name="arrow-up-right" size={16} color={colors.mutedForeground} />
        </View>
      </LinearGradient>
    </Pressable>
  );
}

export default function CalendarScreen() {
  const colors = useColors();
  const { topPad, bottomPad } = useScreenInsets();
  const { screenshots } = useScreenshots();
  const { t } = useLocale();
  const { requirePremium } = usePremiumGate();
  const today = useMemo(() => new Date(), []);
  const [cursor, setCursor] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));
  const [selected, setSelected] = useState(() => new Date());

  const events = useMemo(() => collectCalendarEvents(screenshots), [screenshots]);
  const byDate = useMemo(() => groupEventsByDate(events), [events]);
  const monthCells = useMemo(
    () => buildMonthGrid(cursor.getFullYear(), cursor.getMonth()),
    [cursor],
  );

  const upcoming = useMemo(
    () => events.filter((e) => daysUntil(e.date) >= 0).slice(0, 8),
    [events],
  );

  const selectedKey = toDateKey(selected);
  const selectedEvents = byDate.get(selectedKey) ?? [];

  function shiftMonth(delta: number) {
    Haptics.selectionAsync();
    setCursor((prev) => new Date(prev.getFullYear(), prev.getMonth() + delta, 1));
  }

  function openEvent(event: CalendarDayEvent) {
    Haptics.selectionAsync();
    router.push(`/screenshot/${event.screenshotId}`);
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingTop: topPad, paddingBottom: bottomPad }}
      >
        <LinearGradient
          colors={['#1A2548', '#12182C', colors.background]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.hero, { borderColor: '#5AC8FA35' }]}
        >
          <View style={styles.heroRow}>
            <View style={[styles.heroIcon, { backgroundColor: '#5AC8FA25' }]}>
              <Feather name="calendar" size={22} color="#5AC8FA" />
            </View>
            <Text style={[styles.heroBadge, { color: '#5AC8FA' }]}>
              {events.length} detected
            </Text>
          </View>
          <Text style={[styles.heroTitle, { color: colors.foreground }]}>{t('calendar.title')}</Text>
          <Text style={[styles.heroSub, { color: colors.mutedForeground }]}>
            {t('calendar.subtitle')}
          </Text>
        </LinearGradient>

        {upcoming.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Coming up</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.upcomingRow}>
              {upcoming.map((ev) => (
                <Pressable key={ev.screenshotId} onPress={() => openEvent(ev)}>
                  <BlurView intensity={24} tint="dark" style={[styles.upcomingCard, { borderColor: `${ev.colorHex}40` }]}>
                    <Text style={[styles.upcomingDay, { color: ev.colorHex }]}>
                      {daysUntil(ev.date) === 0 ? 'Today' : `${daysUntil(ev.date)}d`}
                    </Text>
                    <Text style={[styles.upcomingTitle, { color: colors.foreground }]} numberOfLines={2}>
                      {ev.title}
                    </Text>
                    <Text style={[styles.upcomingMeta, { color: colors.mutedForeground }]} numberOfLines={1}>
                      {ev.time ?? ev.date}
                    </Text>
                  </BlurView>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        )}

        <View style={[styles.monthCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.monthHeader}>
            <Pressable onPress={() => shiftMonth(-1)} hitSlop={12} style={styles.monthNav}>
              <Feather name="chevron-left" size={22} color={colors.foreground} />
            </Pressable>
            <Text style={[styles.monthLabel, { color: colors.foreground }]}>
              {formatMonthYear(cursor.getFullYear(), cursor.getMonth())}
            </Text>
            <Pressable onPress={() => shiftMonth(1)} hitSlop={12} style={styles.monthNav}>
              <Feather name="chevron-right" size={22} color={colors.foreground} />
            </Pressable>
          </View>

          <View style={styles.weekRow}>
            {weekdayLabels().map((d) => (
              <Text key={d} style={[styles.weekday, { color: colors.mutedForeground }]}>
                {d}
              </Text>
            ))}
          </View>

          <View style={styles.grid}>
            {monthCells.map((cell, idx) => {
              if (!cell) {
                return <View key={`pad-${idx}`} style={styles.dayCell} />;
              }
              const key = toDateKey(cell);
              const count = byDate.get(key)?.length ?? 0;
              const isToday = sameCalendarDay(cell, today);
              const isSelected = sameCalendarDay(cell, selected);
              const inMonth = cell.getMonth() === cursor.getMonth();

              return (
                <Pressable
                  key={key}
                  onPress={() => {
                    Haptics.selectionAsync();
                    setSelected(cell);
                  }}
                  style={styles.dayCell}
                >
                  <View
                    style={[
                      styles.dayInner,
                      isSelected && { backgroundColor: colors.primary },
                      isToday && !isSelected && { borderColor: '#5AC8FA', borderWidth: 1.5 },
                      !inMonth && { opacity: 0.35 },
                    ]}
                  >
                    <Text
                      style={[
                        styles.dayNum,
                        { color: isSelected ? '#fff' : colors.foreground },
                      ]}
                    >
                      {cell.getDate()}
                    </Text>
                    {count > 0 && (
                      <View style={styles.dotRow}>
                        {Array.from({ length: Math.min(count, 3) }).map((_, i) => (
                          <View
                            key={`${key}-dot-${i}`}
                            style={[
                              styles.dot,
                              { backgroundColor: isSelected ? '#fff' : '#5AC8FA' },
                            ]}
                          />
                        ))}
                      </View>
                    )}
                  </View>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
            {sameCalendarDay(selected, today)
              ? 'Today'
              : selected.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}
          </Text>
          {selectedEvents.length === 0 ? (
            <View style={[styles.emptyDay, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Feather name="sun" size={28} color={colors.mutedForeground} />
              <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
                No events on this day. Flux finds dates in travel and work screenshots.
              </Text>
            </View>
          ) : (
            selectedEvents.map((ev) => (
              <EventCard
                key={ev.screenshotId}
                event={ev}
                onPress={() => openEvent(ev)}
                onSync={() => {
                  requirePremium('calendar_sync', () => {
                    Haptics.selectionAsync();
                    void addToCalendar(ev.screenshot);
                  });
                }}
              />
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  hero: {
    marginHorizontal: 20,
    marginBottom: 18,
    borderRadius: 24,
    borderWidth: 1,
    padding: 20,
    gap: 6,
  },
  heroRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  heroIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroBadge: { fontSize: 12, fontFamily: 'DMSans_700Bold', letterSpacing: 0.5 },
  heroTitle: { fontSize: 30, fontFamily: 'DMSans_700Bold', letterSpacing: -0.8 },
  heroSub: { fontSize: 13, lineHeight: 19, fontFamily: 'DMSans_400Regular' },
  section: { paddingHorizontal: 20, marginBottom: 20, gap: 12 },
  sectionTitle: { fontSize: 17, fontFamily: 'DMSans_700Bold' },
  upcomingRow: { gap: 10, paddingRight: 8 },
  upcomingCard: {
    width: 148,
    padding: 14,
    borderRadius: 18,
    borderWidth: 1,
    overflow: 'hidden',
    gap: 6,
  },
  upcomingDay: { fontSize: 11, fontFamily: 'DMSans_700Bold', letterSpacing: 0.6 },
  upcomingTitle: { fontSize: 14, fontFamily: 'DMSans_600SemiBold', lineHeight: 18 },
  upcomingMeta: { fontSize: 12, fontFamily: 'DMSans_400Regular' },
  monthCard: {
    marginHorizontal: 20,
    marginBottom: 22,
    borderRadius: 22,
    borderWidth: 1,
    padding: 16,
    gap: 10,
  },
  monthHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  monthNav: { width: 36, alignItems: 'center' },
  monthLabel: { fontSize: 17, fontFamily: 'DMSans_700Bold' },
  weekRow: { flexDirection: 'row' },
  weekday: {
    flex: 1,
    textAlign: 'center',
    fontSize: 11,
    fontFamily: 'DMSans_600SemiBold',
    letterSpacing: 0.4,
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  dayCell: { width: `${100 / 7}%`, aspectRatio: 1, padding: 2 },
  dayInner: {
    flex: 1,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  dayNum: { fontSize: 14, fontFamily: 'DMSans_600SemiBold' },
  dotRow: { flexDirection: 'row', gap: 3 },
  dot: { width: 4, height: 4, borderRadius: 2 },
  eventCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    marginBottom: 10,
    gap: 8,
  },
  eventTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  eventIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  urgencyPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  urgencyText: { fontSize: 11, fontFamily: 'DMSans_700Bold' },
  eventTitle: { fontSize: 16, fontFamily: 'DMSans_700Bold', lineHeight: 22 },
  eventMeta: { fontSize: 13, fontFamily: 'DMSans_400Regular', lineHeight: 18 },
  eventActions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 },
  syncBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  syncLabel: { fontSize: 12, fontFamily: 'DMSans_600SemiBold' },
  emptyDay: {
    alignItems: 'center',
    gap: 10,
    padding: 28,
    borderRadius: 20,
    borderWidth: 1,
  },
  emptyText: { fontSize: 14, textAlign: 'center', lineHeight: 20, fontFamily: 'DMSans_400Regular' },
});
