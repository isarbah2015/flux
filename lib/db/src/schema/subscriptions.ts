import { boolean, pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const SUBSCRIPTION_PLANS = ["free", "premium"] as const;
export type SubscriptionPlan = (typeof SUBSCRIPTION_PLANS)[number];

/**
 * Per-user subscription state. `userId` is the Firebase Auth uid (or `local-dev`).
 * Premium is activated after a successful Paystack verification / webhook.
 */
export const subscriptionsTable = pgTable("subscriptions", {
  userId: text("user_id").primaryKey(),
  plan: text("plan").$type<SubscriptionPlan>().notNull().default("free"),
  isPremium: boolean("is_premium").notNull().default(false),
  paystackCustomerCode: text("paystack_customer_code"),
  paystackEmail: text("paystack_email"),
  lastReference: text("last_reference"),
  premiumUntil: timestamp("premium_until", { withTimezone: true }),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Subscription = typeof subscriptionsTable.$inferSelect;
