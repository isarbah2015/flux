import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useColors } from '@/hooks/useColors';
import { useScreenInsets } from '@/hooks/useScreenInsets';
import { useScreenshots } from '@/context/ScreenshotsContext';
import { buildFluxDashboard, type FluxDashboard } from '@/lib/app-analytics';
import { redeemReferralCode } from '@/lib/referral';
import { sendInstantDigest } from '@/lib/weekly-digest';

function StatCard({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string;
  sub?: string;
  accent: string;
}) {
  const colors = useColors();
  return (
    <View style={[styles.statCard, { backgroundColor: accent + '14', borderColor: accent + '30' }]}>
      <Text style={[styles.statValue, { color: accent }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: colors.foreground }]}>{label}</Text>
      {sub ? <Text style={[styles.statSub, { color: colors.mutedForeground }]}>{sub}</Text> : null}
    </View>
  );
}

export default function StatsScreen() {
  const colors = useColors();
  const { topPad, bottomPad } = useScreenInsets({ tabBar: false });
  const { screenshots } = useScreenshots();
  const [dashboard, setDashboard] = useState<FluxDashboard | null>(null);
  const [referral, setReferral] = useState('');
  const [referralMsg, setReferralMsg] = useState<string | null>(null);

  useEffect(() => {
    void buildFluxDashboard(screenshots).then(setDashboard);
  }, [screenshots]);

  async function handleReferral() {
    const result = await redeemReferralCode(referral);
    setReferralMsg(result.message);
    if (result.ok) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }

  if (!dashboard) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  const { privacy, insightCounts, receiptSpend, duplicates, totalSavingsUsd, searchCount } = dashboard;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPad }]}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </Pressable>
        <Text style={[styles.title, { color: colors.foreground }]}>Flux Dashboard</Text>
        <View style={{ width: 22 }} />
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: bottomPad + 24, paddingHorizontal: 20 }}
        showsVerticalScrollIndicator={false}
      >
        <LinearGradient
          colors={['#2A2450', '#16142A', colors.background]}
          style={[styles.hero, { borderColor: colors.primary + '35' }]}
        >
          <Text style={[styles.heroTitle, { color: colors.foreground }]}>Clarity at a glance</Text>
          <Text style={[styles.heroSub, { color: colors.mutedForeground }]}>
            {privacy.totalIndexed} screenshots · {privacy.totalWords.toLocaleString()} words searchable · 100% on-device
          </Text>
        </LinearGradient>

        <View style={styles.grid}>
          <StatCard label="Indexed" value={String(privacy.totalIndexed)} accent={colors.primary} />
          <StatCard label="Searches" value={String(searchCount)} accent="#00D4FF" />
          <StatCard label="Saved" value={`$${totalSavingsUsd.toFixed(0)}`} accent="#30D158" sub="estimated" />
          <StatCard label="Insights" value={String(privacy.withInsights)} accent="#FF9F0A" />
        </View>

        <Text style={[styles.section, { color: colors.mutedForeground }]}>PRIVACY</Text>
        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <Row icon="shield" label="On device" value={`${privacy.onDeviceOnly} files`} />
          <Row icon="upload-cloud" label="Uploaded" value={`${privacy.uploadedCount} (none by default)`} />
          <Row icon="type" label="OCR text" value={`${privacy.withText} screenshots`} last />
        </View>

        <Text style={[styles.section, { color: colors.mutedForeground }]}>INSIGHTS</Text>
        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <Row icon="trending-down" label="Price drops" value={String(insightCounts.price_drop)} />
          <Row icon="eye" label="Watching" value={String(insightCounts.price_watch)} />
          <Row icon="user-check" label="Promises" value={String(insightCounts.promise)} />
          <Row icon="calendar" label="Events" value={String(insightCounts.calendar)} last />
        </View>

        {receiptSpend.length > 0 ? (
          <>
            <Text style={[styles.section, { color: colors.mutedForeground }]}>RECEIPT SPEND</Text>
            <View style={[styles.card, { backgroundColor: colors.card }]}>
              {receiptSpend.map((row, i) => (
                <Row
                  key={row.month}
                  icon="file-text"
                  label={row.label}
                  value={`$${row.totalUsd.toFixed(0)} · ${row.count}`}
                  last={i === receiptSpend.length - 1}
                />
              ))}
            </View>
          </>
        ) : null}

        {duplicates.length > 0 ? (
          <>
            <Text style={[styles.section, { color: colors.mutedForeground }]}>DUPLICATES</Text>
            <View style={[styles.card, { backgroundColor: colors.card }]}>
              <Text style={[styles.dupNote, { color: colors.mutedForeground }]}>
                {duplicates.length} group{duplicates.length === 1 ? '' : 's'} of similar screenshots detected
              </Text>
            </View>
          </>
        ) : null}

        <Text style={[styles.section, { color: colors.mutedForeground }]}>REFERRAL</Text>
        <View style={[styles.card, { backgroundColor: colors.card, gap: 10 }]}>
          <Text style={[styles.dupNote, { color: colors.mutedForeground }]}>
            Enter FLUXFRIEND (+7 days) or FLUXVIP (+14 days) once per device.
          </Text>
          <TextInput
            value={referral}
            onChangeText={setReferral}
            placeholder="Referral code"
            placeholderTextColor={colors.mutedForeground}
            autoCapitalize="characters"
            style={[styles.input, { color: colors.foreground, borderColor: colors.border }]}
          />
          {referralMsg ? (
            <Text style={{ color: colors.primary, fontFamily: 'DMSans_500Medium', fontSize: 13 }}>{referralMsg}</Text>
          ) : null}
          <Pressable
            onPress={() => { void handleReferral(); }}
            style={[styles.btn, { backgroundColor: colors.primary }]}
          >
            <Text style={styles.btnText}>Redeem code</Text>
          </Pressable>
        </View>

        <Pressable
          onPress={() => { void sendInstantDigest(dashboard); }}
          style={[styles.digestBtn, { borderColor: colors.border }]}
        >
          <Feather name="bell" size={16} color={colors.primary} />
          <Text style={[styles.digestText, { color: colors.foreground }]}>Send weekly digest now</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

function Row({
  icon,
  label,
  value,
  last,
}: {
  icon: keyof typeof Feather.glyphMap;
  label: string;
  value: string;
  last?: boolean;
}) {
  const colors = useColors();
  return (
    <View style={[styles.row, !last && { borderBottomWidth: 1, borderBottomColor: colors.border + '55' }]}>
      <Feather name={icon} size={15} color={colors.mutedForeground} />
      <Text style={[styles.rowLabel, { color: colors.foreground }]}>{label}</Text>
      <Text style={[styles.rowValue, { color: colors.mutedForeground }]} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  title: { fontSize: 18, fontFamily: 'DMSans_700Bold' },
  hero: { borderRadius: 20, padding: 20, marginBottom: 16, borderWidth: 1, gap: 6 },
  heroTitle: { fontSize: 22, fontFamily: 'DMSans_700Bold' },
  heroSub: { fontSize: 14, fontFamily: 'DMSans_400Regular', lineHeight: 20 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 8 },
  statCard: {
    width: '48%',
    flexGrow: 1,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    gap: 2,
  },
  statValue: { fontSize: 24, fontFamily: 'DMSans_700Bold' },
  statLabel: { fontSize: 13, fontFamily: 'DMSans_600SemiBold' },
  statSub: { fontSize: 11, fontFamily: 'DMSans_400Regular' },
  section: {
    fontSize: 11,
    fontFamily: 'DMSans_600SemiBold',
    letterSpacing: 1,
    marginTop: 16,
    marginBottom: 8,
    marginLeft: 2,
  },
  card: { borderRadius: 16, overflow: 'hidden', padding: 4 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  rowLabel: { flex: 1, fontSize: 15, fontFamily: 'DMSans_400Regular' },
  rowValue: { fontSize: 13, fontFamily: 'DMSans_500Medium', maxWidth: '46%', textAlign: 'right' },
  dupNote: { padding: 14, fontSize: 13, fontFamily: 'DMSans_400Regular', lineHeight: 19 },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontFamily: 'DMSans_400Regular',
    fontSize: 15,
  },
  btn: { borderRadius: 12, paddingVertical: 12, alignItems: 'center', marginHorizontal: 4, marginBottom: 4 },
  btnText: { color: '#fff', fontFamily: 'DMSans_700Bold', fontSize: 15 },
  digestBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 20,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  digestText: { fontSize: 15, fontFamily: 'DMSans_600SemiBold' },
});
