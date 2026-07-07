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
import { useAuth } from '@/context/AuthContext';
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
  const { authEnabled, user, signOut } = useAuth();

  const topPad = Platform.OS === 'web' ? 67 : insets.top;
  const botPad = Platform.OS === 'web' ? 148 : Math.max(insets.bottom, 8) + 98;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={{ paddingTop: topPad + 16, paddingBottom: botPad }}
        showsVerticalScrollIndicator={false}
      >

        {/* ── Profile card ── */}
        <SectionLabel title="PROFILE" />
        <Pressable
          style={({ pressed }) => [
            styles.profileCard,
            { backgroundColor: colors.card, opacity: pressed ? 0.85 : 1 },
          ]}
        >
          {/* Avatar */}
          <View style={[styles.avatar, { backgroundColor: colors.primary + '28' }]}>
            <Feather name="user" size={26} color={colors.primary} />
          </View>

          {/* Info */}
          <View style={styles.profileInfo}>
            <Text style={[styles.profileName, { color: colors.foreground }]} numberOfLines={1}>
              {user?.email ?? 'Flux User'}
            </Text>
            <View style={[styles.planBadge, { backgroundColor: colors.secondary }]}>
              <View style={[styles.planDot, { backgroundColor: '#30D158' }]} />
              <Text style={[styles.planText, { color: colors.mutedForeground }]}>Free Plan</Text>
            </View>
          </View>

          {/* Edit arrow */}
          <View style={[styles.editBtn, { backgroundColor: colors.secondary }]}>
            <Feather name="edit-2" size={14} color={colors.mutedForeground} />
          </View>
        </Pressable>

        {/* ── App branding ── */}
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

        {/* Account */}
        {authEnabled && (
          <>
            <SectionLabel title="ACCOUNT" />
            <Group>
              <Row
                icon="log-out"
                iconColor={colors.destructive}
                label="Sign out"
                onPress={() => { void signOut(); }}
                destructive
                last
              />
            </Group>
          </>
        )}

        {/* About */}
        <SectionLabel title="ABOUT" />
        <Group>
          <Row icon="info"           label="Version"         value="1.0.0" />
          <Row icon="file-text"      label="Privacy Policy"  onPress={() => {}} />
          <Row icon="message-square" label="Send Feedback"   onPress={() => {}} last />
        </Group>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  // Profile
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginHorizontal: 20,
    marginBottom: 22,
    padding: 16,
    borderRadius: 20,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  profileInfo: { flex: 1, gap: 6 },
  profileName: { fontSize: 17, fontFamily: 'DMSans_700Bold' },
  planBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  planDot: { width: 6, height: 6, borderRadius: 3 },
  planText: { fontSize: 12, fontFamily: 'DMSans_500Medium' },
  editBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },

  // App header
  appHeader: { alignItems: 'center', paddingVertical: 20, gap: 8 },
  appIcon: {
    width: 76,
    height: 76,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  appName: { fontSize: 26, fontFamily: 'DMSans_700Bold', letterSpacing: -0.5 },
  appTagline: { fontSize: 14, fontFamily: 'DMSans_400Regular' },

  // Stats
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
  statVal: { fontSize: 20, fontFamily: 'DMSans_700Bold' },
  statLbl: { fontSize: 11, fontFamily: 'DMSans_400Regular' },

  // Section
  sectionLabel: {
    fontSize: 11,
    fontFamily: 'DMSans_600SemiBold',
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
  rowLabel: { flex: 1, fontSize: 15, fontFamily: 'DMSans_400Regular' },
  rowRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  rowValue: { fontSize: 14, fontFamily: 'DMSans_400Regular' },

  // Premium
  premiumCard: {
    marginHorizontal: 20,
    borderRadius: 20,
    padding: 18,
    gap: 12,
    marginBottom: 22,
  },
  premiumTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  premiumIcon: { width: 46, height: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  premiumTitle: { fontSize: 16, fontFamily: 'DMSans_700Bold' },
  premiumPrice: { fontSize: 13, fontFamily: 'DMSans_500Medium', marginTop: 1 },
  premiumDesc: { fontSize: 13, fontFamily: 'DMSans_400Regular', lineHeight: 19 },
  featureGrid: { gap: 8 },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  checkDot: { width: 6, height: 6, borderRadius: 3 },
  featureText: { fontSize: 14, fontFamily: 'DMSans_500Medium' },
  premiumBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 15,
    borderRadius: 14,
    marginTop: 2,
  },
  premiumBtnText: { color: '#fff', fontSize: 16, fontFamily: 'DMSans_700Bold' },
});
