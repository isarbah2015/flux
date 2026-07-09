import { useCallback } from 'react';
import { usePremium } from '@/context/PremiumContext';
import { showPremiumGate, type PremiumFeature } from '@/lib/premium-gate';

export function usePremiumGate() {
  const { isPremium, startCheckout } = usePremium();

  const requirePremium = useCallback(
    (feature: PremiumFeature, onAllowed: () => void) => {
      if (isPremium) {
        onAllowed();
        return;
      }
      showPremiumGate(feature, () => {
        void startCheckout();
      });
    },
    [isPremium, startCheckout],
  );

  return { isPremium, requirePremium };
}
