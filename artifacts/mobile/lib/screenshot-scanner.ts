import { Platform } from 'react-native';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as MediaLibrary from 'expo-media-library';
import { readAsStringAsync } from 'expo-file-system/legacy';

const INDEXED_ASSETS_KEY = 'flux_indexed_asset_ids';
const PAGE_SIZE = 100;
const MAX_TOTAL_ASSETS = 500;
const MAX_IMPORT_PER_SCAN = 15;
const PHOTO_ONLY: MediaLibrary.GranularPermission[] = ['photo'];

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
  newAssets: MediaLibrary.Asset[];
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

async function findScreenshotsAlbum(): Promise<MediaLibrary.Album | null> {
  const albums = await MediaLibrary.getAlbumsAsync({ includeSmartAlbums: true });
  return (
    albums.find((album) => album.title.toLowerCase().includes('screenshot')) ??
    albums.find((album) => album.title === 'Screenshots') ??
    null
  );
}

type PageOptions = Omit<MediaLibrary.AssetsOptions, 'after' | 'first'>;

/** Paginate through the library — mirrors iOS PHAsset mediaSubtype screenshot fetch. */
async function paginateAssets(options: PageOptions): Promise<MediaLibrary.Asset[]> {
  const collected: MediaLibrary.Asset[] = [];
  let after: string | undefined;
  let hasNext = true;

  while (hasNext && collected.length < MAX_TOTAL_ASSETS) {
    const page = await MediaLibrary.getAssetsAsync({
      ...options,
      first: PAGE_SIZE,
      after,
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
async function loadAllScreenshotCandidates(): Promise<MediaLibrary.Asset[]> {
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

/** List screenshot assets on device that Flux has not indexed yet. */
export async function discoverNewScreenshots(): Promise<DeviceScanSummary> {
  const permission = await requestScreenshotLibraryAccess();
  if (permission === 'denied' || permission === 'unavailable') {
    return { permission, candidates: 0, newAssets: [], totalOnDevice: 0 };
  }

  if (permission === 'limited') {
    await MediaLibrary.presentPermissionsPickerAsync(['photo']).catch(() => undefined);
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

async function resolveReadableUri(asset: MediaLibrary.Asset): Promise<string | null> {
  const info = await MediaLibrary.getAssetInfoAsync(asset.id, {
    shouldDownloadFromNetwork: true,
  });

  const uri = (info.localUri ?? info.uri).split('#')[0];
  if (!uri) return null;

  if (uri.startsWith('file://') || uri.startsWith('content://')) {
    return uri;
  }

  if (Platform.OS === 'ios') {
    const retry = await MediaLibrary.getAssetInfoAsync(asset.id, {
      shouldDownloadFromNetwork: true,
    });
    const local = retry.localUri?.split('#')[0];
    if (local?.startsWith('file://')) return local;
  }

  return uri.startsWith('ph://') ? null : uri;
}

/** Read one gallery asset as base64 for upload. */
export async function readScreenshotAsset(
  asset: MediaLibrary.Asset,
): Promise<ScannedScreenshot | null> {
  const uri = await resolveReadableUri(asset);
  if (!uri) return null;

  try {
    const imageBase64 = await readAsStringAsync(uri, { encoding: 'base64' });
    if (!imageBase64) return null;

    return {
      assetId: asset.id,
      filename: asset.filename,
      creationTime: asset.creationTime,
      imageBase64,
      imageUri: uri,
    };
  } catch {
    return null;
  }
}
