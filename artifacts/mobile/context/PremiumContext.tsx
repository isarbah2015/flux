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
import * as Haptics from 'expo-haptics';
import { useAuth } from '@/context/AuthContext';
import {
  fetchBillingStatus,
  initializePremiumPayment,
  verifyPremiumPayment,
  type BillingStatus,
} from '@/lib/billing';

interface PremiumContextType {
  isPremium: boolean;
  plan: 'free' | 'premium';
  premiumUntil: string | null;
  isLoading: boolean;
  isCheckingOut: boolean;
  paystackConfigured: boolean;
  refresh: () => Promise<void>;
  startCheckout: () => Promise<void>;
}

const PremiumContext = createContext<PremiumContextType | null>(null);

const DEFAULT_STATUS: BillingStatus = {
  isPremium: false,
  plan: 'free',
  premiumUntil: null,
  priceUsd: '9.99',
  paystackConfigured: false,
};

export function PremiumProvider({ children }: { children: React.ReactNode }) {
  const { authEnabled, isReady, user } = useAuth();
  const [status, setStatus] = useState<BillingStatus>(DEFAULT_STATUS);
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingOut, setIsCheckingOut] = useState(false);

  const canFetch = !authEnabled || (isReady && !!user);

  const refresh = useCallback(async () => {
    if (!canFetch) return;
    setIsLoading(true);
    try {
      const next = await fetchBillingStatus();
      setStatus(next);
    } catch {
      // API may be offline during dev — keep last known state.
    } finally {
      setIsLoading(false);
    }
  }, [canFetch]);

  useEffect(() => {
    void refresh();
  }, [refresh, user?.uid]);

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
                    Alert.alert('Welcome to Premium', 'Flux Premium is now active on your account.');
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
        'mobile://',
      );

      if (result.type === 'success' || result.type === 'dismiss') {
        try {
          const verified = await verifyPremiumPayment(reference);
          setStatus(verified);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          Alert.alert('Welcome to Premium', 'Flux Premium is now active on your account.');
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
      isPremium: status.isPremium,
      plan: status.plan,
      premiumUntil: status.premiumUntil,
      isLoading,
      isCheckingOut,
      paystackConfigured: status.paystackConfigured,
      refresh,
      startCheckout,
    }),
    [status, isLoading, isCheckingOut, refresh, startCheckout],
  );

  return <PremiumContext.Provider value={value}>{children}</PremiumContext.Provider>;
}

export function usePremium() {
  const ctx = useContext(PremiumContext);
  if (!ctx) throw new Error('usePremium must be used within PremiumProvider');
  return ctx;
}
