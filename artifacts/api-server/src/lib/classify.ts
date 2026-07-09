import type { ScreenshotCategory, ScreenshotMetadata } from "@workspace/db";
import { SCREENSHOT_CATEGORIES } from "@workspace/db";
import { logger } from "./logger";

export interface ClassifyInput {
  /** OCR'd or user-provided text. Optional when an image is supplied. */
  extractedText?: string;
  /** Base64-encoded image bytes (no data: prefix) for server-side vision OCR. */
  imageBase64?: string | null;
  /** Force a category, bypassing the classifier's choice. */
  override?: ScreenshotCategory;
}

export interface Classification {
  extractedText: string;
  category: ScreenshotCategory;
  summary: string;
  tags: string[];
  colorHex: string;
  metadata: ScreenshotMetadata;
}

// Kept in sync with artifacts/mobile/constants/colors.ts
const CATEGORY_COLORS: Record<ScreenshotCategory, string> = {
  shopping: "#FF9F0A",
  work: "#7C72FF",
  travel: "#00D4FF",
  receipt: "#30D158",
  conversation: "#FF375F",
  ideas: "#BF5AF2",
  finance: "#FFD60A",
  food: "#FF6482",
  unknown: "#636384",
};

const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";
// A cheap, fast, vision-capable model is the right tool for per-screenshot work.
// Override with FLUX_CLASSIFIER_MODEL (e.g. claude-opus-4-8) for higher accuracy.
const MODEL = process.env.FLUX_CLASSIFIER_MODEL ?? "claude-haiku-4-5";

const SHARED_RULES = `Categories:
- "shopping": a product listing or item someone might buy. Fill priceTracking when a price is present.
- "receipt": proof of a completed purchase (totals, itemized lines).
- "travel": flights, hotels, tickets, itineraries. Fill calendarEvent.
- "conversation": a message/chat. If someone commits to something (money, a task, a date), fill promise.
- "work": meetings, tasks, roadmaps, work chats.
- "ideas": notes, brainstorms, reminders, inspiration.
- "finance": banking, transfers, wallets, payments, statements.
- "food": restaurants, menus, delivery orders, recipes.
- "unknown": anything else (plants, objects, misc).

The JSON metadata object should include ONLY the sub-objects that clearly apply; omit the others:
  "priceTracking": { "productName": string, "detectedPrice": string, "currentPrice": string, "retailer": string, "priceDropped": boolean }
  "promise": { "from": string, "content": string, "deadline": string, "followUpDate": ISO-8601 date string }
  "calendarEvent": { "title": string, "date": "YYYY-MM-DD", "time"?: string, "location"?: string }
Return valid JSON only — no markdown, no prose.`;

const TEXT_SYSTEM = `You are Flux, an engine that classifies phone screenshots from their text and extracts actionable intelligence.

Respond with ONLY a JSON object:
{ "category": Category, "summary": string (<=90 chars), "tags": string[2..4], "metadata": {...} }

${SHARED_RULES}`;

const VISION_SYSTEM = `You are Flux, an engine that reads phone screenshots and extracts actionable intelligence.

First OCR all readable text in the image, then classify it. Respond with ONLY a JSON object:
{ "extractedText": string (the OCR'd text), "category": Category, "summary": string (<=90 chars), "tags": string[2..4], "metadata": {...} }

${SHARED_RULES}`;

/**
 * Classify a screenshot into a category with extracted metadata.
 * Prefers Claude (vision when an image is supplied, else text) when
 * ANTHROPIC_API_KEY is set; otherwise falls back to a deterministic keyword
 * classifier so the endpoint works with no API key.
 */
export async function classifyScreenshot(input: ClassifyInput): Promise<Classification> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  const providedText = input.extractedText?.trim() ?? "";

  let result: Omit<Classification, "colorHex"> | null = null;

  if (apiKey) {
    try {
      if (input.imageBase64) {
        result = await classifyWithVision(input.imageBase64, apiKey);
      } else if (providedText) {
        result = await classifyWithText(providedText, apiKey);
      }
    } catch (err) {
      logger.warn({ err }, "Claude classification failed; using keyword fallback");
    }
  }

  if (!result) {
    result = keywordClassify(providedText);
  }

  const extractedText = result.extractedText || providedText;
  const category = input.override ?? result.category;
  return {
    extractedText,
    category,
    summary: result.summary,
    tags: result.tags,
    metadata: result.metadata,
    colorHex: CATEGORY_COLORS[category] ?? CATEGORY_COLORS.unknown,
  };
}

async function classifyWithText(
  extractedText: string,
  apiKey: string,
): Promise<Omit<Classification, "colorHex">> {
  const data = await callAnthropic(apiKey, TEXT_SYSTEM, [
    { type: "text", text: `Screenshot text:\n"""\n${extractedText.slice(0, 4000)}\n"""` },
  ]);
  return coerceClassification(parseJson(data), extractedText);
}

async function classifyWithVision(
  imageBase64: string,
  apiKey: string,
): Promise<Omit<Classification, "colorHex">> {
  const data = await callAnthropic(apiKey, VISION_SYSTEM, [
    {
      type: "image",
      source: { type: "base64", media_type: detectMediaType(imageBase64), data: imageBase64 },
    },
    { type: "text", text: "OCR and classify this screenshot." },
  ]);
  return coerceClassification(parseJson(data), "");
}

async function callAnthropic(
  apiKey: string,
  system: string,
  content: unknown[],
): Promise<string> {
  const res = await fetch(ANTHROPIC_URL, {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 1024,
      system,
      messages: [{ role: "user", content }],
    }),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Anthropic API ${res.status}: ${detail.slice(0, 200)}`);
  }

  const data = (await res.json()) as { content?: Array<{ type: string; text?: string }> };
  return data.content?.find((b) => b.type === "text")?.text ?? "";
}

/** Sniff the image type from base64 magic bytes; default to jpeg. */
function detectMediaType(base64: string): "image/png" | "image/jpeg" | "image/gif" | "image/webp" {
  if (base64.startsWith("iVBORw0KGgo")) return "image/png";
  if (base64.startsWith("R0lGOD")) return "image/gif";
  if (base64.startsWith("UklGR")) return "image/webp";
  return "image/jpeg";
}

function parseJson(raw: string): unknown {
  const trimmed = raw.trim().replace(/^```(?:json)?\s*/i, "").replace(/```$/i, "");
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("No JSON object in model output");
  return JSON.parse(trimmed.slice(start, end + 1));
}

function coerceClassification(
  value: unknown,
  fallbackText: string,
): Omit<Classification, "colorHex"> {
  const obj = (value ?? {}) as Record<string, unknown>;
  const category = SCREENSHOT_CATEGORIES.includes(obj.category as ScreenshotCategory)
    ? (obj.category as ScreenshotCategory)
    : "unknown";
  const summary = typeof obj.summary === "string" ? obj.summary : "";
  const tags = Array.isArray(obj.tags)
    ? obj.tags.filter((t): t is string => typeof t === "string").slice(0, 6)
    : [];
  const metadata =
    obj.metadata && typeof obj.metadata === "object"
      ? (obj.metadata as ScreenshotMetadata)
      : {};
  const extractedText = typeof obj.extractedText === "string" ? obj.extractedText : fallbackText;
  return { extractedText, category, summary, tags, metadata };
}

// --- Deterministic keyword fallback (no LLM required) -----------------------

const DAY_MS = 86_400_000;

function keywordClassify(text: string): Omit<Classification, "colorHex"> {
  const t = text.toLowerCase();
  const has = (...words: string[]) => words.some((w) => t.includes(w));
  const firstLine = text.split("\n").find((l) => l.trim())?.trim() ?? "";

  if (has("total", "subtotal", "tax", "receipt") && /\$\s?\d/.test(text)) {
    return {
      extractedText: text,
      category: "receipt",
      summary: truncate(firstLine || "Receipt"),
      tags: ["receipt", "purchase"],
      metadata: {},
    };
  }

  if (has("flight", "gate", "boarding", "hotel", "check-in", "reservation", "itinerary")) {
    return {
      extractedText: text,
      category: "travel",
      summary: truncate(firstLine || "Travel booking"),
      tags: ["travel", "booking"],
      metadata: {},
    };
  }

  // A commitment ("I'll send you $500 by Friday") is a promise, not shopping —
  // check it before the generic price heuristic below.
  if (has("promise", "i'll send", "i will send", "by friday", "next week", "i owe", "i'll get you", "i'll pay")) {
    return {
      extractedText: text,
      category: "conversation",
      summary: truncate(firstLine || "Message"),
      tags: ["conversation", "promise"],
      metadata: {
        promise: {
          from: firstLine || "Someone",
          content: truncate(text, 80),
          deadline: "soon",
          followUpDate: new Date(Date.now() + 3 * DAY_MS).toISOString(),
        },
      },
    };
  }

  if (has("add to cart", "in stock", "free shipping", "reviews", "buy now") || /\$\s?\d/.test(text)) {
    const price = text.match(/\$\s?\d[\d,]*(?:\.\d{2})?/)?.[0]?.replace(/\s/g, "");
    return {
      extractedText: text,
      category: "shopping",
      summary: truncate(firstLine || "Product"),
      tags: ["shopping"],
      metadata: price
        ? {
            priceTracking: {
              productName: truncate(firstLine || "Product", 60),
              detectedPrice: price,
              currentPrice: price,
              retailer: "Unknown",
              priceDropped: false,
            },
          }
        : {},
    };
  }

  if (has("bank", "balance", "transfer", "momo", "paystack", "wallet", "transaction", "statement", "payment")) {
    return {
      extractedText: text,
      category: "finance",
      summary: truncate(firstLine || "Finance"),
      tags: ["finance", "money"],
      metadata: {},
    };
  }

  if (has("restaurant", "menu", "delivery", "uber eats", "doordash", "recipe", "food", "order #")) {
    return {
      extractedText: text,
      category: "food",
      summary: truncate(firstLine || "Food"),
      tags: ["food", "dining"],
      metadata: {},
    };
  }

  if (has("idea", "brainstorm", "notes", "todo", "reminder", "journal", "thought", "inspiration")) {
    return {
      extractedText: text,
      category: "ideas",
      summary: truncate(firstLine || "Idea"),
      tags: ["ideas", "notes"],
      metadata: {},
    };
  }

  if (has("meeting", "roadmap", "deadline", "action item", "standup", "slack", "eng-")) {
    return {
      extractedText: text,
      category: "work",
      summary: truncate(firstLine || "Work note"),
      tags: ["work"],
      metadata: {},
    };
  }

  if (has("message", "text ", "chat", "reply", ":)", "😊", "🤞")) {
    return {
      extractedText: text,
      category: "conversation",
      summary: truncate(firstLine || "Message"),
      tags: ["conversation"],
      metadata: {},
    };
  }

  return {
    extractedText: text,
    category: "unknown",
    summary: truncate(firstLine || "Screenshot"),
    tags: ["screenshot"],
    metadata: {},
  };
}

function truncate(s: string, max = 90): string {
  const clean = s.replace(/\s+/g, " ").trim();
  return clean.length > max ? `${clean.slice(0, max - 1)}…` : clean;
}
