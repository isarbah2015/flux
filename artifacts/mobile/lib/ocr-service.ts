import { extractTextFromImage, isSupported } from 'expo-text-extractor';

/**
 * On-device OCR using Apple Vision (iOS) / ML Kit (Android).
 * Requires a development build — returns empty string in Expo Go when unavailable.
 */
export async function ocrFromImageUri(uri: string): Promise<string> {
  if (!isSupported) {
    if (__DEV__) {
      // eslint-disable-next-line no-console
      console.warn('[Flux OCR] expo-text-extractor not available — use a dev build for on-device OCR.');
    }
    return '';
  }

  try {
    const lines = await extractTextFromImage(uri);
    return lines.join('\n').trim();
  } catch (err) {
    if (__DEV__) {
      // eslint-disable-next-line no-console
      console.warn('[Flux OCR] extractTextFromImage failed:', err);
    }
    return '';
  }
}
