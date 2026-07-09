import { Platform, Share } from 'react-native';
import * as Haptics from 'expo-haptics';
import type { Screenshot } from '@/context/ScreenshotsContext';

export async function shareScreenshot(screenshot: Screenshot): Promise<void> {
  Haptics.selectionAsync();
  const message = `${screenshot.summary}\n\n${screenshot.extractedText.slice(0, 280)}`;
  await Share.share({
    title: screenshot.summary,
    message,
    ...(Platform.OS === 'ios' ? { url: screenshot.imageUri ?? undefined } : {}),
  });
}
