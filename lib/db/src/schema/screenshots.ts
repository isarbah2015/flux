import { pgTable, uuid, text, jsonb, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod/v4";

/**
 * The category taxonomy Flux classifies screenshots into. Kept in sync with the
 * mobile client (`artifacts/mobile/context/ScreenshotsContext.tsx`).
 */
export const SCREENSHOT_CATEGORIES = [
  "shopping",
  "work",
  "travel",
  "receipt",
  "conversation",
  "unknown",
] as const;

export type ScreenshotCategory = (typeof SCREENSHOT_CATEGORIES)[number];

/**
 * Structured intelligence extracted from a screenshot. Stored as JSONB so the
 * shape can evolve without a migration. Each sub-object is optional and only
 * present when the classifier detects the relevant signal.
 */
export interface ScreenshotMetadata {
  priceTracking?: {
    productName: string;
    detectedPrice: string;
    currentPrice: string;
    retailer: string;
    priceDropped: boolean;
  };
  promise?: {
    from: string;
    content: string;
    deadline: string;
    followUpDate: string;
  };
  calendarEvent?: {
    title: string;
    date: string;
    time?: string;
    location?: string;
  };
}

export const screenshotsTable = pgTable("screenshots", {
  id: uuid("id").primaryKey().defaultRandom(),
  // Firebase Auth uid of the owner. Screenshots are private to their owner.
  userId: text("user_id").notNull(),
  // Local device URI (e.g. from expo-image-picker) or a remote object-store URL.
  imageUri: text("image_uri"),
  category: text("category").$type<ScreenshotCategory>().notNull().default("unknown"),
  extractedText: text("extracted_text").notNull().default(""),
  summary: text("summary").notNull().default(""),
  tags: jsonb("tags").$type<string[]>().notNull().default([]),
  colorHex: text("color_hex").notNull().default("#636384"),
  metadata: jsonb("metadata").$type<ScreenshotMetadata>().notNull().default({}),
  capturedAt: timestamp("captured_at", { withTimezone: true }).notNull().defaultNow(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertScreenshotSchema = createInsertSchema(screenshotsTable).omit({
  id: true,
  createdAt: true,
});
export const selectScreenshotSchema = createSelectSchema(screenshotsTable);

export type InsertScreenshot = z.infer<typeof insertScreenshotSchema>;
export type Screenshot = typeof screenshotsTable.$inferSelect;
