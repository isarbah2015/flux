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

/** Resolve a gallery asset id to a displayable URI. */
export async function resolveAssetDisplayUri(localAssetId: string): Promise<string | null> {
  const MediaLibrary = getMediaLibrary();
  if (!MediaLibrary) return null;

  try {
    const info = await MediaLibrary.getAssetInfoAsync(localAssetId, {
      shouldDownloadFromNetwork: true,
    });
    const uri = (info.localUri ?? info.uri)?.split('#')[0];
    if (!uri || uri.startsWith('ph://')) return null;
    return uri;
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
  const direct = imageUri?.split('#')[0];

  if (direct && (await fileUriExists(direct))) {
    return direct;
  }

  if (localAssetId) {
    const fromAsset = await resolveAssetDisplayUri(localAssetId);
    if (fromAsset) {
      const materialized = await materializeImageToCache(fromAsset, null, screenshotId);
      if (materialized) return materialized;
      if (await fileUriExists(fromAsset)) return fromAsset;
    }
  }

  if (direct) {
    const materialized = await materializeImageToCache(direct, null, screenshotId);
    if (materialized) return materialized;

    if (
      Platform.OS === 'android' &&
      direct.startsWith('content://') &&
      localAssetId
    ) {
      const fromAsset = await resolveAssetDisplayUri(localAssetId);
      if (fromAsset) {
        return materializeImageToCache(fromAsset, null, screenshotId);
      }
    }

    if (!direct.startsWith('ph://')) return direct;
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
