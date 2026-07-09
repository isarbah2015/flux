/**
 * Paystack billing helpers for Flux Premium ($9.99 USD one-time).
 * Docs: https://paystack.com/docs/api/
 */
import { createHmac } from "node:crypto";

const PAYSTACK_BASE = "https://api.paystack.co";

/** $9.99 in cents (USD subunit). */
export const PREMIUM_AMOUNT_CENTS = 999;
export const PREMIUM_AMOUNT_USD = 9.99;
export const PREMIUM_CURRENCY = "USD" as const;
export const PREMIUM_PLAN_LABEL = "Flux Premium";
export const PREMIUM_BILLING_TYPE = "one_time" as const;

/** Lifetime premium after one-time payment (~100 years). */
export const PREMIUM_LIFETIME_MS = 100 * 365 * 24 * 60 * 60 * 1000;

export function premiumPricePayload() {
  return {
    price: String(PREMIUM_AMOUNT_USD),
    currency: PREMIUM_CURRENCY,
    billingType: PREMIUM_BILLING_TYPE,
  };
}

function secretKey(): string {
  const key = process.env.PAYSTACK_SECRET_KEY;
  if (!key) throw new Error("PAYSTACK_SECRET_KEY is not configured");
  return key;
}

export function isPaystackConfigured(): boolean {
  return Boolean(process.env.PAYSTACK_SECRET_KEY);
}

export type PaystackMode = "live" | "test" | "none";

export function paystackMode(): PaystackMode {
  const key = process.env.PAYSTACK_SECRET_KEY ?? "";
  if (!key) return "none";
  if (key.startsWith("sk_live_")) return "live";
  if (key.startsWith("sk_test_")) return "test";
  return "none";
}

export function assertPaystackLiveForProduction(): void {
  const fluxEnv = process.env.FLUX_ENV?.trim().toLowerCase();
  if (fluxEnv === "testing") return;
  if (process.env.NODE_ENV === "production" && paystackMode() === "test") {
    throw new Error(
      "Paystack test keys cannot be used in production. Set PAYSTACK_SECRET_KEY to a live key (sk_live_…).",
    );
  }
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

/** Start a one-time $9.99 Premium purchase. */
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
      currency: PREMIUM_CURRENCY,
      channels: ["card"],
      reference,
      callback_url: opts.callbackUrl,
      metadata: {
        userId: opts.userId,
        plan: "premium_lifetime",
        billingType: PREMIUM_BILLING_TYPE,
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
