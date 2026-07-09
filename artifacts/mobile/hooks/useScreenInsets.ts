import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { contentBottomPadding, contentTopPadding } from '@/constants/layout';

export function useScreenInsets(options?: { tabBar?: boolean }) {
  const insets = useSafeAreaInsets();
  const hasTabBar = options?.tabBar !== false;

  return {
    insets,
    topPad: contentTopPadding(insets.top),
    bottomPad: contentBottomPadding(insets.bottom, hasTabBar),
  };
}
