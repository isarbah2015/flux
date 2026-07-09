import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Screenshot } from '@/context/ScreenshotsContext';

const SAVINGS_KEY = 'flux_total_savings_usd';
const SEARCH_COUNT_KEY = 'flux_search_count';
const FIRST_OPEN_KEY = 'flux_first_open_at';

export interface PrivacyStats {
  totalIndexed: number;
  onDeviceOnly: number;
  withText: number;
  withInsights: number;
  uploadedCount: number;
  totalWords: number;
  oldestCaptured: string | null;
  newestCaptured: string | null;
}

export interface DuplicateGroup {
  fingerprint: string;
  screenshots: Screenshot[];
}

export interface MonthlyReceiptSpend {
  month: string;
  label: string;
  totalUsd: number;
  count: number;
}

export interface FluxDashboard {
  privacy: PrivacyStats;
  totalSavingsUsd: number;
  searchCount: number;
  memberSince: string | null;
  duplicates: DuplicateGroup[];
  receiptSpend: MonthlyReceiptSpend[];
  insightCounts: Record<string, number>;
}

function parseMoney(text: string): number | null {
  const m = text.match(/(?:\$|USD)\s?(\d[\d,]*(?:\.\d{2})?)/i);
  if (!m) return null;
  return Number.parseFloat(m[1].replace(/,/g, ''));
}

function fingerprint(shot: Screenshot): string {
  const core = shot.extractedText
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 120);
  return core || shot.summary.toLowerCase().slice(0, 80);
}

export function findDuplicateGroups(screenshots: Screenshot[]): DuplicateGroup[] {
  const map = new Map<string, Screenshot[]>();
  for (const shot of screenshots) {
    const fp = fingerprint(shot);
    if (fp.length < 12) continue;
    const list = map.get(fp) ?? [];
    list.push(shot);
    map.set(fp, list);
  }
  return [...map.entries()]
    .filter(([, list]) => list.length > 1)
    .map(([fp, list]) => ({ fingerprint: fp, screenshots: list }));
}

export function computeReceiptSpend(screenshots: Screenshot[]): MonthlyReceiptSpend[] {
  const byMonth = new Map<string, MonthlyReceiptSpend>();

  for (const shot of screenshots) {
    if (shot.category !== 'receipt' && !shot.tags.includes('receipt')) continue;
    const amount =
      parseMoney(shot.extractedText) ??
      parseMoney(shot.summary) ??
      parseMoney(shot.priceTracking?.detectedPrice ?? '');
    if (amount == null) continue;

    const d = new Date(shot.capturedAt);
    const month = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const label = d.toLocaleDateString(undefined, { month: 'short', year: 'numeric' });
    const row = byMonth.get(month) ?? { month, label, totalUsd: 0, count: 0 };
    row.totalUsd += amount;
    row.count += 1;
    byMonth.set(month, row);
  }

  return [...byMonth.values()].sort((a, b) => b.month.localeCompare(a.month)).slice(0, 6);
}

export function computePrivacyStats(screenshots: Screenshot[]): PrivacyStats {
  let withText = 0;
  let withInsights = 0;
  let totalWords = 0;
  let oldest: number | null = null;
  let newest: number | null = null;

  for (const s of screenshots) {
    if (s.extractedText.trim()) {
      withText += 1;
      totalWords += s.extractedText.trim().split(/\s+/).length;
    }
    if (s.priceTracking || s.promise || s.calendarEvent) withInsights += 1;
    const t = new Date(s.capturedAt).getTime();
    if (oldest == null || t < oldest) oldest = t;
    if (newest == null || t > newest) newest = t;
  }

  return {
    totalIndexed: screenshots.length,
    onDeviceOnly: screenshots.length,
    withText,
    withInsights,
    uploadedCount: 0,
    totalWords,
    oldestCaptured: oldest ? new Date(oldest).toISOString() : null,
    newestCaptured: newest ? new Date(newest).toISOString() : null,
  };
}

export function computeInsightCounts(screenshots: Screenshot[]): Record<string, number> {
  const counts: Record<string, number> = {
    price_drop: 0,
    price_watch: 0,
    promise: 0,
    calendar: 0,
  };
  for (const s of screenshots) {
    if (s.priceTracking?.priceDropped) counts.price_drop += 1;
    else if (s.priceTracking) counts.price_watch += 1;
    if (s.promise) counts.promise += 1;
    if (s.calendarEvent) counts.calendar += 1;
  }
  return counts;
}

export async function recordSavingsUsd(amount: number): Promise<number> {
  if (!Number.isFinite(amount) || amount <= 0) return getTotalSavingsUsd();
  const prev = await getTotalSavingsUsd();
  const next = Math.round((prev + amount) * 100) / 100;
  await AsyncStorage.setItem(SAVINGS_KEY, String(next));
  return next;
}

export async function getTotalSavingsUsd(): Promise<number> {
  const raw = await AsyncStorage.getItem(SAVINGS_KEY);
  return raw ? Number.parseFloat(raw) || 0 : 0;
}

export async function incrementSearchCount(): Promise<number> {
  const raw = await AsyncStorage.getItem(SEARCH_COUNT_KEY);
  const next = (raw ? Number.parseInt(raw, 10) : 0) + 1;
  await AsyncStorage.setItem(SEARCH_COUNT_KEY, String(next));
  return next;
}

export async function getSearchCount(): Promise<number> {
  const raw = await AsyncStorage.getItem(SEARCH_COUNT_KEY);
  return raw ? Number.parseInt(raw, 10) : 0;
}

export async function ensureMemberSince(): Promise<string> {
  const existing = await AsyncStorage.getItem(FIRST_OPEN_KEY);
  if (existing) return existing;
  const now = new Date().toISOString();
  await AsyncStorage.setItem(FIRST_OPEN_KEY, now);
  return now;
}

export async function buildFluxDashboard(screenshots: Screenshot[]): Promise<FluxDashboard> {
  const [totalSavingsUsd, searchCount, memberSince] = await Promise.all([
    getTotalSavingsUsd(),
    getSearchCount(),
    ensureMemberSince(),
  ]);

  return {
    privacy: computePrivacyStats(screenshots),
    totalSavingsUsd,
    searchCount,
    memberSince,
    duplicates: findDuplicateGroups(screenshots),
    receiptSpend: computeReceiptSpend(screenshots),
    insightCounts: computeInsightCounts(screenshots),
  };
}
