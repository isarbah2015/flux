import { API_BASE_URL } from './api';
import { auth } from './firebase';

export interface BillingStatus {
  isPremium: boolean;
  plan: 'free' | 'premium';
  premiumUntil: string | null;
  priceUsd: string;
  paystackConfigured: boolean;
}

export interface InitializePaymentResult {
  authorizationUrl: string;
  reference: string;
  amount: number;
  currency: string;
}

async function authHeaders(): Promise<Record<string, string>> {
  const token = auth?.currentUser ? await auth.currentUser.getIdToken() : null;
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export async function fetchBillingStatus(): Promise<BillingStatus> {
  const res = await fetch(`${API_BASE_URL}/api/billing/status`, {
    headers: await authHeaders(),
  });
  if (!res.ok) throw new Error('Could not load subscription status');
  return res.json() as Promise<BillingStatus>;
}

export async function initializePremiumPayment(email: string): Promise<InitializePaymentResult> {
  const res = await fetch(`${API_BASE_URL}/api/billing/initialize`, {
    method: 'POST',
    headers: await authHeaders(),
    body: JSON.stringify({
      email,
      callbackUrl: `${API_BASE_URL}/api/billing/verify`,
    }),
  });
  const body = await res.json();
  if (!res.ok) throw new Error(body.error ?? 'Could not start checkout');
  return body as InitializePaymentResult;
}

export async function verifyPremiumPayment(reference: string): Promise<BillingStatus> {
  const res = await fetch(
    `${API_BASE_URL}/api/billing/verify?reference=${encodeURIComponent(reference)}`,
    { headers: await authHeaders() },
  );
  const body = await res.json();
  if (!res.ok) throw new Error(body.error ?? 'Payment verification failed');
  return body as BillingStatus;
}
