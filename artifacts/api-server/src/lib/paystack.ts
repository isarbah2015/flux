/**
 * Paystack billing helpers for Flux Premium ($9.99/mo).
 * Docs: https://paystack.com/docs/api/
 */
import { createHmac } from "node:crypto";

const PAYSTACK_BASE = "https://api.paystack.co";

export const PREMIUM_AMOUNT_CENTS = 999; // $9.99 USD
export const PREMIUM_PLAN_LABEL = "Flux Premium";

function secretKey(): string {
  const key = process.env.PAYSTACK_SECRET_KEY;
  if (!key) throw new Error("PAYSTACK_SECRET_KEY is not configured");
  return key;
}

export function isPaystackConfigured(): boolean {
  return Boolean(process.env.PAYSTACK_SECRET_KEY);
}

interface PaystackResponse<T> {
  status: boolean;
  message: string;
  data: T;
}

async function paystackFetch<T>(
  path: string,
  init?: RequestInit,
): Promise<PaystackResponse<T>> {
  const res = await fetch(`${PAYSTACK_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${secretKey()}`,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  const body = (await res.json()) as PaystackResponse<T>;
  if (!res.ok || !body.status) {
    throw new Error(body.message || `Paystack error ${res.status}`);
  }
  return body;
}

export interface InitializeResult {
  authorizationUrl: string;
  accessCode: string;
  reference: string;
}

/** Start a one-time charge for the first month of Premium. */
export async function initializePremiumPayment(opts: {
  email: string;
  userId: string;
  callbackUrl?: string;
}): Promise<InitializeResult> {
  const reference = `flux_${opts.userId.slice(0, 8)}_${Date.now()}`;
  const { data } = await paystackFetch<{
    authorization_url: string;
    access_code: string;
    reference: string;
  }>("/transaction/initialize", {
    method: "POST",
    body: JSON.stringify({
      email: opts.email,
      amount: PREMIUM_AMOUNT_CENTS,
      currency: "USD",
      reference,
      callback_url: opts.callbackUrl,
      metadata: {
        userId: opts.userId,
        plan: "premium",
        custom_fields: [
          { display_name: "Flux User", variable_name: "user_id", value: opts.userId },
        ],
      },
    }),
  });
  return {
    authorizationUrl: data.authorization_url,
    accessCode: data.access_code,
    reference: data.reference,
  };
}

export interface VerifyResult {
  reference: string;
  status: string;
  amount: number;
  currency: string;
  paidAt: string | null;
  userId: string | null;
}

/** Verify a completed transaction and return normalized fields. */
export async function verifyTransaction(reference: string): Promise<VerifyResult> {
  const { data } = await paystackFetch<{
    reference: string;
    status: string;
    amount: number;
    currency: string;
    paid_at: string | null;
    metadata?: { userId?: string };
  }>(`/transaction/verify/${encodeURIComponent(reference)}`);

  return {
    reference: data.reference,
    status: data.status,
    amount: data.amount,
    currency: data.currency,
    paidAt: data.paid_at,
    userId: data.metadata?.userId ?? null,
  };
}

/** Validate Paystack webhook signature (HMAC SHA512). */
export function verifyWebhookSignature(rawBody: string, signature: string | undefined): boolean {
  if (!signature || !process.env.PAYSTACK_SECRET_KEY) return false;
  const hash = createHmac("sha512", process.env.PAYSTACK_SECRET_KEY).update(rawBody).digest("hex");
  return hash === signature;
}
