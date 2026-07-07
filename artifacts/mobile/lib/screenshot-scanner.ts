import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as MediaLibrary from 'expo-media-library';
import { readAsStringAsync } from 'expo-file-system/legacy';

const INDEXED_ASSETS_KEY = 'flux_indexed_asset_ids';
const MAX_CANDIDATES = 60;
const MAX_IMPORT_PER_SCAN = 20;

export type ScreenshotAccess = 'granted' | 'denied' | 'limited';

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
};

/** Ask for photo-library access (Screenshots album lives inside it). */
export async function requestScreenshotLibraryAccess(): Promise<ScreenshotAccess> {
  const result = await MediaLibrary.requestPermissionsAsync();
  if (result.status !== 'granted') return 'denied';
  if (result.accessPrivileges === 'limited') return 'limited';
  return 'granted';
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

/** Remember device asset IDs we've already sent to the API (even if upload failed). */
export async function markAssetsIndexed(assetIds: string[]): Promise<void> {
  if (assetIds.length === 0) return;

  const existing = await readIndexedAssetIds();
  for (const id of assetIds) existing.add(id);

  const capped = Array.from(existing).slice(-5000);
  await AsyncStorage.setItem(INDEXED_ASSETS_KEY, JSON.stringify(capped));
}

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

async function findScreenshotsAlbum(): Promise<MediaLibrary.Album | null> {
  const albums = await MediaLibrary.getAlbumsAsync({ includeSmartAlbums: true });
  return (
    albums.find((album) => album.title.toLowerCase().includes('screenshot')) ??
    albums.find((album) => album.title === 'Screenshots') ??
    null
  );
}

async function loadScreenshotCandidates(): Promise<MediaLibrary.Asset[]> {
  const album = await findScreenshotsAlbum();

  if (album) {
    const page = await MediaLibrary.getAssetsAsync({
      album,
      mediaType: MediaLibrary.MediaType.photo,
      sortBy: [[MediaLibrary.SortBy.creationTime, false]],
      first: MAX_CANDIDATES,
    });
    return page.assets;
  }

  if (Platform.OS === 'ios') {
    const page = await MediaLibrary.getAssetsAsync({
      mediaType: MediaLibrary.MediaType.photo,
      mediaSubtypes: ['screenshot'],
      sortBy: [[MediaLibrary.SortBy.creationTime, false]],
      first: MAX_CANDIDATES,
    });
    if (page.assets.length > 0) return page.assets;
  }

  const page = await MediaLibrary.getAssetsAsync({
    mediaType: MediaLibrary.MediaType.photo,
    sortBy: [[MediaLibrary.SortBy.creationTime, false]],
    first: MAX_CANDIDATES,
  });

  return page.assets.filter((asset) => isScreenshotFilename(asset.filename));
}

/** List screenshot assets on device that Flux has not indexed yet. */
export async function discoverNewScreenshots(): Promise<DeviceScanSummary> {
  const permission = await requestScreenshotLibraryAccess();
  if (permission === 'denied') {
    return { permission, candidates: 0, newAssets: [] };
  }

  if (permission === 'limited' && Platform.OS === 'ios') {
    await MediaLibrary.presentPermissionsPickerAsync(['photo']).catch(() => undefined);
  }

  const indexed = await readIndexedAssetIds();
  const candidates = await loadScreenshotCandidates();
  const newAssets = candidates
    .filter((asset) => !indexed.has(asset.id))
    .slice(0, MAX_IMPORT_PER_SCAN);

  return { permission, candidates: candidates.length, newAssets };
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

  // iOS ph:// assets occasionally need a second fetch after iCloud download.
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
