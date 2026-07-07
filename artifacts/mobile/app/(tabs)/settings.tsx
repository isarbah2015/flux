import React from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { useScreenshots } from '@/context/ScreenshotsContext';
import { useAuth } from '@/context/AuthContext';
import { usePremium } from '@/context/PremiumContext';
import { useProfile } from '@/context/ProfileContext';
import {
  openPrivacyPolicy,
  sendFeedback,
} from '@/lib/actions';
import FluxLogo from '@/components/FluxLogo';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';

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
        { opacity: pressed && onPress ? 0.7 : 1 },
      ]}
    >
      <View style={[styles.rowIcon, { backgroundColor: ic + '20' }]}>
        <Feather name={icon as keyof typeof Feather.glyphMap} size={15} color={ic} />
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
  return <View style={[styles.group, { backgroundColor: colors.card }]}>{children}</View>;
}

export default function SettingsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { totalIndexed } = useScreenshots();
  const { authEnabled, user, signOut } = useAuth();
  const { isPremium, isCheckingOut, paystackConfigured, startCheckout, refresh } = usePremium();
  const { profile } = useProfile();

  const displayName = profile?.displayName || user?.displayName || user?.email?.split('@')[0] || 'Flux User';
  const handle = profile?.profileId ? `@${profile.profileId}` : 'Set your profile ID';

  const topPad = Platform.OS === 'web' ? 67 : insets.top;
  const botPad = Platform.OS === 'web' ? 148 : Math.max(insets.bottom, 8) + 98;

  async function handlePremium() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (isPremium) {
      await refresh();
      return;
    }
    await startCheckout();
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={{ paddingTop: topPad + 16, paddingBottom: botPad }}
        showsVerticalScrollIndicator={false}
      >
        <SectionLabel title="PROFILE" />
        <Pressable
          onPress={() => { Haptics.selectionAsync(); router.push('/profile'); }}
          style={({ pressed }) => [
            styles.profileCard,
            { backgroundColor: colors.card, opacity: pressed ? 0.85 : 1 },
          ]}
        >
          <View style={[styles.avatar, { backgroundColor: colors.primary + '28' }]}>
            <Text style={[styles.avatarInitials, { color: colors.primary }]}>
              {displayName.slice(0, 2).toUpperCase()}
            </Text>
          </View>
          <View style={styles.profileInfo}>
            <Text style={[styles.profileName, { color: colors.foreground }]} numberOfLines={1}>
              {displayName}
            </Text>
            <Text style={[styles.profileHandle, { color: colors.mutedForeground }]} numberOfLines={1}>
              {handle}
            </Text>
            <View style={[styles.planBadge, { backgroundColor: isPremium ? colors.primary + '22' : colors.secondary }]}>
              <View style={[styles.planDot, { backgroundColor: isPremium ? colors.primary : '#30D158' }]} />
              <Text style={[styles.planText, { color: isPremium ? colors.primary : colors.mutedForeground }]}>
                {isPremium ? 'Premium' : 'Free Plan'}
              </Text>
            </View>
          </View>
          <View style={[styles.editBtn, { backgroundColor: colors.secondary }]}>
            <Feather name="edit-2" size={14} color={colors.mutedForeground} />
          </View>
        </Pressable>

        <View style={styles.appHeader}>
          <FluxLogo size={76} />
          <Text style={[styles.appName, { color: colors.foreground }]}>Flux</Text>
          <Text style={[styles.appTagline, { color: colors.mutedForeground }]}>
            Your screenshots, alive.
          </Text>
        </View>

        <View style={styles.statsRow}>
          {[
            { val: String(totalIndexed), lbl: 'Indexed', color: colors.primary },
            { val: isPremium ? 'Pro' : 'Free', lbl: 'Plan', color: isPremium ? '#FFD60A' : '#30D158' },
            { val: 'Secure', lbl: 'Firebase', color: '#00D4FF' },
          ].map(({ val, lbl, color }) => (
            <View key={lbl} style={[styles.statCard, { backgroundColor: color + '14' }]}>
              <Text style={[styles.statVal, { color }]}>{val}</Text>
              <Text style={[styles.statLbl, { color: colors.mutedForeground }]}>{lbl}</Text>
            </View>
          ))}
        </View>

        <SectionLabel title="PRIVACY" />
        <Group>
          <Row icon="shield" iconColor="#30D158" label="Encrypted in transit" value="TLS" />
          <Row icon="lock" iconColor="#30D158" label="Firebase Auth" value="Active" />
          <Row icon="eye-off" iconColor="#30D158" label="Analytics" value="Disabled" last />
        </Group>

        <SectionLabel title="STORAGE" />
        <Group>
          <Row icon="database" iconColor={colors.primary} label="Indexed screenshots" value={String(totalIndexed)} />
          <Row icon="hard-drive" iconColor={colors.primary} label="Local cache" value="On device" last />
        </Group>

        <SectionLabel title="PREMIUM" />
        <LinearGradient
          colors={[colors.primary + '30', colors.accent + '18', colors.card]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.premiumCard, { borderColor: colors.primary + '35' }]}
        >
          <View style={styles.premiumTop}>
            <View style={[styles.premiumIcon, { backgroundColor: colors.primary + '30' }]}>
              <Feather name="star" size={18} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.premiumTitle, { color: colors.foreground }]}>
                {isPremium ? 'Flux Premium Active' : 'Flux Premium'}
              </Text>
              <Text style={[styles.premiumPrice, { color: colors.primary }]}>
                {isPremium ? 'Thank you for supporting Flux' : '₵99 / month via Paystack'}
              </Text>
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
            onPress={() => { void handlePremium(); }}
            disabled={isCheckingOut}
            style={({ pressed }) => [styles.premiumBtn, { opacity: pressed || isCheckingOut ? 0.85 : 1 }]}
          >
            <LinearGradient
              colors={isPremium ? ['#30D158', '#28A745'] : [colors.primary, '#9B8FFF']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.premiumBtnGrad}
            >
              {isCheckingOut ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Text style={styles.premiumBtnText}>
                    {isPremium ? 'Premium Active' : paystackConfigured ? 'Upgrade with Paystack' : 'Set up Paystack'}
                  </Text>
                  <Feather name={isPremium ? 'check' : 'arrow-right'} size={16} color="#fff" />
                </>
              )}
            </LinearGradient>
          </Pressable>
        </LinearGradient>

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

        <SectionLabel title="ABOUT" />
        <Group>
          <Row icon="info" label="Version" value="1.0.0" />
          <Row icon="file-text" label="Privacy Policy" onPress={openPrivacyPolicy} />
          <Row icon="message-square" label="Send Feedback" onPress={() => sendFeedback(user?.email)} last />
        </Group>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
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
  profileHandle: { fontSize: 13, fontFamily: 'DMSans_400Regular' },
  avatarInitials: { fontSize: 18, fontFamily: 'DMSans_700Bold' },
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
  appHeader: { alignItems: 'center', paddingVertical: 16, gap: 8 },
  appIconImg: { width: 76, height: 76, borderRadius: 22, marginBottom: 4 },
  appName: { fontSize: 26, fontFamily: 'DMSans_700Bold', letterSpacing: -0.5 },
  appTagline: { fontSize: 14, fontFamily: 'DMSans_400Regular' },
  statsRow: { flexDirection: 'row', gap: 10, marginHorizontal: 20, marginBottom: 24 },
  statCard: { flex: 1, alignItems: 'center', paddingVertical: 14, borderRadius: 16, gap: 3 },
  statVal: { fontSize: 18, fontFamily: 'DMSans_700Bold' },
  statLbl: { fontSize: 11, fontFamily: 'DMSans_400Regular' },
  sectionLabel: {
    fontSize: 11,
    fontFamily: 'DMSans_600SemiBold',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginHorizontal: 22,
    marginBottom: 8,
    marginTop: 4,
  },
  group: { marginHorizontal: 20, borderRadius: 18, marginBottom: 22, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 14 },
  rowIcon: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  rowLabel: { flex: 1, fontSize: 15, fontFamily: 'DMSans_400Regular' },
  rowRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  rowValue: { fontSize: 14, fontFamily: 'DMSans_400Regular' },
  premiumCard: { marginHorizontal: 20, borderRadius: 20, padding: 18, gap: 12, marginBottom: 22, borderWidth: 1 },
  premiumTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  premiumIcon: { width: 46, height: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  premiumTitle: { fontSize: 16, fontFamily: 'DMSans_700Bold' },
  premiumPrice: { fontSize: 13, fontFamily: 'DMSans_500Medium', marginTop: 1 },
  premiumDesc: { fontSize: 13, fontFamily: 'DMSans_400Regular', lineHeight: 19 },
  featureGrid: { gap: 8 },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  checkDot: { width: 6, height: 6, borderRadius: 3 },
  featureText: { fontSize: 14, fontFamily: 'DMSans_500Medium' },
  premiumBtn: { borderRadius: 14, overflow: 'hidden', marginTop: 2 },
  premiumBtnGrad: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 15,
  },
  premiumBtnText: { color: '#fff', fontSize: 16, fontFamily: 'DMSans_700Bold' },
});
