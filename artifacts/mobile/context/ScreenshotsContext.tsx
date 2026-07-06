import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type Category = 'shopping' | 'work' | 'travel' | 'receipt' | 'conversation' | 'unknown';

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

export interface Screenshot {
  id: string;
  capturedAt: string;
  category: Category;
  tags: string[];
  extractedText: string;
  summary: string;
  colorHex: string;
  priceTracking?: PriceTracking;
  promise?: PromiseItem;
  calendarEvent?: CalendarEvent;
}

export type InsightType = 'price_drop' | 'price_watch' | 'promise' | 'calendar';

export interface Insight {
  id: string;
  type: InsightType;
  screenshotId: string;
  title: string;
  subtitle: string;
  actionLabel: string;
  urgent: boolean;
  colorHex: string;
  metadata: Record<string, string>;
}

interface ScreenshotsContextType {
  screenshots: Screenshot[];
  isProcessing: boolean;
  processingProgress: number;
  hasOnboarded: boolean;
  isLoading: boolean;
  activeCategory: Category | 'all';
  setActiveCategory: (cat: Category | 'all') => void;
  filteredScreenshots: Screenshot[];
  completeOnboarding: () => void;
  searchScreenshots: (query: string) => Screenshot[];
  getInsights: () => Insight[];
  getScreenshot: (id: string) => Screenshot | undefined;
  totalIndexed: number;
}

const ScreenshotsContext = createContext<ScreenshotsContextType | null>(null);

const now = Date.now();
const day = 86400000;

const MOCK_DATA: Screenshot[] = [
  {
    id: '1',
    capturedAt: new Date(now - 2 * 3600000).toISOString(),
    category: 'shopping',
    tags: ['sneakers', 'nike', 'price-tracked'],
    extractedText:
      'Nike Air Max 270\n$129.99\nSize: 10\n4.7 ★ (2,341 reviews)\nFree 2-day delivery\nAdd to Cart',
    summary: 'Nike Air Max 270 at $129.99 — price dropped from $149.99',
    colorHex: '#FF9F0A',
    priceTracking: {
      productName: 'Nike Air Max 270',
      detectedPrice: '$149.99',
      currentPrice: '$119.99',
      retailer: 'Amazon',
      priceDropped: true,
    },
  },
  {
    id: '2',
    capturedAt: new Date(now - 5 * 3600000).toISOString(),
    category: 'travel',
    tags: ['flight', 'calendar-added', 'delta'],
    extractedText:
      'Booking Confirmed\nDelta Flight DL 4821\nNew York JFK → Los Angeles LAX\nJuly 15, 2026 | 8:30 AM\nGate B27 | Seat 14A\nConfirmation: XKDF92',
    summary: 'Delta DL4821 JFK→LAX on July 15 at 8:30 AM, Gate B27',
    colorHex: '#00D4FF',
    calendarEvent: {
      title: 'Flight DL4821 JFK→LAX',
      date: '2026-07-15',
      time: '8:30 AM',
      location: 'JFK Airport, Gate B27',
    },
  },
  {
    id: '3',
    capturedAt: new Date(now - day).toISOString(),
    category: 'conversation',
    tags: ['promise', 'money', 'follow-up'],
    extractedText:
      "Sarah M.\n\"Hey, I'll send you the $500 for the trip by this Friday. Promise! 🤞\"\nToday 2:34 PM",
    summary: 'Sarah promised $500 by Friday',
    colorHex: '#FF375F',
    promise: {
      from: 'Sarah M.',
      content: 'Send $500 for the trip',
      deadline: 'Friday',
      followUpDate: new Date(now + 3 * day).toISOString(),
    },
  },
  {
    id: '4',
    capturedAt: new Date(now - 2 * day).toISOString(),
    category: 'work',
    tags: ['meeting', 'whiteboard', 'action-items'],
    extractedText:
      'Q3 Roadmap Whiteboard\n\n✓ Launch v2 by Aug 1\n✓ Hire 2 engineers\n□ Close $2M seed round\n□ Reach 10K MAU\n□ Partner with Notion\n\nOwner: Alex\nDeadline: Sept 30',
    summary: 'Q3 roadmap: v2 launch, seed round, 10K MAU by Sept 30',
    colorHex: '#7C72FF',
  },
  {
    id: '5',
    capturedAt: new Date(now - 3 * day).toISOString(),
    category: 'receipt',
    tags: ['whole-foods', 'grocery'],
    extractedText:
      'WHOLE FOODS MARKET\n06/28/2026 10:42 AM\n\nOrganic Avocados 3pk    $6.99\nKombucha 16oz            $4.49\nAlmond Milk              $3.99\nFree-Range Eggs          $7.49\nSourdough Bread          $8.99\n\nSubtotal               $31.95\nTax (6%)                $1.92\nTOTAL                  $33.87',
    summary: 'Whole Foods — $33.87 on June 28',
    colorHex: '#30D158',
  },
  {
    id: '6',
    capturedAt: new Date(now - 4 * day).toISOString(),
    category: 'shopping',
    tags: ['airpods', 'apple', 'price-tracked'],
    extractedText:
      'AirPods Pro (2nd Gen)\nActive Noise Cancellation\n$249.00\nIn Stock · White\nFree shipping with Prime',
    summary: 'AirPods Pro 2nd gen at $249 — watching for price drop',
    colorHex: '#FF9F0A',
    priceTracking: {
      productName: 'AirPods Pro (2nd Gen)',
      detectedPrice: '$249.00',
      currentPrice: '$249.00',
      retailer: 'Amazon',
      priceDropped: false,
    },
  },
  {
    id: '7',
    capturedAt: new Date(now - 5 * day).toISOString(),
    category: 'conversation',
    tags: ['promise', 'promotion', 'work'],
    extractedText:
      "Manager (James)\n\"You've been killing it this quarter. I'll make sure you get that promotion by end of Q3. Let's talk numbers next week.\"\nMonday 9:15 AM",
    summary: 'James promised a promotion by end of Q3',
    colorHex: '#FF375F',
    promise: {
      from: 'James (Manager)',
      content: 'Promotion by end of Q3',
      deadline: 'September 30',
      followUpDate: new Date(now + 85 * day).toISOString(),
    },
  },
  {
    id: '8',
    capturedAt: new Date(now - 6 * day).toISOString(),
    category: 'travel',
    tags: ['hotel', 'nyc', 'calendar-added'],
    extractedText:
      'Marriott Bonvoy\nReservation Confirmed\nNew York Marriott Marquis\nCheck-in: Aug 3, 2026\nCheck-out: Aug 6, 2026\n3 nights · King Room\nRate: $289/night\nTotal: $919.87\nConf #: MAR-8471920',
    summary: 'Marriott NYC Aug 3–6, 3 nights at $289/night',
    colorHex: '#00D4FF',
    calendarEvent: {
      title: 'Hotel: Marriott Marquis NYC',
      date: '2026-08-03',
      time: 'Check-in 3:00 PM',
      location: 'New York Marriott Marquis',
    },
  },
  {
    id: '9',
    capturedAt: new Date(now - 7 * day).toISOString(),
    category: 'work',
    tags: ['slack', 'deadline', 'feature'],
    extractedText:
      '#eng-general\nTaylor: The new feature needs to ship by Friday EOD. Alex owns the API, Jordan owns the frontend. DM me if blocked.\n10:22 AM',
    summary: 'Feature ships Friday — Alex: API, Jordan: frontend',
    colorHex: '#7C72FF',
  },
  {
    id: '10',
    capturedAt: new Date(now - 10 * day).toISOString(),
    category: 'unknown',
    tags: ['plant', 'identified'],
    extractedText:
      'Philodendron Heartleaf\nLow maintenance · Thrives in indirect light\n⚠️ Toxic to cats and dogs\nWater: Every 1–2 weeks',
    summary: 'Philodendron Heartleaf — toxic to cats and dogs',
    colorHex: '#636384',
  },
];

const STORAGE_KEY = 'flux_screenshots_v1';
const ONBOARDED_KEY = 'flux_has_onboarded';

export function ScreenshotsProvider({ children }: { children: React.ReactNode }) {
  const [screenshots, setScreenshots] = useState<Screenshot[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingProgress, setProcessingProgress] = useState(0);
  const [hasOnboarded, setHasOnboarded] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<Category | 'all'>('all');

  useEffect(() => {
    (async () => {
      const [onboarded, stored] = await Promise.all([
        AsyncStorage.getItem(ONBOARDED_KEY),
        AsyncStorage.getItem(STORAGE_KEY),
      ]);
      if (onboarded === 'true') {
        setHasOnboarded(true);
        if (stored) {
          setScreenshots(JSON.parse(stored));
        } else {
          setScreenshots(MOCK_DATA);
        }
      }
      setIsLoading(false);
    })();
  }, []);

  const completeOnboarding = useCallback(async () => {
    setHasOnboarded(true);
    await AsyncStorage.setItem(ONBOARDED_KEY, 'true');
    // Simulate processing animation
    setIsProcessing(true);
    setProcessingProgress(0);
    let progress = 0;
    const interval = setInterval(() => {
      progress += Math.random() * 12 + 4;
      if (progress >= 100) {
        progress = 100;
        clearInterval(interval);
        setTimeout(() => {
          setIsProcessing(false);
          setScreenshots(MOCK_DATA);
          AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(MOCK_DATA));
        }, 400);
      }
      setProcessingProgress(Math.min(progress, 100));
    }, 120);
  }, []);

  const filteredScreenshots =
    activeCategory === 'all'
      ? screenshots
      : screenshots.filter((s) => s.category === activeCategory);

  const searchScreenshots = useCallback(
    (query: string): Screenshot[] => {
      if (!query.trim()) return [];
      const q = query.toLowerCase();
      return screenshots.filter(
        (s) =>
          s.extractedText.toLowerCase().includes(q) ||
          s.summary.toLowerCase().includes(q) ||
          s.tags.some((t) => t.toLowerCase().includes(q)) ||
          s.category.toLowerCase().includes(q),
      );
    },
    [screenshots],
  );

  const getInsights = useCallback((): Insight[] => {
    const insights: Insight[] = [];
    for (const s of screenshots) {
      if (s.priceTracking?.priceDropped) {
        const pt = s.priceTracking;
        const old = parseFloat(pt.detectedPrice.replace('$', ''));
        const cur = parseFloat(pt.currentPrice.replace('$', ''));
        const savings = (old - cur).toFixed(2);
        insights.push({
          id: `price_drop_${s.id}`,
          type: 'price_drop',
          screenshotId: s.id,
          title: `Price dropped on ${pt.productName}`,
          subtitle: `${pt.currentPrice} (was ${pt.detectedPrice}) — save $${savings} on ${pt.retailer}`,
          actionLabel: 'View Deal',
          urgent: true,
          colorHex: '#FF9F0A',
          metadata: { savings: `$${savings}`, retailer: pt.retailer },
        });
      } else if (s.priceTracking && !s.priceTracking.priceDropped) {
        const pt = s.priceTracking;
        insights.push({
          id: `price_watch_${s.id}`,
          type: 'price_watch',
          screenshotId: s.id,
          title: `Watching: ${pt.productName}`,
          subtitle: `Currently ${pt.currentPrice} on ${pt.retailer} — you'll be notified of drops`,
          actionLabel: 'View',
          urgent: false,
          colorHex: '#FF9F0A',
          metadata: { price: pt.currentPrice },
        });
      }
      if (s.promise) {
        const followUp = new Date(s.promise.followUpDate);
        const daysUntil = Math.ceil((followUp.getTime() - Date.now()) / day);
        const isUrgent = daysUntil <= 3;
        insights.push({
          id: `promise_${s.id}`,
          type: 'promise',
          screenshotId: s.id,
          title: `Follow up with ${s.promise.from}`,
          subtitle: `"${s.promise.content}" — due ${s.promise.deadline}`,
          actionLabel: daysUntil < 0 ? 'Overdue' : `${daysUntil}d left`,
          urgent: isUrgent,
          colorHex: '#FF375F',
          metadata: { from: s.promise.from, deadline: s.promise.deadline },
        });
      }
      if (s.calendarEvent) {
        const eventDate = new Date(s.calendarEvent.date);
        const daysUntil = Math.ceil((eventDate.getTime() - Date.now()) / day);
        if (daysUntil >= 0) {
          insights.push({
            id: `calendar_${s.id}`,
            type: 'calendar',
            screenshotId: s.id,
            title: s.calendarEvent.title,
            subtitle: `${s.calendarEvent.date}${s.calendarEvent.time ? ' · ' + s.calendarEvent.time : ''}${s.calendarEvent.location ? '\n' + s.calendarEvent.location : ''}`,
            actionLabel: daysUntil === 0 ? 'Today' : `${daysUntil}d away`,
            urgent: daysUntil <= 2,
            colorHex: '#00D4FF',
            metadata: { daysUntil: String(daysUntil) },
          });
        }
      }
    }
    // urgent first
    return insights.sort((a, b) => Number(b.urgent) - Number(a.urgent));
  }, [screenshots]);

  const getScreenshot = useCallback(
    (id: string) => screenshots.find((s) => s.id === id),
    [screenshots],
  );

  return (
    <ScreenshotsContext.Provider
      value={{
        screenshots,
        isProcessing,
        processingProgress,
        hasOnboarded,
        isLoading,
        activeCategory,
        setActiveCategory,
        filteredScreenshots,
        completeOnboarding,
        searchScreenshots,
        getInsights,
        getScreenshot,
        totalIndexed: screenshots.length,
      }}
    >
      {children}
    </ScreenshotsContext.Provider>
  );
}

export function useScreenshots() {
  const ctx = useContext(ScreenshotsContext);
  if (!ctx) throw new Error('useScreenshots must be used within ScreenshotsProvider');
  return ctx;
}
