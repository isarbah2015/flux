import { Alert } from 'react-native';
import { premiumBillingSummary } from '@/lib/pricing';

export type PremiumFeature = 'calendar_sync' | 'price_watch' | 'promise_reminders';

const UPGRADE_SUFFIX = ` (${premiumBillingSummary()})`;

const COPY: Record<PremiumFeature, { title: string; body: string }> = {
  calendar_sync: {
    title: 'Calendar sync is Premium',
    body: `Your free trial has ended. Upgrade to add events from screenshots to your calendar${UPGRADE_SUFFIX}.`,
  },
  price_watch: {
    title: 'Price watch is Premium',
    body: `Your free trial has ended. Upgrade for price-drop alerts on shopping screenshots${UPGRADE_SUFFIX}.`,
  },
  promise_reminders: {
    title: 'Promise reminders are Premium',
    body: `Your free trial has ended. Upgrade for automatic follow-up reminders${UPGRADE_SUFFIX}.`,
  },
};

export function showPremiumGate(
  feature: PremiumFeature,
  onUpgrade: () => void,
): void {
  const { title, body } = COPY[feature];
  Alert.alert(title, body, [
    { text: 'Not now', style: 'cancel' },
    { text: 'Upgrade', onPress: onUpgrade },
  ]);
}
