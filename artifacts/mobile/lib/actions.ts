import { Alert, Linking } from 'react-native';
import * as Haptics from 'expo-haptics';
import type { Screenshot } from '@/context/ScreenshotsContext';
import { addScreenshotToCalendar } from '@/lib/calendar-sync';
import { schedulePromiseReminder } from '@/lib/notifications';
import { shareScreenshot } from '@/lib/share-screenshot';

export { shareScreenshot };

export async function openProductDeal(screenshot: Screenshot): Promise<void> {
  const pt = screenshot.priceTracking;
  if (!pt) return;
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  const q = encodeURIComponent(`${pt.productName} ${pt.retailer}`);
  const url = `https://www.google.com/search?q=${q}`;
  const ok = await Linking.canOpenURL(url);
  if (!ok) {
    Alert.alert('Cannot open link', url);
    return;
  }
  await Linking.openURL(url);
}

export async function setPromiseReminder(screenshot: Screenshot): Promise<void> {
  const p = screenshot.promise;
  if (!p) return;

  const scheduled = await schedulePromiseReminder(screenshot);
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

  Alert.alert(
    scheduled ? 'Reminder scheduled' : 'Reminder saved',
    scheduled
      ? `You'll get a push notification before the deadline to follow up with ${p.from}.`
      : `Reminder saved for ${p.from}. Enable notifications in Settings for alerts.`,
    [{ text: 'OK' }],
  );
}

export async function addToCalendar(screenshot: Screenshot): Promise<void> {
  const ev = screenshot.calendarEvent;
  if (!ev) return;
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

  const result = await addScreenshotToCalendar(screenshot);
  if (result === 'native') {
    Alert.alert('Added to calendar', `${ev.title} is on your device calendar.`);
  } else if (result === 'web') {
    Alert.alert('Opening Google Calendar', 'Complete the event in your browser.');
  } else {
    Alert.alert('Calendar', `${ev.title}\n${ev.date}${ev.time ? ` · ${ev.time}` : ''}`);
  }
}

export function openPrivacyPolicy(): void {
  Haptics.selectionAsync();
  void Linking.openURL('https://flux.app/privacy');
}

export function sendFeedback(userEmail?: string | null): void {
  Haptics.selectionAsync();
  const subject = encodeURIComponent('Flux App Feedback');
  const body = encodeURIComponent(
    `Hi Flux team,\n\n[Your feedback here]\n\n---\nApp: Flux 1.0.0\nUser: ${userEmail ?? 'anonymous'}`,
  );
  void Linking.openURL(`mailto:support@flux.app?subject=${subject}&body=${body}`);
}

export function showProfileInfo(email?: string | null): void {
  Haptics.selectionAsync();
  Alert.alert('Your profile', email ?? 'Signed in with Firebase', [{ text: 'OK' }]);
}
