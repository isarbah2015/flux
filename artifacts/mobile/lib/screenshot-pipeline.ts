import { classifyOnDevice } from '@/lib/on-device-classifier';
import {
  insertLocalScreenshot,
  newScreenshotId,
  type LocalScreenshotRow,
} from '@/lib/local-db';
import { ocrFromImageUri } from '@/lib/ocr-service';

export interface ProcessScreenshotInput {
  imageUri?: string | null;
  localAssetId?: string | null;
  capturedAt?: string;
  /** Skip OCR when text is already known (e.g. user pasted in import screen). */
  extractedText?: string;
}

/**
 * Flux on-device pipeline: OCR (Vision/ML Kit) → classify → SQLite.
 * No image bytes leave the device during this step.
 */
export async function processScreenshotOnDevice(
  input: ProcessScreenshotInput,
): Promise<LocalScreenshotRow> {
  if (!input.imageUri && !input.extractedText?.trim()) {
    throw new Error('Provide an image or text to classify.');
  }

  let extractedText = input.extractedText?.trim() ?? '';

  if (!extractedText && input.imageUri) {
    extractedText = await ocrFromImageUri(input.imageUri);
  }

  const classification = classifyOnDevice(extractedText);

  const row: LocalScreenshotRow = {
    id: newScreenshotId(),
    localAssetId: input.localAssetId ?? null,
    imageUri: input.imageUri ?? null,
    capturedAt: input.capturedAt ?? new Date().toISOString(),
    category: classification.category,
    tags: classification.tags,
    extractedText: classification.extractedText,
    summary: classification.summary,
    colorHex: classification.colorHex,
    metadata: classification.metadata,
    synced: 0,
  };

  await insertLocalScreenshot(row);
  return row;
}

export function localRowToScreenshot(row: LocalScreenshotRow) {
  return {
    id: row.id,
    imageUri: row.imageUri,
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
