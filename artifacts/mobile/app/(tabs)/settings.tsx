import React, { useCallback, useRef } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Constants from 'expo-constants';
import { useColors } from '@/hooks/useColors';
import { useScreenInsets } from '@/hooks/useScreenInsets';
import { useScreenshots } from '@/context/ScreenshotsContext';
import { useAuth } from '@/context/AuthContext';
import { usePremium } from '@/context/PremiumContext';
import { useProfile } from '@/context/ProfileContext';
import { useLocale } from '@/context/LocaleContext';
import { useAppLock } from '@/context/AppLockContext';
import { premiumBillingSummary, premiumPriceLabel } from '@/lib/pricing';
import { PREMIUM_TRIAL_DAYS } from '@/lib/premium-trial';
import {
  openPrivacyPolicy,
  sendFeedback,
} from '@/lib/actions';
import FluxLogo from '@/components/FluxLogo';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { isTestingBuild } from '@/lib/flux-env';
import { API_BASE_URL } from '@/lib/api';

interface RowProps {
  icon: string;
  iconColor?: string;
  label: string;
  value?: string;
  onPress: () => void;
  destructive?: boolean;
  last?: boolean;
}

interface ToggleRowProps {
  icon: string;
  iconColor?: string;
  label: string;
  value: boolean;
  onValueChange: (next: boolean) => void;
  disabled?: boolean;
  last?: boolean;
}

function ToggleRow({ icon, iconColor, label, value, onValueChange, disabled, last }: ToggleRowProps) {
  const colors = useColors();
  const ic = iconColor ?? colors.mutedForeground;
  return (
    <View
      style={[
        styles.row,
        !last && { borderBottomWidth: 1, borderBottomColor: colors.border + '55' },
        { opacity: disabled ? 0.55 : 1 },
      ]}
    >
      <View style={[styles.rowIcon, { backgroundColor: ic + '20' }]}>
        <Feather name={icon as keyof typeof Feather.glyphMap} size={15} color={ic} />
      </View>
      <Text style={[styles.rowLabel, { color: colors.foreground }]} numberOfLines={1} ellipsizeMode="tail">
        {label}
      </Text>
      <Switch
        value={value}
        onValueChange={onValueChange}
        disabled={disabled}
        trackColor={{ false: colors.border, true: colors.primary + '90' }}
        thumbColor="#fff"
      />
    </View>
  );
}

function Row({ icon, iconColor, label, value, onPress, destructive, last }: RowProps) {
  const colors = useColors();
  const ic = iconColor ?? colors.mutedForeground;
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        !last && { borderBottomWidth: 1, borderBottomColor: colors.border + '55' },
        { opacity: pressed ? 0.7 : 1 },
      ]}
    >
      <View style={[styles.rowIcon, { backgroundColor: ic + '20' }]}>
        <Feather name={icon as keyof typeof Feather.glyphMap} size={15} color={ic} />
      </View>
      <Text
        style={[styles.rowLabel, { color: destructive ? colors.destructive : colors.foreground }]}
        numberOfLines={1}
        ellipsizeMode="tail"
      >
        {label}
      </Text>
      <View style={styles.rowRight}>
        {value ? (
          <Text
            style={[styles.rowValue, { color: colors.mutedForeground }]}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {value}
          </Text>
        ) : null}
        <Feather name="chevron-right" size={15} color={colors.mutedForeground} />
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

function showInfo(title: string, message: string) {
  Haptics.selectionAsync();
  Alert.alert(title, message, [{ text: 'OK' }]);
}

export default function SettingsScreen() {
  const colors = useColors();
  const { topPad, bottomPad } = useScreenInsets();
  const { totalIndexed } = useScreenshots();
  const { authEnabled, user, signOut } = useAuth();
  const {
    isPremium,
    isPaidPremium,
    isOnTrial,
    trialDaysLeft,
    trialEndsAt,
    isCheckingOut,
    paystackConfigured,
    paystackMode,
    premiumUntil,
    price,
    currency,
    startCheckout,
    refresh,
  } = usePremium();
  const { profile } = useProfile();
  const { t, currentLanguageLabel, hasFullTranslation } = useLocale();
  const {
    enabled: appLockEnabled,
    biometricLabel,
    biometricSupported,
    isLoading: appLockLoading,
    setEnabled: setAppLockEnabled,
  } = useAppLock();
  const premiumRef = useRef<View>(null);

  const onAppLockToggle = useCallback(
    async (next: boolean) => {
      Haptics.selectionAsync();
      if (!biometricSupported && next) {
        Alert.alert(
          'Biometrics unavailable',
          'Set up Face ID, Touch ID, or fingerprint unlock in your device settings first.',
        );
        return;
      }
      const ok = await setAppLockEnabled(next);
      if (!ok && next) {
        Alert.alert('Could not enable app lock', `${biometricLabel} verification was cancelled or failed.`);
      }
    },
    [biometricLabel, biometricSupported, setAppLockEnabled],
  );

  const displayName = profile?.displayName || user?.displayName || user?.email?.split('@')[0] || t('settings.fluxUser');
  const handle = profile?.profileId ? `@${profile.profileId}` : t('settings.setProfileId');
  const priceLabel = currency === 'USD' ? premiumPriceLabel() : `${price} ${currency}`;
  const trialLabel =
    trialDaysLeft <= 1 ? t('settings.trialEndsToday') : t('settings.trialDaysLeft', { count: trialDaysLeft });
  const planLabel = isPaidPremium
    ? t('settings.planPremium')
    : isOnTrial
      ? t('settings.planTrial', { label: trialLabel })
      : t('settings.planFree');
  const premiumSubtitle = isPaidPremium
    ? t('settings.premiumThankYou')
    : isOnTrial
      ? t('settings.premiumTrialSub', { label: trialLabel, price: priceLabel })
      : paystackConfigured
        ? t('settings.premiumPaystack', {
            price: priceLabel,
            mode: paystackMode === 'live' ? t('settings.live') : t('settings.test'),
          })
        : t('settings.premiumOffline', { price: priceLabel });

  async function handlePremium() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (isPaidPremium) {
      await refresh();
      if (premiumUntil) {
        showInfo(
          'Flux Premium',
          `You have lifetime access. Recorded until ${new Date(premiumUntil).toLocaleDateString()}.`,
        );
      }
      return;
    }
    if (isOnTrial) {
      showInfo(
        'Free trial active',
        `You have ${trialDaysLeft} day${trialDaysLeft === 1 ? '' : 's'} left of full Premium access${
          trialEndsAt ? ` (ends ${new Date(trialEndsAt).toLocaleDateString()})` : ''
        }. After that, upgrade once for lifetime access — ${premiumBillingSummary()}.`,
      );
      return;
    }
    await startCheckout();
  }

  const goLibrary = useCallback(() => {
    Haptics.selectionAsync();
    router.push('/(tabs)');
  }, []);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={{ paddingTop: topPad, paddingBottom: bottomPad }}
        showsVerticalScrollIndicator={false}
      >
        <SectionLabel title={t('settings.profile')} />
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
              <View style={[styles.planDot, { backgroundColor: isPaidPremium ? colors.primary : isOnTrial ? '#FFD60A' : '#30D158' }]} />
              <Text style={[styles.planText, { color: isPremium ? (isOnTrial && !isPaidPremium ? '#FFD60A' : colors.primary) : colors.mutedForeground }]}>
                {planLabel}
              </Text>
            </View>
          </View>
          <View style={[styles.editBtn, { backgroundColor: colors.secondary }]}>
            <Feather name="edit-2" size={14} color={colors.mutedForeground} />
          </View>
        </Pressable>

        <View style={styles.appHeader}>
          <FluxLogo size={56} />
          <Text style={[styles.appName, { color: colors.foreground }]}>Flux</Text>
          <Text style={[styles.appTagline, { color: colors.mutedForeground }]}>
            {t('settings.tagline')}
          </Text>
        </View>

        <View style={styles.statsRow}>
          <Pressable
            onPress={goLibrary}
            style={({ pressed }) => [
              styles.statCard,
              { backgroundColor: colors.primary + '14', opacity: pressed ? 0.85 : 1 },
            ]}
          >
            <Text style={[styles.statVal, { color: colors.primary }]}>{totalIndexed}</Text>
            <Text style={[styles.statLbl, { color: colors.mutedForeground }]}>{t('settings.indexed')}</Text>
          </Pressable>
          <Pressable
            onPress={() => { void handlePremium(); }}
            style={({ pressed }) => [
              styles.statCard,
              { backgroundColor: (isPremium ? '#FFD60A' : '#30D158') + '14', opacity: pressed ? 0.85 : 1 },
            ]}
          >
            <Text style={[styles.statVal, { color: isPaidPremium ? '#FFD60A' : isOnTrial ? '#FFD60A' : '#30D158' }]}>
              {isPaidPremium ? t('settings.pro') : isOnTrial ? t('settings.trial') : t('settings.free')}
            </Text>
            <Text style={[styles.statLbl, { color: colors.mutedForeground }]}>{t('settings.plan')}</Text>
          </Pressable>
          <Pressable
            onPress={() => showInfo('Security', 'Flux uses Firebase Authentication and TLS encryption. Screenshots stay on your device by default.')}
            style={({ pressed }) => [
              styles.statCard,
              { backgroundColor: '#00D4FF14', opacity: pressed ? 0.85 : 1 },
            ]}
          >
            <Text style={[styles.statVal, { color: '#00D4FF' }]}>{t('settings.secure')}</Text>
            <Text style={[styles.statLbl, { color: colors.mutedForeground }]}>{t('settings.onDevice')}</Text>
          </Pressable>
        </View>

        <SectionLabel title={t('settings.preferences')} />
        <Group>
          <Row
            icon="globe"
            iconColor={colors.primary}
            label={t('settings.language')}
            value={currentLanguageLabel}
            onPress={() => { Haptics.selectionAsync(); router.push('/language'); }}
            last
          />
        </Group>

        <SectionLabel title={t('settings.privacy')} />
        <Group>
          <ToggleRow
            icon="smartphone"
            iconColor="#30D158"
            label={t('settings.requireBiometric', { biometric: biometricLabel })}
            value={appLockEnabled}
            onValueChange={(next) => void onAppLockToggle(next)}
            disabled={appLockLoading || !biometricSupported}
          />
          <Row
            icon="shield"
            iconColor="#30D158"
            label={t('settings.encryptedTransit')}
            value="TLS"
            onPress={() => showInfo('Encrypted in transit', 'All API traffic uses HTTPS/TLS. Your login tokens are never stored in plain text.')}
          />
          <Row
            icon="lock"
            iconColor="#30D158"
            label={t('settings.firebaseAuth')}
            value={authEnabled ? (user ? t('settings.signedIn') : t('settings.guest')) : t('settings.devMode')}
            onPress={() => {
              if (authEnabled && user) router.push('/profile');
              else showInfo('Account', authEnabled ? 'Sign in to sync screenshots and unlock Paystack checkout.' : 'Auth is disabled in this build.');
            }}
          />
          <Row
            icon="eye-off"
            iconColor="#30D158"
            label={t('settings.analytics')}
            value={t('settings.analyticsDisabled')}
            onPress={() => showInfo('Analytics', 'Flux does not use third-party analytics or ad trackers.')}
            last
          />
        </Group>

        <SectionLabel title={t('settings.storage')} />
        <Group>
          <Row
            icon="database"
            iconColor={colors.primary}
            label={t('settings.indexedScreenshots')}
            value={String(totalIndexed)}
            onPress={goLibrary}
          />
          <Row
            icon="hard-drive"
            iconColor={colors.primary}
            label={t('settings.localCache')}
            value={t('settings.onDeviceValue')}
            onPress={() => showInfo('Local storage', 'Screenshots and OCR text are stored in an on-device SQLite database. Nothing is uploaded unless you are signed in and online.')}
            last
          />
        </Group>

        <SectionLabel title={t('settings.premium')} />
        <View ref={premiumRef}>
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
                  {isPaidPremium ? t('settings.premiumActive') : isOnTrial ? t('settings.premiumTrialActive') : t('settings.premiumTitle')}
                </Text>
                <Text style={[styles.premiumPrice, { color: colors.primary }]}>
                  {premiumSubtitle}
                </Text>
              </View>
            </View>
            <Text style={[styles.premiumDesc, { color: colors.mutedForeground }]}>
              {isOnTrial && !isPaidPremium
                ? `New users get ${PREMIUM_TRIAL_DAYS} days of full Premium free. ${trialLabel.charAt(0).toUpperCase()}${trialLabel.slice(1)} — then ${premiumBillingSummary()} for lifetime access.`
                : `${premiumBillingSummary()} — unlock price drops, promise reminders, and calendar sync forever.`}
            </Text>
            <View style={styles.featureGrid}>
              {[
                { label: 'Price drop alerts', info: 'Get notified when a product in your screenshots drops in price.' },
                { label: 'Promise reminders', info: 'Auto-schedule follow-ups when Flux detects a promise in chat screenshots.' },
                { label: 'Calendar sync', info: 'Add flights, meetings, and bookings to your phone calendar in one tap.' },
                { label: 'Unlimited OCR', info: 'Import and scan as many screenshots as you like with on-device text extraction.' },
              ].map(({ label, info }) => (
                <Pressable
                  key={label}
                  onPress={() => showInfo(label, info)}
                  style={({ pressed }) => [styles.featureRow, { opacity: pressed ? 0.75 : 1 }]}
                >
                  <View style={[styles.checkDot, { backgroundColor: colors.primary }]} />
                  <Text style={[styles.featureText, { color: colors.foreground }]}>{label}</Text>
                  <Feather name="info" size={13} color={colors.mutedForeground} />
                </Pressable>
              ))}
            </View>
            <Pressable
              onPress={() => { void handlePremium(); }}
              disabled={isCheckingOut}
              style={({ pressed }) => [styles.premiumBtn, { opacity: pressed || isCheckingOut ? 0.85 : 1 }]}
            >
              <LinearGradient
                colors={isPaidPremium ? ['#30D158', '#28A745'] : isOnTrial ? ['#FFD60A', '#FF9F0A'] : [colors.primary, '#9B8FFF']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.premiumBtnGrad}
              >
                {isCheckingOut ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Text style={styles.premiumBtnText}>
                      {isPaidPremium
                        ? t('settings.premiumBtnActive')
                        : isOnTrial
                          ? t('settings.premiumBtnUpgrade', { price: priceLabel })
                          : paystackConfigured
                            ? t('settings.premiumBtnGet', { price: priceLabel })
                            : t('settings.premiumBtnUnavailable')}
                    </Text>
                    <Feather name={isPaidPremium ? 'check' : 'arrow-right'} size={16} color="#fff" />
                  </>
                )}
              </LinearGradient>
            </Pressable>
          </LinearGradient>
        </View>

        {authEnabled && (
          <>
            <SectionLabel title={t('settings.account')} />
            <Group>
              <Row
                icon="user"
                iconColor={colors.primary}
                label={t('settings.manageProfile')}
                value={user?.email?.split('@')[0] ?? t('settings.guest')}
                onPress={() => { Haptics.selectionAsync(); router.push('/profile'); }}
              />
              <Row
                icon="log-out"
                iconColor={colors.destructive}
                label={t('common.signOut')}
                onPress={() => {
                  Alert.alert(t('common.signOutConfirm'), t('common.signOutBody'), [
                    { text: t('common.cancel'), style: 'cancel' },
                    { text: t('common.signOut'), style: 'destructive', onPress: () => { void signOut(); } },
                  ]);
                }}
                destructive
                last
              />
            </Group>
          </>
        )}

        <SectionLabel title={t('settings.flux')} />
        <Group>
          <Row
            icon="bar-chart-2"
            iconColor={colors.primary}
            label={t('settings.fluxDashboard')}
            value={t('settings.dashboardValue')}
            onPress={() => { Haptics.selectionAsync(); router.push('/stats'); }}
          />
          <Row
            icon="gift"
            iconColor="#FFD60A"
            label={t('settings.referral')}
            value={t('settings.referralValue')}
            onPress={() => { Haptics.selectionAsync(); router.push('/stats'); }}
            last
          />
        </Group>

        <SectionLabel title={t('settings.about')} />
        <Group>
          <Row
            icon="info"
            label={t('settings.version')}
            value={isTestingBuild ? 'Testing' : (Constants.expoConfig?.version ?? '1.0.0')}
            onPress={() => showInfo(
              'Flux',
              `Version ${Constants.expoConfig?.version ?? '1.0.0'}\nBuild ${Constants.nativeBuildVersion ?? 'dev'}\nMode ${isTestingBuild ? 'Testing' : 'Production'}\nAPI ${API_BASE_URL}\nPremium: ${premiumBillingSummary()}`,
            )}
          />
          <Row icon="file-text" label={t('settings.privacyPolicy')} onPress={openPrivacyPolicy} />
          <Row
            icon="message-square"
            label={t('settings.feedback')}
            onPress={() => sendFeedback(user?.email)}
            last
          />
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
  rowLabel: {
    flex: 1,
    minWidth: 0,
    fontSize: 15,
    fontFamily: 'DMSans_400Regular',
    includeFontPadding: false,
  },
  rowRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexShrink: 1,
    maxWidth: '42%',
  },
  rowValue: {
    fontSize: 14,
    fontFamily: 'DMSans_400Regular',
    flexShrink: 1,
    textAlign: 'right',
    includeFontPadding: false,
  },
  premiumCard: { marginHorizontal: 20, borderRadius: 20, padding: 18, gap: 12, marginBottom: 22, borderWidth: 1 },
  premiumTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  premiumIcon: { width: 46, height: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  premiumTitle: { fontSize: 16, fontFamily: 'DMSans_700Bold' },
  premiumPrice: { fontSize: 13, fontFamily: 'DMSans_500Medium', marginTop: 1 },
  premiumDesc: { fontSize: 13, fontFamily: 'DMSans_400Regular', lineHeight: 19 },
  featureGrid: { gap: 8 },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  checkDot: { width: 6, height: 6, borderRadius: 3 },
  featureText: { flex: 1, fontSize: 14, fontFamily: 'DMSans_500Medium' },
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
