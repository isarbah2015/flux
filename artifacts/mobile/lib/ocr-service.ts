/**
 * On-device OCR via ExpoTextExtractor (ML Kit / Vision).
 * Uses requireOptionalNativeModule — NativeModules does not work with New Architecture.
 */

import { requireOptionalNativeModule } from 'expo';
import { supportsOnDeviceOcr } from '@/lib/runtime';
import { materializeImageToCache } from '@/lib/image-materialize';

type NativeExtractor = {
  isSupported?: boolean;
  extractTextFromImage: (uri: string) => Promise<string[]>;
};

type TextExtractor = {
  isSupported: boolean;
  extractTextFromImage: (uri: string) => Promise<string[]>;
};

let cachedModule: TextExtractor | null | undefined;

function wireUri(uri: string): string {
  if (uri.startsWith('content://')) return uri;
  return uri.replace('file://', '');
}

function getExtractor(): TextExtractor | null {
  if (!supportsOnDeviceOcr) return null;
  if (cachedModule !== undefined) return cachedModule;

  cachedModule = null;
  const native = requireOptionalNativeModule<NativeExtractor>('ExpoTextExtractor');
  if (!native || typeof native.extractTextFromImage !== 'function') {
    return null;
  }

  cachedModule = {
    isSupported: native.isSupported !== false,
    extractTextFromImage: async (uri: string) => native.extractTextFromImage(wireUri(uri)),
  };
  return cachedModule;
}

export function isOcrNativeLinked(): boolean {
  return getExtractor() !== null;
}

async function tryExtract(extractor: TextExtractor, uri: string): Promise<string> {
  try {
    const lines = await extractor.extractTextFromImage(uri);
    return lines.join('\n').trim();
  } catch {
    return '';
  }
}

export async function ocrFromImageUri(uri: string, base64?: string | null): Promise<string> {
  const extractor = getExtractor();
  if (!extractor?.isSupported) {
    return '';
  }

  const candidates: string[] = [];
  const clean = uri?.split('#')[0];
  if (clean) candidates.push(clean);

  const materialized = await materializeImageToCache(uri, base64);
  if (materialized && !candidates.includes(materialized)) {
    candidates.push(materialized);
  }

  for (const candidate of candidates) {
    const text = await tryExtract(extractor, candidate);
    if (text) return text;
  }

  return '';
}
