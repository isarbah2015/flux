import * as Linking from 'expo-linking';
import { API_BASE_URL } from './api';
import { auth } from './firebase';
import { getLocalPaystackConfig, mergePaystackStatus, type PaystackMode } from './paystack-config';

export interface BillingStatus {
  isPremium: boolean;
  isPaidPremium?: boolean;
  plan: 'free' | 'premium';
  premiumUntil: string | null;
  isOnTrial?: boolean;
  trialEndsAt?: string | null;
  trialDaysLeft?: number;
  price: string;
  currency: string;
  billingType?: 'one_time' | 'subscription';
  paystackConfigured: boolean;
  paystackMode?: 'live' | 'test' | 'none';
}

export interface InitializePaymentResult {
  authorizationUrl: string;
  reference: string;
  amount: number;
  currency: string;
  billingType?: string;
}

async function authHeaders(): Promise<Record<string, string>> {
  const token = auth?.currentUser ? await auth.currentUser.getIdToken() : null;
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export interface PaystackPublicStatus {
  paystackConfigured: boolean;
  paystackMode?: PaystackMode;
  price: string;
  currency: string;
  billingType?: 'one_time' | 'subscription';
}

export async function fetchPaystackPublicStatus(): Promise<PaystackPublicStatus> {
  const res = await fetch(`${API_BASE_URL}/api/paystack/status`);
  if (!res.ok) throw new Error('Could not load Paystack status');
  const body = (await res.json()) as PaystackPublicStatus;
  const merged = mergePaystackStatus(body.paystackConfigured, body.paystackMode);
  return { ...body, ...merged };
}

export async function fetchBillingStatus(): Promise<BillingStatus> {
  const res = await fetch(`${API_BASE_URL}/api/billing/status`, {
    headers: await authHeaders(),
  });
  if (!res.ok) throw new Error('Could not load subscription status');
  const body = (await res.json()) as BillingStatus;
  const merged = mergePaystackStatus(body.paystackConfigured, body.paystackMode);
  return { ...body, ...merged };
}

export async function initializePremiumPayment(email: string): Promise<InitializePaymentResult> {
  const res = await fetch(`${API_BASE_URL}/api/billing/initialize`, {
    method: 'POST',
    headers: await authHeaders(),
    body: JSON.stringify({
      email,
      callbackUrl: Linking.createURL('billing/verify'),
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
