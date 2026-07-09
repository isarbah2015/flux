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

/** Re-materialize missing/stale image files from gallery asset ids (e.g. after cache clear). */
export async function repairLocalScreenshotImages(): Promise<number> {
  const rows = await getAllLocalScreenshotRows();
  let repaired = 0;

  for (const row of rows) {
    const storageId = row.localAssetId ? assetStorageId(row.localAssetId) : row.id;
    const displayUri = await resolveScreenshotDisplayUri(
      row.imageUri,
      row.localAssetId,
      storageId,
    );
    if (!displayUri) continue;
    if (displayUri === row.imageUri && (await fileUriExists(displayUri))) continue;

    await insertLocalScreenshot({ ...row, imageUri: displayUri });
    repaired += 1;
  }

  return repaired;
}
