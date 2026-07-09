/** Flux screenshot taxonomy — keep in sync with lib/db SCREENSHOT_CATEGORIES. */
export const FLUX_CATEGORIES = [
  'shopping',
  'work',
  'travel',
  'receipt',
  'conversation',
  'ideas',
  'finance',
  'food',
  'unknown',
] as const;

export type Category = (typeof FLUX_CATEGORIES)[number];

export type FilterCategory = Category | 'all';

export const CATEGORY_FILTER_ORDER: FilterCategory[] = [
  'all',
  'shopping',
  'work',
  'travel',
  'receipt',
  'conversation',
  'ideas',
  'finance',
  'food',
  'unknown',
];
