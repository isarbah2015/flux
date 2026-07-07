import { pgTable, text, timestamp } from "drizzle-orm/pg-core";

/** Per-user public profile (Firebase uid as primary key). */
export const profilesTable = pgTable("profiles", {
  userId: text("user_id").primaryKey(),
  displayName: text("display_name").notNull().default(""),
  /** Unique @handle, lowercase alphanumeric + underscore, 3–24 chars. */
  profileId: text("profile_id").unique(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Profile = typeof profilesTable.$inferSelect;
