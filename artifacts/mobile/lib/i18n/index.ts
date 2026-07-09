import { en, type I18nKey } from './en';
import { fr } from './locales/fr';
import { es } from './locales/es';
import { de } from './locales/de';
import { ar } from './locales/ar';
import { zh } from './locales/zh';
import { hi } from './locales/hi';
import { pt } from './locales/pt';
import { sw } from './locales/sw';
import { ha } from './locales/ha';

export type { I18nKey };

/** Languages with a complete UI translation pack. */
export const FULL_LOCALE_CODES = ['en', 'fr', 'es', 'de', 'ar', 'zh', 'hi', 'pt', 'sw', 'ha'] as const;

const PACKS: Record<string, Partial<Record<I18nKey, string>>> = {
  en,
  fr,
  es,
  de,
  ar,
  zh,
  hi,
  pt,
  sw,
  ha,
};

export function localeHasFullPack(locale: string): boolean {
  const base = locale.split('-')[0] ?? 'en';
  return FULL_LOCALE_CODES.includes(base as (typeof FULL_LOCALE_CODES)[number]);
}

export function translate(
  locale: string,
  key: I18nKey,
  vars?: Record<string, string | number>,
): string {
  const base = locale.split('-')[0] ?? 'en';
  const table = PACKS[base] ?? en;
  let text = table[key] ?? en[key] ?? key;
  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      text = text.replaceAll(`{${k}}`, String(v));
    }
  }
  return text;
}

export function translateCategory(locale: string, category: string): string {
  const key = `category.${category}` as I18nKey;
  if (key in en) return translate(locale, key);
  return category;
}

export function translateSearchFilter(locale: string, filter: string): string {
  const key = `searchFilter.${filter}` as I18nKey;
  if (key in en) return translate(locale, key);
  return filter;
}
