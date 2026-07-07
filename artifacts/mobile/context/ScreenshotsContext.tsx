import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { AppState, Platform, type AppStateStatus } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQueryClient } from '@tanstack/react-query';
import {
  useGetScreenshots,
  useCreateScreenshot,
  getGetScreenshotsQueryKey,
  type Screenshot as ApiScreenshot,
} from '@workspace/api-client-react';
import { useAuth } from '@/context/AuthContext';
import {
  discoverNewScreenshots,
  getScreenshotAssetUri,
  markAssetsIndexed,
} from '@/lib/screenshot-scanner';
import {
  getAllLocalScreenshots,
  initLocalDb,
  markLocalSynced,
  searchLocalScreenshots,
} from '@/lib/local-db';
import {
  localRowToScreenshot,
  processScreenshotOnDevice,
} from '@/lib/screenshot-pipeline';
import type { LocalScreenshotRow } from '@/lib/local-db';

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
  imageUri?: string | null;
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

export interface NewScreenshot {
  extractedText?: string;
  imageBase64?: string | null;
  imageUri?: string | null;
  category?: Category;
}

export type ScanStatus = 'idle' | 'scanning' | 'denied' | 'done';

interface ScreenshotsContextType {
  screenshots: Screenshot[];
  isImporting: boolean;
  isScanning: boolean;
  scanStatus: ScanStatus;
  scanMessage: string | null;
  scanProgress: { done: number; total: number } | null;
  hasOnboarded: boolean;
  onboardingChecked: boolean;
  isLoading: boolean;
  error: unknown;
  activeCategory: Category | 'all';
  setActiveCategory: (cat: Category | 'all') => void;
  filteredScreenshots: Screenshot[];
  completeOnboarding: () => void;
  addScreenshot: (input: NewScreenshot) => Promise<Screenshot>;
  refresh: () => void;
  scanDeviceScreenshots: () => Promise<void>;
  searchScreenshots: (query: string) => Screenshot[];
  searchScreenshotsFts: (query: string) => Promise<Screenshot[]>;
  getInsights: () => Insight[];
  getScreenshot: (id: string) => Screenshot | undefined;
  totalIndexed: number;
}

const ScreenshotsContext = createContext<ScreenshotsContextType | null>(null);

const ONBOARDED_KEY = 'flux_has_onboarded';
const day = 86400000;

/** Map the API screenshot shape onto the flattened shape the UI consumes. */
function fromApi(s: ApiScreenshot): Screenshot {
  return {
    id: s.id,
    imageUri: s.imageUri ?? null,
    capturedAt: s.capturedAt,
    category: s.category as Category,
    tags: s.tags,
    extractedText: s.extractedText,
    summary: s.summary,
    colorHex: s.colorHex,
    priceTracking: s.metadata?.priceTracking,
    promise: s.metadata?.promise,
    calendarEvent: s.metadata?.calendarEvent,
  };
}

export function ScreenshotsProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const { authEnabled, isReady: authReady, user } = useAuth();
  const [hasOnboarded, setHasOnboarded] = useState(false);
  const [onboardingChecked, setOnboardingChecked] = useState(false);
  const [activeCategory, setActiveCategory] = useState<Category | 'all'>('all');
  const [isScanning, setIsScanning] = useState(false);
  const [scanStatus, setScanStatus] = useState<ScanStatus>('idle');
  const [scanMessage, setScanMessage] = useState<string | null>(null);
  const [scanProgress, setScanProgress] = useState<{ done: number; total: number } | null>(null);
  const [localScreenshots, setLocalScreenshots] = useState<Screenshot[]>([]);
  const [localReady, setLocalReady] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const scanInFlight = useRef(false);
  const hasBootstrappedScan = useRef(false);

  // Fetch only once onboarded and (when auth is on) signed in.
  const canFetch = hasOnboarded && (!authEnabled || (authReady && !!user));

  useEffect(() => {
    (async () => {
      const onboarded = await AsyncStorage.getItem(ONBOARDED_KEY);
      setHasOnboarded(onboarded === 'true');
      setOnboardingChecked(true);
    })();
  }, []);

  useEffect(() => {
    void (async () => {
      try {
        await initLocalDb();
        const rows = await getAllLocalScreenshots();
        setLocalScreenshots(rows);
      } catch (err) {
        if (__DEV__) {
          // eslint-disable-next-line no-console
          console.warn('[Flux] local DB unavailable — continuing without on-device store:', err);
        }
      } finally {
        setLocalReady(true);
      }
    })();
  }, []);

  const query = useGetScreenshots(undefined, {
    query: {
      enabled: canFetch,
      queryKey: getGetScreenshotsQueryKey(),
      staleTime: 60_000,
      gcTime: 5 * 60_000,
    },
  });
  const createMutation = useCreateScreenshot();

  const syncRowToApi = useCallback(
    async (row: LocalScreenshotRow) => {
      try {
        await createMutation.mutateAsync({
          data: {
            extractedText: row.extractedText,
            imageUri: row.imageUri,
            category: row.category,
            capturedAt: row.capturedAt,
          },
        });
        await markLocalSynced(row.id);
      } catch {
        // Offline or API unreachable — local copy is still valid.
      }
    },
    [createMutation],
  );

  const screenshots = useMemo<Screenshot[]>(() => {
    const api = (query.data ?? []).map(fromApi);
    const byId = new Map<string, Screenshot>();
    for (const s of api) byId.set(s.id, s);
    for (const s of localScreenshots) byId.set(s.id, s);
    return Array.from(byId.values()).sort(
      (a, b) => new Date(b.capturedAt).getTime() - new Date(a.capturedAt).getTime(),
    );
  }, [localScreenshots, query.data]);

  const refreshLocal = useCallback(async () => {
    const rows = await getAllLocalScreenshots();
    setLocalScreenshots(rows);
  }, []);

  const completeOnboarding = useCallback(async () => {
    setHasOnboarded(true);
    await AsyncStorage.setItem(ONBOARDED_KEY, 'true');
  }, []);

  const addScreenshot = useCallback(
    async (input: NewScreenshot): Promise<Screenshot> => {
      if (!input.imageUri && !input.extractedText?.trim()) {
        throw new Error('Choose a screenshot or add text so Flux can classify it.');
      }

      setIsProcessing(true);
      try {
        const row = await processScreenshotOnDevice({
          imageUri: input.imageUri,
          extractedText: input.extractedText,
        });
        const shot = localRowToScreenshot(row);
        setLocalScreenshots((prev) => [shot, ...prev.filter((s) => s.id !== shot.id)]);
        void syncRowToApi(row);
        return shot;
      } finally {
        setIsProcessing(false);
      }
    },
    [syncRowToApi],
  );

  const scanDeviceScreenshots = useCallback(async () => {
    if (scanInFlight.current || !canFetch || Platform.OS === 'web') return;

    scanInFlight.current = true;
    setIsScanning(true);
    setScanStatus('scanning');
    setScanMessage('Looking for screenshots on your device…');
    setScanProgress(null);

    let totalImported = 0;
    let deviceTotal = 0;

    try {
      const MAX_ROUNDS = 12;

      for (let round = 0; round < MAX_ROUNDS; round += 1) {
        const { permission, newAssets, candidates, totalOnDevice } =
          await discoverNewScreenshots();

        deviceTotal = totalOnDevice;

        if (permission === 'unavailable') {
          setScanStatus('denied');
          setScanMessage(
            'Auto-scan needs a development build on Android. Tap + to import screenshots manually.',
          );
          return;
        }

        if (permission === 'denied') {
          setScanStatus('denied');
          setScanMessage('Allow photo access so Flux can find your screenshots.');
          return;
        }

        if (newAssets.length === 0) {
          break;
        }

        setScanProgress({ done: totalImported, total: totalOnDevice });
        setScanMessage(
          totalOnDevice > 0
            ? `Importing screenshots… ${totalImported} of ${totalOnDevice}`
            : 'Importing screenshots…',
        );

        const indexedIds: string[] = [];
        let roundFailed = 0;

        for (const asset of newAssets) {
          const uri = await getScreenshotAssetUri(asset);
          if (!uri) {
            roundFailed += 1;
            continue;
          }

          try {
            const row = await processScreenshotOnDevice({
              imageUri: uri,
              localAssetId: asset.id,
              capturedAt: new Date(asset.creationTime).toISOString(),
            });
            const shot = localRowToScreenshot(row);
            setLocalScreenshots((prev) => [shot, ...prev.filter((s) => s.id !== shot.id)]);
            totalImported += 1;
            indexedIds.push(asset.id);
            setScanProgress({ done: totalImported, total: totalOnDevice });
            setScanMessage(`Importing screenshots… ${totalImported} of ${totalOnDevice}`);
            void syncRowToApi(row);
          } catch {
            roundFailed += 1;
          }
        }

        if (indexedIds.length > 0) {
          await markAssetsIndexed(indexedIds);
        }

        if (candidates <= newAssets.length || roundFailed === newAssets.length) {
          break;
        }
      }

      setScanStatus('done');
      if (totalImported > 0) {
        setScanMessage(
          `Imported ${totalImported} screenshot${totalImported === 1 ? '' : 's'} from your library.`,
        );
      } else if (deviceTotal > 0) {
        setScanMessage(`${deviceTotal} screenshots found — all already indexed.`);
      } else {
        setScanMessage(null);
      }
    } finally {
      setIsScanning(false);
      setScanProgress(null);
      scanInFlight.current = false;
    }
  }, [canFetch, syncRowToApi]);

  // Scan as soon as local DB is ready — no need to wait for API.
  useEffect(() => {
    if (!canFetch || Platform.OS === 'web' || !localReady || hasBootstrappedScan.current) {
      return;
    }
    hasBootstrappedScan.current = true;
    void scanDeviceScreenshots();
  }, [canFetch, localReady, scanDeviceScreenshots]);

  useEffect(() => {
    if (!canFetch || Platform.OS === 'web') return;

    const onAppState = (state: AppStateStatus) => {
      if (state === 'active') {
        void scanDeviceScreenshots();
      }
    };

    const subscription = AppState.addEventListener('change', onAppState);
    return () => subscription.remove();
  }, [canFetch, scanDeviceScreenshots]);

  const refresh = useCallback(() => {
    void refreshLocal();
    queryClient.invalidateQueries({ queryKey: getGetScreenshotsQueryKey() });
  }, [queryClient, refreshLocal]);

  const filteredScreenshots =
    activeCategory === 'all'
      ? screenshots
      : screenshots.filter((s) => s.category === activeCategory);

  const searchScreenshotsFts = useCallback(
    async (q: string): Promise<Screenshot[]> => {
      if (!q.trim()) return [];
      try {
        return await searchLocalScreenshots(q);
      } catch {
        // Local store unavailable — fall back to in-memory filter over merged data.
        const needle = q.toLowerCase();
        return screenshots.filter(
          (s) =>
            s.extractedText.toLowerCase().includes(needle) ||
            s.summary.toLowerCase().includes(needle) ||
            s.tags.some((t) => t.toLowerCase().includes(needle)) ||
            s.category.toLowerCase().includes(needle),
        );
      }
    },
    [screenshots],
  );

  const searchScreenshots = useCallback(
    (q: string): Screenshot[] => {
      if (!q.trim()) return [];
      const needle = q.toLowerCase();
      return screenshots.filter(
        (s) =>
          s.extractedText.toLowerCase().includes(needle) ||
          s.summary.toLowerCase().includes(needle) ||
          s.tags.some((t) => t.toLowerCase().includes(needle)) ||
          s.category.toLowerCase().includes(needle),
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
        isImporting: isProcessing || createMutation.isPending,
        isScanning,
        scanStatus,
        scanMessage,
        scanProgress,
        hasOnboarded,
        onboardingChecked,
        // Library fetch only — auth + splash handled at root BootstrapGate.
        isLoading: hasOnboarded && !localReady,
        error: query.error,
        activeCategory,
        setActiveCategory,
        filteredScreenshots,
        completeOnboarding,
        addScreenshot,
        scanDeviceScreenshots,
        refresh,
        searchScreenshots,
        searchScreenshotsFts,
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
