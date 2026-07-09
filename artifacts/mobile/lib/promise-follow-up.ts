import * as Clipboard from 'expo-clipboard';
import { Linking, Platform } from 'react-native';
import type { Screenshot } from '@/context/ScreenshotsContext';

export function buildFollowUpMessage(screenshot: Screenshot): string {
  const p = screenshot.promise;
  if (!p) return '';
  return `Hi ${p.from}, following up on what you said: "${p.content}" — deadline was ${p.deadline}.`;
}

export function buildProofPack(screenshot: Screenshot): string {
  const lines = [
    '— Flux proof pack —',
    screenshot.summary,
    `Captured: ${new Date(screenshot.capturedAt).toLocaleString()}`,
    '',
  ];
  if (screenshot.promise) {
    lines.push(`Promise from ${screenshot.promise.from}:`, `"${screenshot.promise.content}"`, `Deadline: ${screenshot.promise.deadline}`, '');
  }
  lines.push('Extracted text:', screenshot.extractedText.slice(0, 2000));
  return lines.join('\n');
}

export async function copyFollowUpMessage(screenshot: Screenshot): Promise<void> {
  await Clipboard.setStringAsync(buildFollowUpMessage(screenshot));
}

export async function copyProofPack(screenshot: Screenshot): Promise<void> {
  await Clipboard.setStringAsync(buildProofPack(screenshot));
}

export async function openSmsFollowUp(screenshot: Screenshot): Promise<boolean> {
  const body = encodeURIComponent(buildFollowUpMessage(screenshot));
  const url = Platform.select({
    ios: `sms:&body=${body}`,
    android: `sms:?body=${body}`,
    default: `sms:?body=${body}`,
  });
  if (!url) return false;
  const ok = await Linking.canOpenURL(url);
  if (!ok) return false;
  await Linking.openURL(url);
  return true;
}
