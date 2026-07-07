import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, subscriptionsTable } from "@workspace/db";
import { requireAuth, userId } from "../middlewares/auth";
import { logger } from "../lib/logger";
import {
  initializePremiumPayment,
  isPaystackConfigured,
  verifyTransaction,
  verifyWebhookSignature,
  PREMIUM_AMOUNT_PESEWAS,
  PREMIUM_AMOUNT_GHS,
  PREMIUM_CURRENCY,
} from "../lib/paystack";

const router: IRouter = Router();

const PREMIUM_DURATION_MS = 30 * 24 * 60 * 60 * 1000; // 30 days per payment

async function getOrCreateSubscription(uid: string) {
  const [existing] = await db
    .select()
    .from(subscriptionsTable)
    .where(eq(subscriptionsTable.userId, uid))
    .limit(1);

  if (existing) return existing;

  const [created] = await db
    .insert(subscriptionsTable)
    .values({ userId: uid })
    .returning();
  return created;
}

async function activatePremium(uid: string, reference: string, email?: string) {
  const until = new Date(Date.now() + PREMIUM_DURATION_MS);
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

// GET /api/billing/status
router.get("/billing/status", requireAuth, async (req, res) => {
  const uid = userId(req);
  const sub = await getOrCreateSubscription(uid);

  const active =
    sub.isPremium && (!sub.premiumUntil || sub.premiumUntil.getTime() > Date.now());

  res.json({
    isPremium: active,
    plan: active ? "premium" : "free",
    premiumUntil: sub.premiumUntil?.toISOString() ?? null,
    priceGhs: String(PREMIUM_AMOUNT_GHS),
    currency: PREMIUM_CURRENCY,
    paystackConfigured: isPaystackConfigured(),
  });
});

// POST /api/billing/initialize
router.post("/billing/initialize", requireAuth, async (req, res) => {
  if (!isPaystackConfigured()) {
    res.status(503).json({ error: "Paystack is not configured. Set PAYSTACK_SECRET_KEY on the API server." });
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
      amount: PREMIUM_AMOUNT_PESEWAS,
      currency: PREMIUM_CURRENCY,
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
      plan: "premium",
      premiumUntil: premiumUntil.toISOString(),
      reference: verified.reference,
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
