import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, subscriptionsTable } from "@workspace/db";
import { requireAuth, userEmail, userId } from "../middlewares/auth";
import { logger } from "../lib/logger";
import {
  initializePremiumPayment,
  isPaystackConfigured,
  paystackMode,
  premiumPricePayload,
  verifyTransaction,
  verifyWebhookSignature,
  PREMIUM_AMOUNT_CENTS,
  PREMIUM_CURRENCY,
  PREMIUM_LIFETIME_MS,
} from "../lib/paystack";
import { isTestingEnv } from "../lib/flux-env";
import { isTrialActive, trialStatusPayload } from "../lib/trial";
import type { Subscription } from "@workspace/db";

const router: IRouter = Router();

const GRANT_PREMIUM_DURATION_MS = PREMIUM_LIFETIME_MS;

const PREMIUM_GRANT_EMAILS = new Set(
  (process.env.PREMIUM_GRANT_EMAILS ?? "isarbah2015@gmail.com")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean),
);

function isGrantedPremiumEmail(email: string | undefined): boolean {
  if (!email) return false;
  return PREMIUM_GRANT_EMAILS.has(email.trim().toLowerCase());
}

async function getOrCreateSubscription(uid: string) {
  const [existing] = await db
    .select()
    .from(subscriptionsTable)
    .where(eq(subscriptionsTable.userId, uid))
    .limit(1);

  if (existing) {
    if (!existing.trialStartedAt && !existing.isPremium) {
      const trialStartedAt = new Date();
      const [updated] = await db
        .update(subscriptionsTable)
        .set({ trialStartedAt, updatedAt: new Date() })
        .where(eq(subscriptionsTable.userId, uid))
        .returning();
      return updated ?? { ...existing, trialStartedAt };
    }
    return existing;
  }

  const trialStartedAt = new Date();
  const [created] = await db
    .insert(subscriptionsTable)
    .values({ userId: uid, trialStartedAt })
    .returning();
  return created;
}

function isPaidPremium(sub: Subscription): boolean {
  return Boolean(
    sub.isPremium && (!sub.premiumUntil || sub.premiumUntil.getTime() > Date.now()),
  );
}

function hasPremiumAccess(sub: Subscription): boolean {
  return isPaidPremium(sub) || isTrialActive(sub.trialStartedAt);
}

function subscriptionStatusPayload(sub: Subscription) {
  const paid = isPaidPremium(sub);
  const access = hasPremiumAccess(sub);
  const trial = trialStatusPayload(sub.trialStartedAt);

  return {
    isPremium: access,
    isPaidPremium: paid,
    plan: access ? ("premium" as const) : ("free" as const),
    premiumUntil: sub.premiumUntil?.toISOString() ?? null,
    ...trial,
    ...premiumPricePayload(),
    paystackConfigured: isPaystackConfigured(),
    paystackMode: paystackMode(),
  };
}

async function activatePremium(
  uid: string,
  reference: string,
  email?: string,
  durationMs = PREMIUM_LIFETIME_MS,
) {
  const until = new Date(Date.now() + durationMs);
  await db
    .insert(subscriptionsTable)
    .values({
      userId: uid,
      plan: "premium",
      isPremium: true,
      lastReference: reference,
      paystackEmail: email ?? null,
      premiumUntil: until,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: subscriptionsTable.userId,
      set: {
        plan: "premium",
        isPremium: true,
        lastReference: reference,
        paystackEmail: email ?? null,
        premiumUntil: until,
        updatedAt: new Date(),
      },
    });
  return until;
}

async function ensureEmailGrantPremium(uid: string, email: string) {
  const reference = `grant:${email.toLowerCase()}`;
  return activatePremium(uid, reference, email, GRANT_PREMIUM_DURATION_MS);
}

// GET /api/billing/public-status — no auth; Paystack availability for Settings UI
router.get("/billing/public-status", (_req, res) => {
  res.json({
    paystackConfigured: isPaystackConfigured(),
    paystackMode: paystackMode(),
    ...premiumPricePayload(),
  });
});

// GET /api/billing/status
router.get("/billing/status", requireAuth, async (req, res) => {
  const uid = userId(req);
  const email = userEmail(req);

  if (isGrantedPremiumEmail(email)) {
    const premiumUntil = await ensureEmailGrantPremium(uid, email!);
    res.json({
      isPremium: true,
      isPaidPremium: true,
      plan: "premium",
      premiumUntil: premiumUntil.toISOString(),
      isOnTrial: false,
      trialEndsAt: null,
      trialDaysLeft: 0,
      ...premiumPricePayload(),
      paystackConfigured: isPaystackConfigured(),
      paystackMode: paystackMode(),
    });
    return;
  }

  const sub = await getOrCreateSubscription(uid);
  res.json(subscriptionStatusPayload(sub));
});

// POST /api/billing/initialize
router.post("/billing/initialize", requireAuth, async (req, res) => {
  if (!isPaystackConfigured()) {
    res.status(503).json({ error: "Paystack is not configured. Set PAYSTACK_SECRET_KEY on the API server." });
    return;
  }

  if (
    paystackMode() === "test" &&
    process.env.PAYSTACK_REQUIRE_LIVE === "true" &&
    !isTestingEnv()
  ) {
    res.status(503).json({ error: "Paystack is in test mode. Sync live keys with scripts/sync-paystack-from-scoutgrid.sh" });
    return;
  }

  const uid = userId(req);
  const email = typeof req.body?.email === "string" ? req.body.email.trim() : "";
  if (!email) {
    res.status(400).json({ error: "email is required" });
    return;
  }

  const callbackUrl =
    typeof req.body?.callbackUrl === "string" ? req.body.callbackUrl : undefined;

  try {
    const result = await initializePremiumPayment({ email, userId: uid, callbackUrl });
    res.json({
      authorizationUrl: result.authorizationUrl,
      accessCode: result.accessCode,
      reference: result.reference,
      amount: PREMIUM_AMOUNT_CENTS,
      ...premiumPricePayload(),
    });
  } catch (err) {
    logger.error({ err }, "Paystack initialize failed");
    res.status(502).json({ error: err instanceof Error ? err.message : "Payment initialization failed" });
  }
});

// GET /api/billing/verify?reference=
router.get("/billing/verify", requireAuth, async (req, res) => {
  if (!isPaystackConfigured()) {
    res.status(503).json({ error: "Paystack is not configured" });
    return;
  }

  const reference = typeof req.query.reference === "string" ? req.query.reference : "";
  if (!reference) {
    res.status(400).json({ error: "reference is required" });
    return;
  }

  const uid = userId(req);

  try {
    const verified = await verifyTransaction(reference);
    if (verified.status !== "success") {
      res.status(402).json({ error: "Payment not completed", status: verified.status });
      return;
    }
    if (verified.userId && verified.userId !== uid) {
      res.status(403).json({ error: "Payment belongs to a different user" });
      return;
    }

    const premiumUntil = await activatePremium(uid, reference);
    res.json({
      isPremium: true,
      isPaidPremium: true,
      plan: "premium",
      premiumUntil: premiumUntil.toISOString(),
      isOnTrial: false,
      trialEndsAt: null,
      trialDaysLeft: 0,
      reference: verified.reference,
      ...premiumPricePayload(),
    });
  } catch (err) {
    logger.error({ err }, "Paystack verify failed");
    res.status(502).json({ error: err instanceof Error ? err.message : "Verification failed" });
  }
});

// POST /api/billing/webhook — raw body required for signature check (mounted separately)
export async function handlePaystackWebhook(rawBody: string, signature: string | undefined) {
  if (!verifyWebhookSignature(rawBody, signature)) {
    throw new Error("Invalid webhook signature");
  }

  const event = JSON.parse(rawBody) as {
    event: string;
    data: {
      reference?: string;
      status?: string;
      metadata?: { userId?: string };
      customer?: { email?: string };
    };
  };

  if (event.event !== "charge.success" || event.data.status !== "success") {
    return { handled: false };
  }

  const uid = event.data.metadata?.userId;
  const reference = event.data.reference;
  if (!uid || !reference) return { handled: false };

  await activatePremium(uid, reference, event.data.customer?.email);
  return { handled: true, userId: uid };
}

export default router;
