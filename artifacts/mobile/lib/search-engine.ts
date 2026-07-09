import type { Category, Screenshot } from '@/context/ScreenshotsContext';

export type SearchFilter =
  | 'all'
  | 'receipt'
  | 'shopping'
  | 'travel'
  | 'conversation'
  | 'has_price'
  | 'has_promise'
  | 'has_calendar'
  | 'recent_30d';

const SYNONYMS: Record<string, string[]> = {
  receipt: ['invoice', 'bill', 'total', 'subtotal', 'tax', 'paid'],
  shopping: ['cart', 'buy', 'sale', 'discount', 'order', 'nike', 'amazon'],
  travel: ['flight', 'boarding', 'airline', 'hotel', 'booking', 'itinerary'],
  promise: ['will', 'promise', 'tomorrow', 'friday', 'pay you', 'send you'],
  meeting: ['calendar', 'zoom', 'meet', 'appointment', 'conference'],
  price: ['$', 'usd', 'drop', 'was', 'now', 'off'],
};

export function expandSearchTerms(query: string): string[] {
  const base = query
    .toLowerCase()
    .split(/\s+/)
    .map((w) => w.replace(/[^\w$€£₵.-]/g, ''))
    .filter((w) => w.length > 1);

  const expanded = new Set(base);
  for (const word of base) {
    for (const [key, aliases] of Object.entries(SYNONYMS)) {
      if (word === key || aliases.includes(word)) {
        expanded.add(key);
        for (const a of aliases) expanded.add(a);
      }
    }
  }
  return [...expanded];
}

function matchesFilter(shot: Screenshot, filter: SearchFilter): boolean {
  switch (filter) {
    case 'all':
      return true;
    case 'receipt':
      return shot.category === 'receipt';
    case 'shopping':
      return shot.category === 'shopping';
    case 'travel':
      return shot.category === 'travel';
    case 'conversation':
      return shot.category === 'conversation';
    case 'has_price':
      return !!shot.priceTracking;
    case 'has_promise':
      return !!shot.promise;
    case 'has_calendar':
      return !!shot.calendarEvent;
    case 'recent_30d': {
      const age = Date.now() - new Date(shot.capturedAt).getTime();
      return age <= 30 * 24 * 60 * 60 * 1000;
    }
    default: {
      const _exhaustive: never = filter;
      return _exhaustive;
    }
  }
}

function scoreScreenshot(shot: Screenshot, terms: string[]): number {
  if (terms.length === 0) return 0;

  const hay = [
    shot.extractedText,
    shot.summary,
    shot.tags.join(' '),
    shot.category,
    shot.priceTracking?.productName ?? '',
    shot.priceTracking?.retailer ?? '',
    shot.promise?.from ?? '',
    shot.promise?.content ?? '',
    shot.calendarEvent?.title ?? '',
  ]
    .join(' ')
    .toLowerCase();

  let score = 0;
  for (const term of terms) {
    if (!term) continue;
    if (hay.includes(term)) score += term.length > 4 ? 12 : 8;
    if (shot.tags.some((t) => t.toLowerCase().includes(term))) score += 6;
    if (shot.category.includes(term)) score += 4;
  }

  if (shot.priceTracking?.priceDropped) score += 3;
  if (shot.promise) score += 2;

  const ageDays = (Date.now() - new Date(shot.capturedAt).getTime()) / 86_400_000;
  if (ageDays < 7) score += 2;

  return score;
}

/** Semantic-style ranked search — on-device, synonym expansion + scoring. */
export function searchScreenshotsAdvanced(
  screenshots: Screenshot[],
  query: string,
  filter: SearchFilter = 'all',
): Screenshot[] {
  const terms = expandSearchTerms(query);
  const pool = screenshots.filter((s) => matchesFilter(s, filter));

  if (terms.length === 0) {
    return [...pool].sort(
      (a, b) => new Date(b.capturedAt).getTime() - new Date(a.capturedAt).getTime(),
    );
  }

  return pool
    .map((shot) => ({ shot, score: scoreScreenshot(shot, terms) }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score || new Date(b.shot.capturedAt).getTime() - new Date(a.shot.capturedAt).getTime())
    .map(({ shot }) => shot);
}

export const SEARCH_FILTER_LABELS: Record<SearchFilter, string> = {
  all: 'All',
  receipt: 'Receipts',
  shopping: 'Shopping',
  travel: 'Travel',
  conversation: 'Chats',
  has_price: 'Has price',
  has_promise: 'Promises',
  has_calendar: 'Events',
  recent_30d: 'Last 30 days',
};
