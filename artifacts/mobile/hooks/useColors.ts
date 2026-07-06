import colors from '@/constants/colors';

/**
 * Returns the design tokens for the current color scheme.
 * Flux forces dark mode always — the dark palette is always returned.
 */
export function useColors() {
  return { ...colors.dark, radius: colors.radius };
}
