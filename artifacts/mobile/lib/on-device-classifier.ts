import type { Category } from '@/context/ScreenshotsContext';

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

const CATEGORY_COLORS: Record<Category, string> = {
  shopping: '#FF9F0A',
  work: '#7C72FF',
  travel: '#00D4FF',
  receipt: '#30D158',
  conversation: '#FF375F',
  unknown: '#636384',
};

const DAY_MS = 86_400_000;

/** On-device keyword classifier — mirrors server fallback, zero network. */
export function classifyOnDevice(text: string): OnDeviceClassification {
  const t = text.toLowerCase();
  const has = (...words: string[]) => words.some((w) => t.includes(w));
  const firstLine = text.split('\n').find((l) => l.trim())?.trim() ?? '';

  if (has('total', 'subtotal', 'tax', 'receipt') && /\$\s?\d|₵\s?\d|€\s?\d/.test(text)) {
    return pack('receipt', text, truncate(firstLine || 'Receipt'), ['receipt', 'purchase'], {});
  }

  if (has('flight', 'gate', 'boarding', 'hotel', 'check-in', 'reservation', 'itinerary')) {
    return pack('travel', text, truncate(firstLine || 'Travel booking'), ['travel', 'booking'], {});
  }

  if (
    has(
      'promise',
      "i'll send",
      'i will send',
      'by friday',
      'next week',
      'i owe',
      "i'll get you",
      "i'll pay",
    )
  ) {
    return pack('conversation', text, truncate(firstLine || 'Message'), ['conversation', 'promise'], {
      promise: {
        from: firstLine || 'Someone',
        content: truncate(text, 80),
        deadline: 'soon',
        followUpDate: new Date(Date.now() + 3 * DAY_MS).toISOString(),
      },
    });
  }

  if (
    has('add to cart', 'in stock', 'free shipping', 'reviews', 'buy now') ||
    /\$\s?\d|₵\s?\d/.test(text)
  ) {
    const price = text.match(/(?:\$|₵|€)\s?\d[\d,]*(?:\.\d{2})?/)?.[0]?.replace(/\s/g, '');
    return pack('shopping', text, truncate(firstLine || 'Product'), ['shopping'], {
      ...(price
        ? {
            priceTracking: {
              productName: truncate(firstLine || 'Product', 60),
              detectedPrice: price,
              currentPrice: price,
              retailer: 'Unknown',
              priceDropped: false,
            },
          }
        : {}),
    });
  }

  if (has('meeting', 'roadmap', 'deadline', 'action item', 'standup', 'slack', 'eng-')) {
    return pack('work', text, truncate(firstLine || 'Work note'), ['work'], {});
  }

  if (has('message', 'text ', 'chat', 'reply', ':)', '😊', '🤞', 'whatsapp', 'imessage')) {
    return pack('conversation', text, truncate(firstLine || 'Message'), ['conversation'], {});
  }

  return pack('unknown', text, truncate(firstLine || 'Screenshot'), ['misc'], {});
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
