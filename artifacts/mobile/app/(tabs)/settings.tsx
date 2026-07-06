import React from 'react';
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { useScreenshots } from '@/context/ScreenshotsContext';
import { Feather } from '@expo/vector-icons';

interface RowProps {
  icon: string;
  iconColor?: string;
  label: string;
  value?: string;
  onPress?: () => void;
  destructive?: boolean;
  last?: boolean;
}

function Row({ icon, iconColor, label, value, onPress, destructive, last }: RowProps) {
  const colors = useColors();
  const ic = iconColor ?? colors.mutedForeground;
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => [
        styles.row,
        !last && { borderBottomWidth: 1, borderBottomColor: colors.border + '55' },
        { opacity: pressed ? 0.7 : 1 },
      ]}
    >
      <View style={[styles.rowIcon, { backgroundColor: ic + '20' }]}>
        <Feather name={icon as any} size={15} color={ic} />
      </View>
      <Text style={[styles.rowLabel, { color: destructive ? colors.destructive : colors.foreground }]}>
        {label}
      </Text>
      <View style={styles.rowRight}>
        {value && <Text style={[styles.rowValue, { color: colors.mutedForeground }]}>{value}</Text>}
        {onPress && <Feather name="chevron-right" size={15} color={colors.mutedForeground} />}
      </View>
    </Pressable>
  );
}

function SectionLabel({ title }: { title: string }) {
  const colors = useColors();
  return <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>{title}</Text>;
}

function Group({ children }: { children: React.ReactNode }) {
  const colors = useColors();
  return (
    <View style={[styles.group, { backgroundColor: colors.card }]}>
      {children}
    </View>
  );
}

export default function SettingsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { totalIndexed } = useScreenshots();

  const topPad = Platform.OS === 'web' ? 67 : insets.top;
  const botPad = Platform.OS === 'web' ? 132 : Math.max(insets.bottom, 8) + 98;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={{ paddingTop: topPad + 16, paddingBottom: botPad }}
        showsVerticalScrollIndicator={false}
      >
        {/* App header */}
        <View style={styles.appHeader}>
          <View style={[styles.appIcon, { backgroundColor: colors.primary + '20' }]}>
            <Feather name="zap" size={30} color={colors.primary} />
          </View>
          <Text style={[styles.appName, { color: colors.foreground }]}>Flux</Text>
          <Text style={[styles.appTagline, { color: colors.mutedForeground }]}>
            Your screenshots, alive.
          </Text>
        </View>

        {/* Stats row */}
        <View style={styles.statsRow}>
          {[
            { val: String(totalIndexed), lbl: 'Indexed',    color: colors.primary  },
            { val: '100%',              lbl: 'On-device',   color: '#30D158'       },
            { val: '0',                 lbl: 'Cloud calls', color: '#FF9F0A'       },
          ].map(({ val, lbl, color }) => (
            <View key={lbl} style={[styles.statCard, { backgroundColor: color + '14' }]}>
              <Text style={[styles.statVal, { color }]}>{val}</Text>
              <Text style={[styles.statLbl, { color: colors.mutedForeground }]}>{lbl}</Text>
            </View>
          ))}
        </View>

        {/* Privacy */}
        <SectionLabel title="PRIVACY" />
        <Group>
          <Row icon="shield"    iconColor="#30D158" label="On-device processing" value="Always on" />
          <Row icon="cloud-off" iconColor="#30D158" label="Cloud sync"           value="Disabled"  />
          <Row icon="eye-off"   iconColor="#30D158" label="Analytics"            value="Disabled"  last />
        </Group>

        {/* Storage */}
        <SectionLabel title="STORAGE" />
        <Group>
          <Row icon="database"   iconColor={colors.primary} label="Indexed screenshots" value={String(totalIndexed)} />
          <Row icon="hard-drive" iconColor={colors.primary} label="Local storage"       value="4.2 MB" last />
        </Group>

        {/* Premium */}
        <SectionLabel title="PREMIUM" />
        <View style={[styles.premiumCard, { backgroundColor: colors.primary + '12' }]}>
          <View style={styles.premiumTop}>
            <View style={[styles.premiumIcon, { backgroundColor: colors.primary + '22' }]}>
              <Feather name="star" size={18} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.premiumTitle, { color: colors.foreground }]}>Flux Premium</Text>
              <Text style={[styles.premiumPrice, { color: colors.primary }]}>$9.99 / month</Text>
            </View>
          </View>
          <Text style={[styles.premiumDesc, { color: colors.mutedForeground }]}>
            Price tracking, promise reminders, calendar sync, and unlimited AI classification.
          </Text>
          <View style={styles.featureGrid}>
            {['Price drops', 'Promise tracker', 'Calendar sync', 'Unlimited OCR'].map((f) => (
              <View key={f} style={styles.featureRow}>
                <View style={[styles.checkDot, { backgroundColor: colors.primary }]} />
                <Text style={[styles.featureText, { color: colors.foreground }]}>{f}</Text>
              </View>
            ))}
          </View>
          <Pressable
            style={({ pressed }) => [
              styles.premiumBtn,
              { backgroundColor: colors.primary, opacity: pressed ? 0.85 : 1 },
            ]}
          >
            <Text style={styles.premiumBtnText}>Start Free Trial</Text>
            <Feather name="arrow-right" size={16} color="#fff" />
          </Pressable>
        </View>

        {/* About */}
        <SectionLabel title="ABOUT" />
        <Group>
          <Row icon="info"         label="Version"         value="1.0.0" />
          <Row icon="file-text"    label="Privacy Policy"  onPress={() => {}} />
          <Row icon="message-square" label="Send Feedback" onPress={() => {}} last />
        </Group>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  appHeader: { alignItems: 'center', paddingVertical: 24, gap: 8 },
  appIcon: {
    width: 76,
    height: 76,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  appName: { fontSize: 26, fontFamily: 'Inter_700Bold', letterSpacing: -0.5 },
  appTagline: { fontSize: 14, fontFamily: 'Inter_400Regular' },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
    marginHorizontal: 20,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 14,
    borderRadius: 16,
    gap: 3,
  },
  statVal: { fontSize: 20, fontFamily: 'Inter_700Bold' },
  statLbl: { fontSize: 11, fontFamily: 'Inter_400Regular' },
  sectionLabel: {
    fontSize: 11,
    fontFamily: 'Inter_600SemiBold',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginHorizontal: 22,
    marginBottom: 8,
    marginTop: 4,
  },
  group: {
    marginHorizontal: 20,
    borderRadius: 18,
    marginBottom: 22,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  rowIcon: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  rowLabel: { flex: 1, fontSize: 15, fontFamily: 'Inter_400Regular' },
  rowRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  rowValue: { fontSize: 14, fontFamily: 'Inter_400Regular' },
  premiumCard: {
    marginHorizontal: 20,
    borderRadius: 20,
    padding: 18,
    gap: 12,
    marginBottom: 22,
  },
  premiumTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  premiumIcon: { width: 46, height: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  premiumTitle: { fontSize: 16, fontFamily: 'Inter_700Bold' },
  premiumPrice: { fontSize: 13, fontFamily: 'Inter_500Medium', marginTop: 1 },
  premiumDesc: { fontSize: 13, fontFamily: 'Inter_400Regular', lineHeight: 19 },
  featureGrid: { gap: 8 },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  checkDot: { width: 6, height: 6, borderRadius: 3 },
  featureText: { fontSize: 14, fontFamily: 'Inter_500Medium' },
  premiumBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 15,
    borderRadius: 14,
    marginTop: 2,
  },
  premiumBtnText: { color: '#fff', fontSize: 16, fontFamily: 'Inter_700Bold' },
});
