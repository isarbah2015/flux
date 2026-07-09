import { Platform } from 'react-native';

/** Floating tab bar — keep in sync with FloatingTabBar.tsx */
export const TAB_BAR_HEIGHT = 58;
export const TAB_BAR_BOTTOM_GAP = 8;
export const TAB_BAR_CLEARANCE = 14;

export function contentTopPadding(safeTop: number): number {
  return (Platform.OS === 'web' ? 67 : safeTop) + 16;
}

/** Bottom padding so scroll content clears the floating tab bar. */
export function contentBottomPadding(safeBottom: number, hasTabBar = true): number {
  if (Platform.OS === 'web') return hasTabBar ? 120 : 40;
  if (!hasTabBar) return safeBottom + 24;
  return safeBottom + TAB_BAR_HEIGHT + TAB_BAR_BOTTOM_GAP + TAB_BAR_CLEARANCE;
}
