import { Platform } from 'react-native';
import { fileUriExists, materializeImageToCache, readImageBase64 } from '@/lib/image-materialize';

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

export function assetStorageId(localAssetId: string): string {
  return `asset-${localAssetId.replace(/[^a-zA-Z0-9_-]/g, '_')}`;
}

async function ensurePhotoAccess(): Promise<boolean> {
  const MediaLibrary = getMediaLibrary();
  if (!MediaLibrary) return false;

  try {
    const current = await MediaLibrary.getPermissionsAsync(false, ['photo']);
    if (current.status === 'granted') return true;

    const requested =
      Platform.OS === 'android'
        ? await MediaLibrary.requestPermissionsAsync(false, ['photo'])
        : await MediaLibrary.requestPermissionsAsync();
    return requested.status === 'granted';
  } catch {
    return false;
  }
}

function normalizeDisplayUri(uri: string): string {
  const clean = uri.split('#')[0];
  if (clean.startsWith('file://') || clean.startsWith('content://') || clean.startsWith('ph://')) {
    return clean;
  }
  if (clean.startsWith('/')) return `file://${clean}`;
  return clean;
}

/** Resolve a gallery asset id to a displayable URI. */
export async function resolveAssetDisplayUri(localAssetId: string): Promise<string | null> {
  const MediaLibrary = getMediaLibrary();
  if (!MediaLibrary) return null;

  const storageId = assetStorageId(localAssetId);
  const cached = await materializeImageToCache(null, null, storageId);
  if (cached && (await fileUriExists(cached))) return cached;

  if (!(await ensurePhotoAccess())) return null;

  try {
    const info = await MediaLibrary.getAssetInfoAsync(localAssetId, {
      shouldDownloadFromNetwork: true,
    });
    const uri = normalizeDisplayUri((info.localUri ?? info.uri) ?? '');
    if (!uri || uri.startsWith('ph://')) return null;

    const materialized = await materializeImageToCache(uri, null, storageId);
    if (materialized) return materialized;

    if (uri.startsWith('file://') && (await fileUriExists(uri))) return uri;
    if (uri.startsWith('content://')) return uri;
    return null;
  } catch {
    return null;
  }
}

/** Pick the best URI for rendering a screenshot thumbnail. */
export async function resolveScreenshotDisplayUri(
  imageUri: string | null | undefined,
  localAssetId?: string | null,
  screenshotId?: string | null,
): Promise<string | null> {
  if (screenshotId) {
    const cachedById = await materializeImageToCache(null, null, screenshotId);
    if (cachedById && (await fileUriExists(cachedById))) return cachedById;
  }

  const direct = imageUri ? normalizeDisplayUri(imageUri) : null;

  if (direct && (await fileUriExists(direct))) {
    return direct;
  }

  if (localAssetId) {
    const fromAsset = await resolveAssetDisplayUri(localAssetId);
    if (fromAsset) return fromAsset;
  }

  if (direct) {
    const materialized = await materializeImageToCache(direct, null, screenshotId ?? undefined);
    if (materialized) return materialized;
    if (direct.startsWith('content://')) return direct;
  }

  return null;
}

/** Read image bytes as base64 for server OCR (skips huge reads). */
export async function readImageBase64FromUri(
  uri: string,
  existingBase64?: string | null,
): Promise<string | null> {
  return readImageBase64(uri, existingBase64);
}
