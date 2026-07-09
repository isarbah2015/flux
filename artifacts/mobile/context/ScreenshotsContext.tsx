import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { AppState, InteractionManager, Platform, type AppStateStatus } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQueryClient } from '@tanstack/react-query';
import {
  useGetScreenshots,
  useCreateScreenshot,
  getGetScreenshotsQueryKey,
  type Screenshot as ApiScreenshot,
  type Category as ApiCategory,
} from '@workspace/api-client-react';
import { useAuth } from '@/context/AuthContext';
import { usePremium } from '@/context/PremiumContext';
import { supportsLocalDb } from '@/lib/runtime';
import { yieldToMainThread } from '@/lib/yield-thread';
import {
  discoverNewScreenshots,
  prepareScreenshotAsset,
  markAssetsIndexed,
} from '@/lib/screenshot-scanner';
import {
  getAllLocalScreenshots,
  getAllLocalScreenshotRows,
  initLocalDb,
  deleteLocalScreenshot,
  markLocalSynced,
  searchLocalScreenshots,
  updateLocalScreenshotFromApi,
} from '@/lib/local-db';
import {
  localRowToScreenshot,
  processScreenshotOnDevice,
  reprocessLocalScreenshotOcr,
  repairLocalScreenshotImages,
} from '@/lib/screenshot-pipeline';
import { readImageBase64FromUri } from '@/lib/screenshot-uri';
import { runPriceWatchScan } from '@/lib/background-price-watch';
import { initFluxNotifications, reschedulePromiseReminders } from '@/lib/notifications';
import { isOcrNativeLinked } from '@/lib/ocr-service';
import { buildFluxDashboard } from '@/lib/app-analytics';
import { scheduleWeeklyDigest } from '@/lib/weekly-digest';
import { deleteScreenshotOnApi } from '@/lib/screenshot-api';
import type { LocalScreenshotRow } from '@/lib/local-db';

import type { Category } from '@/constants/categories';
export type { Category } from '@/constants/categories';

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
  localAssetId?: string | null;
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
  showFirstScan: boolean;
  dismissFirstScan: () => Promise<void>;
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
  deleteScreenshot: (id: string) => Promise<void>;
  totalIndexed: number;
}

const ScreenshotsContext = createContext<ScreenshotsContextType | null>(null);

const ONBOARDED_KEY = 'flux_has_onboarded';
const FIRST_SCAN_DONE_KEY = 'flux_first_scan_done';
const BACKGROUND_SCAN_INTERVAL_MS = 5 * 60 * 1000;
const day = 86400000;

/** Map the API screenshot shape onto the flattened shape the UI consumes. */
function fromApi(s: ApiScreenshot): Screenshot {
  return {
    id: s.id,
    imageUri: s.imageUri ?? null,
    localAssetId: null,
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
  const { authEnabled, isReady: authReady, user, guestMode } = useAuth();
  const { isPremium } = usePremium();
  const [hasOnboarded, setHasOnboarded] = useState(false);
  const [onboardingChecked, setOnboardingChecked] = useState(false);
  const [showFirstScan, setShowFirstScan] = useState(false);
  const [activeCategory, setActiveCategory] = useState<Category | 'all'>('all');
  const [isScanning, setIsScanning] = useState(false);
  const [scanStatus, setScanStatus] = useState<ScanStatus>('idle');
  const [scanMessage, setScanMessage] = useState<string | null>(null);
  const [scanProgress, setScanProgress] = useState<{ done: number; total: number } | null>(null);
  const [localScreenshots, setLocalScreenshots] = useState<Screenshot[]>([]);
  const [localReady, setLocalReady] = useState(!supportsLocalDb);
  const [isProcessing, setIsProcessing] = useState(false);
  const scanInFlight = useRef(false);
  const hasBootstrappedScan = useRef(false);
  const pendingOnboardingScan = useRef(false);
  const lastBackgroundScanAt = useRef(0);

  // Fetch only once onboarded and (when auth is on) signed in.
  const canFetch = hasOnboarded && (!authEnabled || (authReady && (!!user || guestMode)));
  const canScanLocally = hasOnboarded && localReady;

  useEffect(() => {
    void (async () => {
      try {
        const onboarded = await AsyncStorage.getItem(ONBOARDED_KEY);
        setHasOnboarded(onboarded === 'true');
      } finally {
        setOnboardingChecked(true);
      }
    })();
  }, []);

  useEffect(() => {
    if (!supportsLocalDb) return;
    const task = InteractionManager.runAfterInteractions(() => {
      void (async () => {
        try {
          await initLocalDb();
          await repairLocalScreenshotImages();
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
    });
    return () => task.cancel();
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
    async (
      row: LocalScreenshotRow,
      imageBase64?: string | null,
      opts?: { skipImage?: boolean },
    ) => {
      try {
        let base64: string | null = opts?.skipImage ? null : (imageBase64 ?? null);
        if (!opts?.skipImage && !row.extractedText.trim() && !base64 && row.imageUri) {
          base64 = await readImageBase64FromUri(row.imageUri);
        }

        const apiShot = await createMutation.mutateAsync({
          data: {
            extractedText: row.extractedText,
            imageUri: row.imageUri,
            imageBase64: base64,
            category: row.category as ApiCategory,
            capturedAt: row.capturedAt,
          },
        });

        if (apiShot.extractedText?.trim() && apiShot.extractedText !== row.extractedText) {
          await updateLocalScreenshotFromApi(row.id, {
            extractedText: apiShot.extractedText,
            category: apiShot.category as Category,
            summary: apiShot.summary,
            tags: apiShot.tags,
            colorHex: apiShot.colorHex,
            metadata: apiShot.metadata,
          });
          const updated = localRowToScreenshot({
            ...row,
            extractedText: apiShot.extractedText,
            category: apiShot.category as Category,
            summary: apiShot.summary,
            tags: apiShot.tags,
            colorHex: apiShot.colorHex,
            metadata: apiShot.metadata ?? {},
            synced: 1,
          });
          setLocalScreenshots((prev) => [updated, ...prev.filter((s) => s.id !== row.id)]);
        }

        await markLocalSynced(row.id);
      } catch {
        // Offline or API unreachable — local copy is still valid.
      }
    },
    [createMutation],
  );

  const reOcrExistingScreenshots = useCallback(async (): Promise<number> => {
    if (!supportsLocalDb) return 0;

    const rows = (await getAllLocalScreenshotRows()).filter(
      (row) =>
        (row.imageUri || row.localAssetId) &&
        (!row.extractedText.trim() || row.category === 'unknown'),
    );

    let updated = 0;
    for (const row of rows.slice(0, 40)) {
      const patched = await reprocessLocalScreenshotOcr(row);
      if (!patched?.extractedText.trim()) continue;
      updated += 1;
      const shot = localRowToScreenshot(patched);
      setLocalScreenshots((prev) => [shot, ...prev.filter((s) => s.id !== shot.id)]);
      if (!row.synced) {
        void syncRowToApi(patched);
      }
    }
    return updated;
  }, [syncRowToApi]);

  const backfillRan = useRef(false);
  useEffect(() => {
    if (!localReady || !canFetch || backfillRan.current || !supportsLocalDb) return;
    backfillRan.current = true;

    void (async () => {
      const needsOcr = (await getAllLocalScreenshotRows()).filter(
        (row) =>
          (row.imageUri || row.localAssetId) &&
          (!row.extractedText.trim() || row.category === 'unknown'),
      );
      for (const row of needsOcr.slice(0, 30)) {
        const patched = await reprocessLocalScreenshotOcr(row);
        if (!patched) continue;
        const shot = localRowToScreenshot(patched);
        setLocalScreenshots((prev) => [shot, ...prev.filter((s) => s.id !== shot.id)]);
        if (!row.synced) {
          void syncRowToApi(patched);
        }
      }
    })();
  }, [canFetch, localReady, syncRowToApi]);

  const screenshots = useMemo<Screenshot[]>(() => {
    const local = [...localScreenshots];
    const localKeys = new Set(
      local.map((s) => `${s.capturedAt}|${s.summary.slice(0, 48)}`),
    );

    const api = (query.data ?? [])
      .map(fromApi)
      .filter((s) => {
        const key = `${s.capturedAt}|${s.summary.slice(0, 48)}`;
        if (localKeys.has(key)) return false;
        // API rows have no on-device image — hide text-only ghosts when local library exists.
        if (local.length > 0 && !s.localAssetId && !s.imageUri?.startsWith('file://')) {
          return false;
        }
        return true;
      });

    const byId = new Map<string, Screenshot>();
    for (const s of api) byId.set(s.id, s);
    for (const s of local) byId.set(s.id, s);
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
    const firstScanDone = await AsyncStorage.getItem(FIRST_SCAN_DONE_KEY);
    if (firstScanDone !== 'true') {
      setShowFirstScan(true);
      pendingOnboardingScan.current = true;
    }
  }, []);

  const dismissFirstScan = useCallback(async () => {
    setShowFirstScan(false);
    await AsyncStorage.setItem(FIRST_SCAN_DONE_KEY, 'true');
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
          imageBase64: input.imageBase64,
        });
        const shot = localRowToScreenshot(row);
        setLocalScreenshots((prev) => [shot, ...prev.filter((s) => s.id !== shot.id)]);
        void syncRowToApi(row, null, { skipImage: true });
        return shot;
      } finally {
        setIsProcessing(false);
      }
    },
    [syncRowToApi],
  );

  const scanDeviceScreenshots = useCallback(async () => {
    if (scanInFlight.current || !canScanLocally || Platform.OS === 'web') return;

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
          await yieldToMainThread(120);

          const prepared = await prepareScreenshotAsset(asset);
          if (!prepared?.imageUri) {
            roundFailed += 1;
            continue;
          }

          try {
            const row = await processScreenshotOnDevice({
              imageUri: prepared.imageUri,
              localAssetId: asset.id,
              filename: prepared.filename,
              capturedAt: new Date(prepared.creationTime).toISOString(),
            });
            const shot = localRowToScreenshot(row);
            setLocalScreenshots((prev) => [shot, ...prev.filter((s) => s.id !== shot.id)]);
            totalImported += 1;
            indexedIds.push(asset.id);
            setScanProgress({ done: totalImported, total: totalOnDevice });
            setScanMessage(`Importing screenshots… ${totalImported} of ${totalOnDevice}`);
            void syncRowToApi(row, null, { skipImage: true });
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
      let ocrUpdated = 0;
      if (supportsLocalDb && isOcrNativeLinked()) {
        setScanMessage('Extracting text on your device…');
        ocrUpdated = await reOcrExistingScreenshots();
      }

      if (totalImported > 0) {
        setScanMessage(
          `Imported ${totalImported} screenshot${totalImported === 1 ? '' : 's'}${ocrUpdated > 0 ? ` · text extracted from ${ocrUpdated}` : ''}.`,
        );
      } else if (ocrUpdated > 0) {
        setScanMessage(`Extracted text from ${ocrUpdated} screenshot${ocrUpdated === 1 ? '' : 's'}.`);
      } else if (deviceTotal > 0) {
        setScanMessage(
          isOcrNativeLinked()
            ? `${deviceTotal} screenshots indexed — pull again if text is still missing.`
            : `${deviceTotal} screenshots indexed — reinstall the latest app build for on-device OCR.`,
        );
      } else {
        setScanMessage(null);
      }

      if (supportsLocalDb) {
        await runPriceWatchScan();
        await repairLocalScreenshotImages();
        const rows = await getAllLocalScreenshotRows();
        const shots = rows.map(localRowToScreenshot);
        setLocalScreenshots(shots);
        void buildFluxDashboard(shots).then((dash) => {
          void scheduleWeeklyDigest(dash);
        });
      }
    } finally {
      setIsScanning(false);
      setScanProgress(null);
      scanInFlight.current = false;
    }
  }, [canScanLocally, reOcrExistingScreenshots, syncRowToApi]);

  // Auto-scan as soon as onboarding completes and local DB is ready.
  useEffect(() => {
    if (!canScanLocally || Platform.OS === 'web') return;

    if (pendingOnboardingScan.current) {
      pendingOnboardingScan.current = false;
      void scanDeviceScreenshots();
      return;
    }

    if (hasBootstrappedScan.current) return;
    hasBootstrappedScan.current = true;
    void scanDeviceScreenshots();
  }, [canScanLocally, scanDeviceScreenshots]);

  // Background incremental scan when app returns — throttled to every 5 minutes.
  useEffect(() => {
    if (!canScanLocally || Platform.OS === 'web') return;

    const onAppState = (state: AppStateStatus) => {
      if (state !== 'active') return;
      const now = Date.now();
      if (now - lastBackgroundScanAt.current < BACKGROUND_SCAN_INTERVAL_MS) return;
      lastBackgroundScanAt.current = now;
      void scanDeviceScreenshots();
    };

    const subscription = AppState.addEventListener('change', onAppState);
    return () => subscription.remove();
  }, [canScanLocally, scanDeviceScreenshots]);

  useEffect(() => {
    if (!canFetch || Platform.OS === 'web' || !localReady) return;
    void (async () => {
      await initFluxNotifications();
      await runPriceWatchScan();
    })();
  }, [canFetch, localReady]);

  useEffect(() => {
    if (!localReady || screenshots.length === 0) return;
    void reschedulePromiseReminders(screenshots);
  }, [localReady, screenshots]);

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
      if (isPremium && s.priceTracking?.priceDropped) {
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
      } else if (isPremium && s.priceTracking && !s.priceTracking.priceDropped) {
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
      if (isPremium && s.promise) {
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
  }, [screenshots, isPremium]);

  const deleteScreenshot = useCallback(
    async (id: string) => {
      await deleteLocalScreenshot(id);
      setLocalScreenshots((prev) => prev.filter((s) => s.id !== id));
      try {
        await deleteScreenshotOnApi(id);
      } catch {
        // Local delete still valid offline.
      }
      queryClient.invalidateQueries({ queryKey: getGetScreenshotsQueryKey() });
    },
    [queryClient],
  );

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
        showFirstScan,
        dismissFirstScan,
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
        deleteScreenshot,
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
