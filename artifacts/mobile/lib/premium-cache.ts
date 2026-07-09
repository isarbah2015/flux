/** In-memory premium flag for non-React code (OCR pipeline, notifications). */
let cachedIsPremium = false;

export function setPremiumCached(isPremium: boolean): void {
  cachedIsPremium = isPremium;
}

export function isPremiumCached(): boolean {
  return cachedIsPremium;
}
