/**
 * On-device OCR using Apple Vision (iOS) / ML Kit (Android).
 *
 * `expo-text-extractor` is a native module and is ONLY present in a development
 * build. In Expo Go the native side is missing and a static `import` of the
 * package throws at bundle-load time, taking the whole app down. We therefore
 * resolve it lazily inside a try/catch (documented exception to no-inline-imports)
 * and degrade gracefully to empty OCR text when it is unavailable.
 */

type TextExtractor = {
  isSupported: boolean;
  extractTextFromImage: (uri: string) => Promise<string[]>;
};

let cachedModule: TextExtractor | null | undefined;

import { supportsOnDeviceOcr } from '@/lib/runtime';

function getExtractor(): TextExtractor | null {
  if (!supportsOnDeviceOcr) return null;
  if (cachedModule !== undefined) return cachedModule;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    cachedModule = require('expo-text-extractor') as TextExtractor;
  } catch {
    cachedModule = null;
  }
  return cachedModule;
}

export async function ocrFromImageUri(uri: string): Promise<string> {
  const extractor = getExtractor();

  if (!extractor || !extractor.isSupported) {
    if (__DEV__) {
      // eslint-disable-next-line no-console
      console.warn('[Flux OCR] expo-text-extractor unavailable — use a dev build for on-device OCR.');
    }
    return '';
  }

  try {
    const lines = await extractor.extractTextFromImage(uri);
    return lines.join('\n').trim();
  } catch (err) {
    if (__DEV__) {
      // eslint-disable-next-line no-console
      console.warn('[Flux OCR] extractTextFromImage failed:', err);
    }
    return '';
  }
}
