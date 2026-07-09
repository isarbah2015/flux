import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { Alert, Platform } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import * as Haptics from 'expo-haptics';
import { useAuth } from '@/context/AuthContext';
import {
  fetchBillingStatus,
  fetchPaystackPublicStatus,
  initializePremiumPayment,
  verifyPremiumPayment,
  type BillingStatus,
} from '@/lib/billing';
import {
  ensureLocalTrialStarted,
  type TrialStatus,
} from '@/lib/premium-trial';
import { isTestingBuild } from '@/lib/flux-env';
import { getLocalPaystackConfig, mergePaystackStatus } from '@/lib/paystack-config';
import { setPremiumCached } from '@/lib/premium-cache';

interface PremiumContextType {
  /** Trial or paid — gates Premium features. */
  isPremium: boolean;
  isPaidPremium: boolean;
  isOnTrial: boolean;
  trialDaysLeft: number;
  trialEndsAt: string | null;
  plan: 'free' | 'premium';
  premiumUntil: string | null;
  price: string;
  currency: string;
  billingType: 'one_time' | 'subscription';
  isLoading: boolean;
  isCheckingOut: boolean;
  paystackConfigured: boolean;
  paystackMode: 'live' | 'test' | 'none';
  refresh: () => Promise<void>;
  startCheckout: () => Promise<void>;
}

const PremiumContext = createContext<PremiumContextType | null>(null);

const DEFAULT_STATUS: BillingStatus = {
  isPremium: false,
  isPaidPremium: false,
  plan: 'free',
  premiumUntil: null,
  isOnTrial: false,
  trialEndsAt: null,
  trialDaysLeft: 0,
  price: '9.99',
  currency: 'USD',
  billingType: 'one_time',
  paystackConfigured: getLocalPaystackConfig().configured,
  paystackMode: getLocalPaystackConfig().mode,
};

const EMPTY_TRIAL: TrialStatus = {
  trialStartedAt: null,
  isOnTrial: false,
  trialEndsAt: null,
  trialDaysLeft: 0,
};

function mergePremiumAccess(status: BillingStatus, localTrial: TrialStatus) {
  if (isTestingBuild) {
    return {
      isPremium: true,
      isPaidPremium: false,
      isOnTrial: false,
      trialDaysLeft: 0,
      trialEndsAt: null,
      plan: 'premium' as const,
    };
  }

  const isPaidPremium = Boolean(status.isPaidPremium);
  const apiTrial = Boolean(status.isOnTrial);
  const deviceTrial = localTrial.isOnTrial;
  const isOnTrial = !isPaidPremium && (apiTrial || deviceTrial);
  const isPremium = isPaidPremium || isOnTrial;

  const trialDaysLeft = isOnTrial
    ? Math.max(status.trialDaysLeft ?? 0, localTrial.trialDaysLeft)
    : 0;
  const trialEndsAt =
    isOnTrial
      ? (status.trialEndsAt ?? localTrial.trialEndsAt)
      : null;

  return {
    isPremium,
    isPaidPremium,
    isOnTrial,
    trialDaysLeft,
    trialEndsAt,
    plan: isPremium ? ('premium' as const) : ('free' as const),
  };
}

export function PremiumProvider({ children }: { children: React.ReactNode }) {
  const { authEnabled, isReady, user } = useAuth();
  const [status, setStatus] = useState<BillingStatus>(DEFAULT_STATUS);
  const [localTrial, setLocalTrial] = useState<TrialStatus>(EMPTY_TRIAL);
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingOut, setIsCheckingOut] = useState(false);

  const canFetchBilling = !authEnabled || (isReady && !!user);

  useEffect(() => {
    void ensureLocalTrialStarted().then(setLocalTrial);
  }, []);

  const refreshPublicPaystack = useCallback(async () => {
    try {
      const pub = await fetchPaystackPublicStatus();
      setStatus((prev) => ({
        ...prev,
        paystackConfigured: pub.paystackConfigured,
        paystackMode: pub.paystackMode ?? 'none',
        price: pub.price,
        currency: pub.currency,
        billingType: pub.billingType,
      }));
    } catch {
      const local = getLocalPaystackConfig();
      setStatus((prev) => ({
        ...prev,
        ...mergePaystackStatus(prev.paystackConfigured, prev.paystackMode),
        paystackConfigured: prev.paystackConfigured || local.configured,
        paystackMode: prev.paystackMode !== 'none' ? prev.paystackMode : local.mode,
      }));
    }
  }, []);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    try {
      const trial = await ensureLocalTrialStarted();
      setLocalTrial(trial);
      await refreshPublicPaystack();
      if (!canFetchBilling) return;
      const next = await fetchBillingStatus();
      setStatus(next);
    } catch {
      // Keep last known Paystack + premium state.
    } finally {
      setIsLoading(false);
    }
  }, [canFetchBilling, refreshPublicPaystack]);

  const access = useMemo(
    () => mergePremiumAccess(status, localTrial),
    [status, localTrial],
  );

  useEffect(() => {
    setPremiumCached(access.isPremium);
  }, [access.isPremium]);

  useEffect(() => {
    void refreshPublicPaystack();
  }, [refreshPublicPaystack]);

  useEffect(() => {
    if (canFetchBilling) void refresh();
  }, [canFetchBilling, refresh, user?.uid]);

  const startCheckout = useCallback(async () => {
    if (!user?.email) {
      Alert.alert('Sign in required', 'Sign in with your email to upgrade to Premium.');
      return;
    }

    setIsCheckingOut(true);
    try {
      const { authorizationUrl, reference } = await initializePremiumPayment(user.email);

      if (Platform.OS === 'web') {
        window.open(authorizationUrl, '_blank', 'noopener,noreferrer');
        Alert.alert(
          'Complete payment',
          'Finish checkout in the new tab, then tap Verify to activate Premium.',
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Verify',
              onPress: () => {
                void (async () => {
                  try {
                    const verified = await verifyPremiumPayment(reference);
                    setStatus(verified);
                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                    Alert.alert('Welcome to Premium', 'Flux Premium is active — lifetime access unlocked.');
                  } catch (e) {
                    Alert.alert('Not verified yet', e instanceof Error ? e.message : 'Try again shortly.');
                  }
                })();
              },
            },
          ],
        );
        return;
      }

      const result = await WebBrowser.openAuthSessionAsync(
        authorizationUrl,
        Linking.createURL('billing/verify'),
      );

      if (result.type === 'success' || result.type === 'dismiss') {
        try {
          const verified = await verifyPremiumPayment(reference);
          setStatus(verified);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          Alert.alert('Welcome to Premium', 'Flux Premium is active — lifetime access unlocked.');
        } catch (e) {
          Alert.alert(
            'Payment pending',
            e instanceof Error
              ? e.message
              : 'If you completed payment, pull to refresh in Settings.',
          );
        }
      }
    } catch (e) {
      Alert.alert(
        'Checkout unavailable',
        e instanceof Error ? e.message : 'Could not start Paystack checkout.',
      );
    } finally {
      setIsCheckingOut(false);
    }
  }, [user?.email]);

  const value = useMemo<PremiumContextType>(
    () => ({
      ...access,
      premiumUntil: status.premiumUntil,
      price: status.price,
      currency: status.currency,
      billingType: status.billingType ?? 'one_time',
      isLoading,
      isCheckingOut,
      paystackConfigured: status.paystackConfigured,
      paystackMode: status.paystackMode ?? 'none',
      refresh,
      startCheckout,
    }),
    [access, status, isLoading, isCheckingOut, refresh, startCheckout],
  );

  return <PremiumContext.Provider value={value}>{children}</PremiumContext.Provider>;
}

export function usePremium() {
  const ctx = useContext(PremiumContext);
  if (!ctx) throw new Error('usePremium must be used within PremiumProvider');
  return ctx;
}
