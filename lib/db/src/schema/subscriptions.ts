import { boolean, pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const SUBSCRIPTION_PLANS = ["free", "premium"] as const;
export type SubscriptionPlan = (typeof SUBSCRIPTION_PLANS)[number];

/** Days of full Premium access for new accounts before paywall. */
export const PREMIUM_TRIAL_DAYS = 14;

/**
 * Per-user subscription state. `userId` is the Firebase Auth uid (or `local-dev`).
 * Premium is activated after a successful Paystack verification / webhook.
 * New users get a 14-day trial (`trialStartedAt`) with all Premium features.
 */
export const subscriptionsTable = pgTable("subscriptions", {
  userId: text("user_id").primaryKey(),
  plan: text("plan").$type<SubscriptionPlan>().notNull().default("free"),
  isPremium: boolean("is_premium").notNull().default(false),
  paystackCustomerCode: text("paystack_customer_code"),
  paystackEmail: text("paystack_email"),
  lastReference: text("last_reference"),
  premiumUntil: timestamp("premium_until", { withTimezone: true }),
  trialStartedAt: timestamp("trial_started_at", { withTimezone: true }),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Subscription = typeof subscriptionsTable.$inferSelect;
