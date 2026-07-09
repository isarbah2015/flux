import type { Category } from '@/constants/categories';
import { buildScreenshotTitle } from '@/lib/screenshot-title';
import {
  extractCalendarEvent,
  extractPrice,
  extractPromise,
  extractRetailer,
} from '@/lib/text-metadata';

export interface PriceTracking {
  productName: string;
  detectedPrice: string;
  currentPrice: string;
  retailer: string;
  priceDropped: boolean;
}

export interface PromiseItem {
  from: string;
  content: string;
  deadline: string;
  followUpDate: string;
}

export interface CalendarEvent {
  title: string;
  date: string;
  time?: string;
  location?: string;
}

export interface ScreenshotMetadata {
  priceTracking?: PriceTracking;
  promise?: PromiseItem;
  calendarEvent?: CalendarEvent;
}

export interface OnDeviceClassification {
  extractedText: string;
  category: Category;
  summary: string;
  tags: string[];
  colorHex: string;
  metadata: ScreenshotMetadata;
}

export interface ClassifyOptions {
  filename?: string | null;
  capturedAt?: string;
}

const CATEGORY_COLORS: Record<Category, string> = {
  shopping: '#FF9F0A',
  work: '#7C72FF',
  travel: '#00D4FF',
  receipt: '#30D158',
  conversation: '#FF375F',
  ideas: '#BF5AF2',
  finance: '#FFD60A',
  food: '#FF6482',
  unknown: '#636384',
};

/** On-device keyword classifier — mirrors server fallback, zero network. */
export function classifyOnDevice(text: string, options?: ClassifyOptions): OnDeviceClassification {
  const t = text.toLowerCase();
  const has = (...words: string[]) => words.some((w) => t.includes(w));
  const firstLine = text.split('\n').find((l) => l.trim())?.trim() ?? '';
  const fallbackSummary = buildScreenshotTitle(text, {
    filename: options?.filename,
    capturedAt: options?.capturedAt,
  });

  if (has('total', 'subtotal', 'tax', 'receipt', 'invoice') && /(?:\$|₵|€|£)\s?\d/.test(text)) {
    return pack('receipt', text, truncate(firstLine || fallbackSummary), ['receipt', 'purchase'], {});
  }

  if (has('flight', 'gate', 'boarding', 'hotel', 'check-in', 'reservation', 'itinerary', 'airline', 'passport')) {
    const summary = truncate(firstLine || fallbackSummary);
    return pack('travel', text, summary, ['travel', 'booking'], {
      calendarEvent: extractCalendarEvent(text, summary, 'travel') ?? undefined,
    });
  }

  const promise = extractPromise(text, firstLine);
  if (promise) {
    return pack('conversation', text, truncate(firstLine || fallbackSummary), ['conversation', 'promise'], {
      promise,
    });
  }

  if (
    has('add to cart', 'in stock', 'free shipping', 'reviews', 'buy now', 'amazon', 'ebay', 'price drop') ||
    /(?:\$|₵|€|£)\s?\d/.test(text)
  ) {
    const price = extractPrice(text);
    const summary = truncate(firstLine || fallbackSummary);
    return pack('shopping', text, summary, ['shopping', 'deal'], {
      ...(price
        ? {
            priceTracking: {
              productName: summary,
              detectedPrice: price,
              currentPrice: price,
              retailer: extractRetailer(text),
              priceDropped: /\bprice\s?drop|was\s+(?:\$|₵|€|£)/i.test(text),
            },
          }
        : {}),
    });
  }

  if (has('bank', 'balance', 'transfer', 'momo', 'paystack', 'wallet', 'transaction', 'statement', 'payment')) {
    return pack('finance', text, truncate(firstLine || fallbackSummary), ['finance', 'money'], {});
  }

  if (has('restaurant', 'menu', 'delivery', 'uber eats', 'doordash', 'recipe', 'food', 'order #')) {
    return pack('food', text, truncate(firstLine || fallbackSummary), ['food', 'dining'], {});
  }

  if (has('idea', 'brainstorm', 'notes', 'todo', 'reminder', 'journal', 'thought', 'inspiration')) {
    return pack('ideas', text, truncate(firstLine || fallbackSummary), ['ideas', 'notes'], {});
  }

  if (has('meeting', 'roadmap', 'deadline', 'action item', 'standup', 'slack', 'eng-', 'sprint', 'jira', 'zoom')) {
    const summary = truncate(firstLine || fallbackSummary);
    return pack('work', text, summary, ['work', 'productivity'], {
      calendarEvent: extractCalendarEvent(text, summary, 'work') ?? undefined,
    });
  }

  if (has('message', 'text ', 'chat', 'reply', 'whatsapp', 'imessage', 'telegram', 'dm', '😊', '🤞')) {
    return pack('conversation', text, truncate(firstLine || fallbackSummary), ['conversation', 'messages'], {});
  }

  const tags = text.trim() ? ['screenshot'] : ['uncategorized'];
  return pack('unknown', text, fallbackSummary, tags, {});
}

function pack(
  category: Category,
  extractedText: string,
  summary: string,
  tags: string[],
  metadata: ScreenshotMetadata,
): OnDeviceClassification {
  return {
    extractedText,
    category,
    summary,
    tags,
    metadata,
    colorHex: CATEGORY_COLORS[category],
  };
}

function truncate(s: string, max = 90): string {
  const clean = s.replace(/\s+/g, ' ').trim();
  return clean.length > max ? `${clean.slice(0, max - 1)}…` : clean;
}
