import { classifyOnDevice } from '@/lib/on-device-classifier';
import {
  getAllLocalScreenshotRows,
  insertLocalScreenshot,
  newScreenshotId,
  type LocalScreenshotRow,
} from '@/lib/local-db';
import { notifyPriceDrop, schedulePromiseReminder } from '@/lib/notifications';
import { ocrFromImageUri } from '@/lib/ocr-service';
import { fileUriExists, materializeImageToCache } from '@/lib/image-materialize';
import { isPremiumCached } from '@/lib/premium-cache';
import { reconcilePriceTracking } from '@/lib/price-watch';
import {
  matchGalleryAssetFromList,
  loadGalleryScreenshotAssets,
  requestScreenshotLibraryAccess,
} from '@/lib/screenshot-scanner';
import { readImageBase64FromUri, resolveScreenshotDisplayUri, assetStorageId } from '@/lib/screenshot-uri';

export interface ProcessScreenshotInput {
  imageUri?: string | null;
  imageBase64?: string | null;
  localAssetId?: string | null;
  filename?: string | null;
  capturedAt?: string;
  /** Skip OCR when text is already known (e.g. user pasted in import screen). */
  extractedText?: string;
}

/**
 * Flux on-device pipeline: OCR (Vision/ML Kit) → classify → SQLite.
 */
export async function processScreenshotOnDevice(
  input: ProcessScreenshotInput,
): Promise<LocalScreenshotRow> {
  if (!input.imageUri && !input.extractedText?.trim()) {
    throw new Error('Provide an image or text to classify.');
  }

  let imageUri = input.imageUri ?? null;
  const rowId = newScreenshotId();
  if (imageUri || input.imageBase64) {
    const materialized = await materializeImageToCache(imageUri, input.imageBase64, rowId);
    if (materialized) imageUri = materialized;
  }

  let extractedText = input.extractedText?.trim() ?? '';

  if (!extractedText && imageUri) {
    extractedText = await ocrFromImageUri(imageUri, input.imageBase64);
  }

  const classification = classifyOnDevice(extractedText, {
    filename: input.filename,
    capturedAt: input.capturedAt,
  });

  let row: LocalScreenshotRow = {
    id: rowId,
    localAssetId: input.localAssetId ?? null,
    imageUri,
    capturedAt: input.capturedAt ?? new Date().toISOString(),
    category: classification.category,
    tags: classification.tags,
    extractedText: classification.extractedText,
    summary: classification.summary,
    colorHex: classification.colorHex,
    metadata: classification.metadata,
    synced: 0,
  };

  const existing = await getAllLocalScreenshotRows();
  const { metadata, alerts } = reconcilePriceTracking(row, existing);
  row = { ...row, metadata };

  await insertLocalScreenshot(row);

  if (row.metadata.promise && isPremiumCached()) {
    await schedulePromiseReminder(localRowToScreenshot(row));
  }

  if (isPremiumCached()) {
    for (const alert of alerts) {
      await notifyPriceDrop(alert);
    }
  }

  return row;
}

/** Re-run OCR for rows that were indexed before OCR was available. */
export async function reprocessLocalScreenshotOcr(
  row: LocalScreenshotRow,
): Promise<LocalScreenshotRow | null> {
  if (row.extractedText.trim()) return row;

  const displayUri = await resolveScreenshotDisplayUri(row.imageUri, row.localAssetId, row.id);
  if (!displayUri) return row;

  const base64 = await readImageBase64FromUri(displayUri);
  let extractedText = await ocrFromImageUri(displayUri, base64);

  if (!extractedText.trim()) {
    const classification = classifyOnDevice('', { capturedAt: row.capturedAt });
    const patched: LocalScreenshotRow = {
      ...row,
      imageUri: displayUri,
      category: classification.category,
      tags: classification.tags,
      summary: classification.summary,
      colorHex: classification.colorHex,
      metadata: classification.metadata,
    };
    await insertLocalScreenshot(patched);
    return patched;
  }

  const classification = classifyOnDevice(extractedText, { capturedAt: row.capturedAt });
  const patched: LocalScreenshotRow = {
    ...row,
    imageUri: displayUri,
    category: classification.category,
    tags: classification.tags,
    extractedText: classification.extractedText,
    summary: classification.summary,
    colorHex: classification.colorHex,
    metadata: classification.metadata,
  };
  await insertLocalScreenshot(patched);
  return patched;
}

export function localRowToScreenshot(row: LocalScreenshotRow) {
  return {
    id: row.id,
    imageUri: row.imageUri,
    localAssetId: row.localAssetId,
    capturedAt: row.capturedAt,
    category: row.category,
    tags: row.tags,
    extractedText: row.extractedText,
    summary: row.summary,
    colorHex: row.colorHex,
    priceTracking: row.metadata.priceTracking,
    promise: row.metadata.promise,
    calendarEvent: row.metadata.calendarEvent,
  };
}

async function persistStableThumbnail(
  sourceUri: string | null,
  rowId: string,
): Promise<string | null> {
  if (!sourceUri) return null;

  const stable = await materializeImageToCache(sourceUri, null, rowId);
  if (stable && (await fileUriExists(stable))) return stable;
  if (sourceUri.startsWith('content://')) return sourceUri;
  if (sourceUri.startsWith('file://') && (await fileUriExists(sourceUri))) return sourceUri;
  return stable;
}

/** Re-materialize missing/stale image files from gallery asset ids (e.g. after cache clear). */
export async function repairLocalScreenshotImages(): Promise<number> {
  await requestScreenshotLibraryAccess().catch(() => undefined);

  const rows = await getAllLocalScreenshotRows();
  const galleryAssets = await loadGalleryScreenshotAssets();
  const usedAssetIds = new Set<string>();
  let repaired = 0;

  for (const row of rows) {
    if (row.localAssetId) usedAssetIds.add(row.localAssetId);

    const stableExisting = await materializeImageToCache(null, null, row.id);
    if (stableExisting && (await fileUriExists(stableExisting))) {
      if (row.imageUri === stableExisting && row.localAssetId) continue;
      if (row.imageUri === stableExisting && !row.localAssetId && galleryAssets.length === 0) continue;
      await insertLocalScreenshot({ ...row, imageUri: stableExisting });
      repaired += 1;
      continue;
    }

    let localAssetId = row.localAssetId;
    if (!localAssetId && galleryAssets.length > 0) {
      const matched = matchGalleryAssetFromList(row.capturedAt, galleryAssets, usedAssetIds);
      if (matched) {
        localAssetId = matched.id;
        usedAssetIds.add(matched.id);
      }
    }

    const storageId = localAssetId ? assetStorageId(localAssetId) : row.id;
    const displayUri = await resolveScreenshotDisplayUri(row.imageUri, localAssetId, storageId);
    if (!displayUri) continue;

    const stableUri = await persistStableThumbnail(displayUri, row.id);
    if (!stableUri) continue;

    const unchanged =
      stableUri === row.imageUri &&
      localAssetId === row.localAssetId &&
      (stableUri.startsWith('content://') || (await fileUriExists(stableUri)));
    if (unchanged) continue;

    await insertLocalScreenshot({
      ...row,
      localAssetId: localAssetId ?? row.localAssetId,
      imageUri: stableUri,
    });
    repaired += 1;
  }

  return repaired;
}
