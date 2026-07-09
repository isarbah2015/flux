import { Platform } from 'react-native';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Asset, Album, AssetsOptions, GranularPermission } from 'expo-media-library';
import { readImageBase64, materializeImageToCache } from '@/lib/image-materialize';
import { isoFromMediaCreationTime, mediaCreationTimeMs } from '@/lib/media-time';

type MediaLibraryModule = typeof import('expo-media-library');

let mediaLibraryModule: MediaLibraryModule | null | undefined;

function getMediaLibrary(): MediaLibraryModule | null {
  if (mediaLibraryModule !== undefined) return mediaLibraryModule;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    mediaLibraryModule = require('expo-media-library') as MediaLibraryModule;
  } catch {
    mediaLibraryModule = null;
  }
  return mediaLibraryModule;
}

const INDEXED_ASSETS_KEY = 'flux_indexed_asset_ids';
const PAGE_SIZE = 100;
const MAX_TOTAL_ASSETS = 500;
const MAX_IMPORT_PER_SCAN = 4;
const PHOTO_ONLY: GranularPermission[] = ['photo'];

export type ScreenshotAccess = 'granted' | 'denied' | 'limited' | 'unavailable';

export type ScannedScreenshot = {
  assetId: string;
  filename: string;
  creationTime: number;
  imageBase64: string;
  imageUri: string;
};

export type DeviceScanSummary = {
  permission: ScreenshotAccess;
  candidates: number;
  newAssets: Asset[];
  totalOnDevice: number;
};

function isScreenshotFilename(filename: string): boolean {
  const name = filename.toLowerCase();
  return (
    name.includes('screenshot') ||
    name.startsWith('screen_') ||
    name.startsWith('scr_') ||
    name.includes('screen-') ||
    name.includes('capture')
  );
}

/** Ask for photo-library access (Screenshots album lives inside it). */
export async function requestScreenshotLibraryAccess(): Promise<ScreenshotAccess> {
  const MediaLibrary = getMediaLibrary();
  if (!MediaLibrary) return 'unavailable';

  try {
    const result =
      Platform.OS === 'android'
        ? await MediaLibrary.requestPermissionsAsync(false, PHOTO_ONLY)
        : await MediaLibrary.requestPermissionsAsync();

    if (result.status !== 'granted') return 'denied';
    if (result.accessPrivileges === 'limited') return 'limited';
    return 'granted';
  } catch {
    // Expo Go on Android may reject — caller can fall back to manual import.
    if (Platform.OS === 'android' && Constants.appOwnership === 'expo') {
      return 'unavailable';
    }
    return 'denied';
  }
}

async function readIndexedAssetIds(): Promise<Set<string>> {
  const raw = await AsyncStorage.getItem(INDEXED_ASSETS_KEY);
  if (!raw) return new Set();

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return new Set();
    return new Set(parsed.filter((id): id is string => typeof id === 'string'));
  } catch {
    return new Set();
  }
}

/** Remember device asset IDs we've already sent to the API. */
export async function markAssetsIndexed(assetIds: string[]): Promise<void> {
  if (assetIds.length === 0) return;

  const existing = await readIndexedAssetIds();
  for (const id of assetIds) existing.add(id);

  const capped = Array.from(existing).slice(-5000);
  await AsyncStorage.setItem(INDEXED_ASSETS_KEY, JSON.stringify(capped));
}

async function findScreenshotsAlbum(): Promise<Album | null> {
  const MediaLibrary = getMediaLibrary();
  if (!MediaLibrary) return null;
  const albums = await MediaLibrary.getAlbumsAsync({ includeSmartAlbums: true });
  return (
    albums.find((album) => album.title.toLowerCase().includes('screenshot')) ??
    albums.find((album) => album.title === 'Screenshots') ??
    null
  );
}

type PageOptions = Omit<AssetsOptions, 'after' | 'first'>;

/** Paginate through the library — mirrors iOS PHAsset mediaSubtype screenshot fetch. */
async function paginateAssets(options: PageOptions): Promise<Asset[]> {
  const MediaLibrary = getMediaLibrary();
  if (!MediaLibrary) return [];

  const collected: Asset[] = [];
  let after: string | undefined;
  let hasNext = true;

  while (hasNext && collected.length < MAX_TOTAL_ASSETS) {
    const page = await MediaLibrary.getAssetsAsync({
      ...options,
      first: PAGE_SIZE,
      after,
      resolveWithFullInfo: false,
    });

    collected.push(...page.assets);
    hasNext = page.hasNextPage;
    after = page.endCursor;
  }

  return collected;
}

/**
 * Load every screenshot on the device.
 * iOS: mediaSubtypes screenshot (same as PHAssetMediaSubtype.photoScreenshot).
 * Android: Screenshots album, then filename heuristics.
 */
async function loadAllScreenshotCandidates(): Promise<Asset[]> {
  const MediaLibrary = getMediaLibrary();
  if (!MediaLibrary) return [];

  const album = await findScreenshotsAlbum();

  if (album) {
    return paginateAssets({
      album,
      mediaType: MediaLibrary.MediaType.photo,
      sortBy: [[MediaLibrary.SortBy.creationTime, false]],
    });
  }

  if (Platform.OS === 'ios') {
    const iosShots = await paginateAssets({
      mediaType: MediaLibrary.MediaType.photo,
      mediaSubtypes: ['screenshot'],
      sortBy: [[MediaLibrary.SortBy.creationTime, false]],
    });
    if (iosShots.length > 0) return iosShots;
  }

  const recent = await paginateAssets({
    mediaType: MediaLibrary.MediaType.photo,
    sortBy: [[MediaLibrary.SortBy.creationTime, false]],
  });

  return recent.filter((asset) => isScreenshotFilename(asset.filename));
}

const CAPTURE_TIME_TOLERANCE_MS = 60_000;

/** All screenshot assets on device (requires photo permission). */
export async function loadGalleryScreenshotAssets(): Promise<Asset[]> {
  const permission = await requestScreenshotLibraryAccess();
  if (permission === 'denied' || permission === 'unavailable') return [];
  return loadAllScreenshotCandidates();
}

function captureTimeCandidatesMs(capturedAtIso: string): number[] {
  const primary = new Date(capturedAtIso).getTime();
  if (!Number.isFinite(primary)) return [];

  const candidates = new Set<number>([primary]);
  // Rows indexed before the seconds→ms fix stored ~1970 dates (seconds treated as ms).
  if (primary < 86_400_000 * 400) {
    candidates.add(primary * 1000);
  }
  return [...candidates];
}

export function matchGalleryAssetFromList(
  capturedAtIso: string,
  assets: Asset[],
  usedAssetIds: ReadonlySet<string>,
): Asset | null {
  const targets = captureTimeCandidatesMs(capturedAtIso);
  if (targets.length === 0) return null;

  let best: Asset | null = null;
  let bestDelta = Infinity;

  for (const asset of assets) {
    if (usedAssetIds.has(asset.id)) continue;
    const assetMs = mediaCreationTimeMs(asset.creationTime);
    for (const targetMs of targets) {
      const delta = Math.abs(assetMs - targetMs);
      if (delta <= CAPTURE_TIME_TOLERANCE_MS && delta < bestDelta) {
        best = asset;
        bestDelta = delta;
      }
    }
  }

  return best;
}

/**
 * Match a gallery screenshot to a local row by capture time (for rows missing localAssetId).
 */
export async function matchGalleryAssetForTimestamp(
  capturedAtIso: string,
  usedAssetIds: ReadonlySet<string>,
): Promise<Asset | null> {
  const assets = await loadGalleryScreenshotAssets();
  return matchGalleryAssetFromList(capturedAtIso, assets, usedAssetIds);
}

/** List screenshot assets on device that Flux has not indexed yet. */
export async function discoverNewScreenshots(): Promise<DeviceScanSummary> {
  const permission = await requestScreenshotLibraryAccess();
  if (permission === 'denied' || permission === 'unavailable') {
    return { permission, candidates: 0, newAssets: [], totalOnDevice: 0 };
  }

  if (permission === 'limited') {
    const MediaLibrary = getMediaLibrary();
    await MediaLibrary?.presentPermissionsPickerAsync(['photo']).catch(() => undefined);
  }

  const indexed = await readIndexedAssetIds();
  const allCandidates = await loadAllScreenshotCandidates();
  const newAssets = allCandidates
    .filter((asset) => !indexed.has(asset.id))
    .slice(0, MAX_IMPORT_PER_SCAN);

  return {
    permission,
    candidates: allCandidates.filter((a) => !indexed.has(a.id)).length,
    newAssets,
    totalOnDevice: allCandidates.length,
  };
}

async function resolveReadableUri(asset: Asset): Promise<string | null> {
  const MediaLibrary = getMediaLibrary();
  if (!MediaLibrary) return null;

  const directUri = asset.uri?.split('#')[0];

  try {
    const info = await MediaLibrary.getAssetInfoAsync(asset.id, {
      shouldDownloadFromNetwork: true,
    });

    const local = info.localUri?.split('#')[0];
    if (local?.startsWith('file://')) {
      return local;
    }

    const uri = (info.localUri ?? info.uri)?.split('#')[0];
    if (!uri) return directUri ?? null;

    if (uri.startsWith('file://')) return uri;

    const materialized = await materializeImageToCache(uri);
    if (materialized) return materialized;

    return uri.startsWith('ph://') ? null : uri;
  } catch {
    if (directUri?.startsWith('file://')) return directUri;

    const materialized = await materializeImageToCache(directUri);
    if (materialized) return materialized;

    if (directUri?.startsWith('content://')) return directUri;
    return directUri ?? null;
  }
}

/** Resolve a readable file URI for an asset (no base64 read). */
export async function getScreenshotAssetUri(asset: Asset): Promise<string | null> {
  return resolveReadableUri(asset);
}

export type PreparedScreenshot = {
  assetId: string;
  filename: string;
  creationTime: number;
  imageUri: string;
};

/** Resolve a gallery asset to a readable URI without loading base64 (avoids OOM during bulk scan). */
export async function prepareScreenshotAsset(asset: Asset): Promise<PreparedScreenshot | null> {
  const uri = await resolveReadableUri(asset);
  if (!uri) return null;

  try {
    const readableUri = (await materializeImageToCache(
      uri,
      null,
      `asset-${asset.id.replace(/[^a-zA-Z0-9_-]/g, '_')}`,
    )) ?? uri;
    return {
      assetId: asset.id,
      filename: asset.filename,
      creationTime: asset.creationTime,
      imageUri: readableUri,
    };
  } catch {
    return null;
  }
}

/** Read one gallery asset as base64 for upload (manual import only — avoid during bulk scan). */
export async function readScreenshotAsset(
  asset: Asset,
): Promise<ScannedScreenshot | null> {
  const prepared = await prepareScreenshotAsset(asset);
  if (!prepared) return null;

  try {
    const imageBase64 = await readImageBase64(prepared.imageUri);
    if (!imageBase64) return null;

    return {
      assetId: prepared.assetId,
      filename: prepared.filename,
      creationTime: prepared.creationTime,
      imageBase64,
      imageUri: prepared.imageUri,
    };
  } catch {
    return null;
  }
}
