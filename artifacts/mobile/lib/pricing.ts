/** Flux Premium — $9.99 USD one-time, lifetime access. */
export const PREMIUM_AMOUNT_CENTS = 999;
export const PREMIUM_AMOUNT_USD = 9.99;
export const PREMIUM_CURRENCY = 'USD' as const;
export const PREMIUM_PLAN_LABEL = 'Flux Premium';
export const PREMIUM_BILLING_TYPE = 'one_time' as const;

export function premiumPriceLabel(currency = PREMIUM_CURRENCY): string {
  if (currency === 'USD') return '$9.99';
  return `${PREMIUM_AMOUNT_USD} ${currency}`;
}

export function premiumBillingSummary(): string {
  return `${premiumPriceLabel()} · One-time · Lifetime`;
}
