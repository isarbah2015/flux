import type { CalendarEvent, PromiseItem } from '@/lib/on-device-classifier';

const DAY_MS = 86_400_000;

const MONTHS: Record<string, number> = {
  jan: 0,
  january: 0,
  feb: 1,
  february: 1,
  mar: 2,
  march: 2,
  apr: 3,
  april: 3,
  may: 4,
  jun: 5,
  june: 5,
  jul: 6,
  july: 6,
  aug: 7,
  august: 7,
  sep: 8,
  sept: 8,
  september: 8,
  oct: 9,
  october: 9,
  nov: 10,
  november: 10,
  dec: 11,
  december: 11,
};

const RETAILER_PATTERNS: { pattern: RegExp; name: string }[] = [
  { pattern: /amazon\.com|amazon/i, name: 'Amazon' },
  { pattern: /ebay\.com|ebay/i, name: 'eBay' },
  { pattern: /walmart/i, name: 'Walmart' },
  { pattern: /target\.com|target/i, name: 'Target' },
  { pattern: /best\s?buy/i, name: 'Best Buy' },
  { pattern: /aliexpress/i, name: 'AliExpress' },
  { pattern: /jumia/i, name: 'Jumia' },
  { pattern: /shopify/i, name: 'Shopify' },
  { pattern: /etsy/i, name: 'Etsy' },
  { pattern: /nike\.com|nike/i, name: 'Nike' },
  { pattern: /apple\.com/i, name: 'Apple' },
];

export function extractPrice(text: string): string | null {
  const match = text.match(/(?:\$|₵|€|£|GH₵)\s?\d[\d,]*(?:\.\d{2})?/);
  return match?.[0]?.replace(/\s/g, '') ?? null;
}

export function parsePriceAmount(price: string): number | null {
  const digits = price.replace(/[^\d.]/g, '');
  const n = parseFloat(digits);
  return Number.isFinite(n) ? n : null;
}

export function extractRetailer(text: string): string {
  for (const { pattern, name } of RETAILER_PATTERNS) {
    if (pattern.test(text)) return name;
  }
  const urlMatch = text.match(/https?:\/\/(?:www\.)?([a-z0-9-]+)\./i);
  if (urlMatch?.[1]) {
    const host = urlMatch[1];
    if (host !== 'google' && host !== 'www') {
      return host.charAt(0).toUpperCase() + host.slice(1);
    }
  }
  return 'Unknown';
}

export function normalizeProductKey(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 80);
}

function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

function toIsoDate(y: number, m: number, d: number): string {
  return `${y}-${pad2(m + 1)}-${pad2(d)}`;
}

function parseExplicitDate(text: string, ref = new Date()): string | null {
  const iso = text.match(/\b(20\d{2})-(\d{2})-(\d{2})\b/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;

  const slash = text.match(/\b(\d{1,2})[\/\-](\d{1,2})[\/\-](20\d{2}|\d{2})\b/);
  if (slash) {
    let y = parseInt(slash[3], 10);
    if (y < 100) y += 2000;
    const a = parseInt(slash[1], 10);
    const b = parseInt(slash[2], 10);
    const month = a > 12 ? b - 1 : a - 1;
    const day = a > 12 ? a : b;
    return toIsoDate(y, month, day);
  }

  const named = text.match(
    /\b(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\s+(\d{1,2})(?:,?\s+(20\d{2}))?\b/i,
  );
  if (named) {
    const month = MONTHS[named[1].toLowerCase()];
    const day = parseInt(named[2], 10);
    const year = named[3] ? parseInt(named[3], 10) : ref.getFullYear();
    return toIsoDate(year, month, day);
  }

  return null;
}

export function extractTime(text: string): string | undefined {
  const t12 = text.match(/\b(\d{1,2}):(\d{2})\s?(am|pm)\b/i);
  if (t12) return `${t12[1]}:${t12[2]} ${t12[3].toUpperCase()}`;
  const t24 = text.match(/\b([01]?\d|2[0-3]):([0-5]\d)\b/);
  if (t24) return `${t24[1]}:${t24[2]}`;
  return undefined;
}

export function parseRelativeDeadline(text: string, ref = new Date()): Date {
  const lower = text.toLowerCase();
  const result = new Date(ref);

  if (/today/.test(lower)) return result;
  if (/tomorrow/.test(lower)) {
    result.setDate(result.getDate() + 1);
    return result;
  }
  if (/next week/.test(lower)) {
    result.setDate(result.getDate() + 7);
    return result;
  }

  const weekdayMatch = lower.match(
    /\b(?:by\s+|on\s+)?(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/,
  );
  if (weekdayMatch) {
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const target = days.indexOf(weekdayMatch[1]);
    const current = result.getDay();
    let delta = target - current;
    if (delta <= 0) delta += 7;
    result.setDate(result.getDate() + delta);
    return result;
  }

  const inDays = lower.match(/\bin\s+(\d+)\s+days?\b/);
  if (inDays) {
    result.setDate(result.getDate() + parseInt(inDays[1], 10));
    return result;
  }

  const explicit = parseExplicitDate(text, ref);
  if (explicit) return new Date(`${explicit}T12:00:00`);

  result.setDate(result.getDate() + 3);
  return result;
}

export function extractPromise(text: string, firstLine: string): PromiseItem | null {
  const lower = text.toLowerCase();
  const hasPromise =
    /\b(promise|i'll send|i will send|i owe|i'll pay|i will pay|i'll get you|will send|let me know when)\b/.test(
      lower,
    ) || /\bby\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday|tomorrow|next week)\b/.test(lower);

  if (!hasPromise) return null;

  const deadlineDate = parseRelativeDeadline(text);
  const followUp = new Date(deadlineDate.getTime() - DAY_MS);
  if (followUp.getTime() < Date.now()) {
    followUp.setTime(Date.now() + 12 * 60 * 60 * 1000);
  }

  const deadlineLabel =
    parseExplicitDate(text) ??
    deadlineDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

  return {
    from: firstLine.slice(0, 40) || 'Someone',
    content: text.replace(/\s+/g, ' ').trim().slice(0, 120),
    deadline: deadlineLabel,
    followUpDate: followUp.toISOString(),
  };
}

export function extractCalendarEvent(
  text: string,
  firstLine: string,
  category: 'travel' | 'work' | 'food' | 'finance' | 'shopping' | 'conversation' | 'receipt' | 'ideas' | 'unknown',
): CalendarEvent | null {
  const lower = text.toLowerCase();
  const travelish =
    category === 'travel' ||
    /\b(flight|gate|boarding|departure|arrival|hotel|check-?in|reservation|itinerary|terminal)\b/.test(lower);
  const workish =
    category === 'work' ||
    /\b(meeting|standup|sync|interview|appointment|call with|zoom|teams)\b/.test(lower);

  if (!travelish && !workish) return null;

  const date = parseExplicitDate(text) ?? toIsoDate(new Date().getFullYear(), new Date().getMonth(), new Date().getDate() + 1);
  const time = extractTime(text);
  const locationMatch = text.match(/\b(?:at|@|venue:?)\s+([A-Za-z0-9][^\n]{2,48})/i);

  let title = firstLine.slice(0, 80) || (travelish ? 'Travel booking' : 'Meeting');
  const flight = text.match(/\b([A-Z]{2}\s?\d{2,4})\b/);
  if (flight && travelish) title = `Flight ${flight[1].replace(/\s/g, '')}`;

  return {
    title,
    date,
    time,
    location: locationMatch?.[1]?.trim(),
  };
}
