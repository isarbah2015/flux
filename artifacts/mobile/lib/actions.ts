import { Alert, Linking, Platform, Share } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import type { Screenshot } from '@/context/ScreenshotsContext';

const REMINDERS_KEY = 'flux_reminders';

export async function shareScreenshot(screenshot: Screenshot): Promise<void> {
  Haptics.selectionAsync();
  const message = `${screenshot.summary}\n\n${screenshot.extractedText.slice(0, 280)}`;
  await Share.share({
    title: screenshot.summary,
    message,
    ...(Platform.OS === 'ios' ? { url: screenshot.imageUri ?? undefined } : {}),
  });
}

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
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

  const reminders = JSON.parse((await AsyncStorage.getItem(REMINDERS_KEY)) ?? '[]') as string[];
  if (!reminders.includes(screenshot.id)) {
    reminders.push(screenshot.id);
    await AsyncStorage.setItem(REMINDERS_KEY, JSON.stringify(reminders));
  }

  Alert.alert(
    'Reminder saved',
    `We'll nudge you to follow up with ${p.from} before ${p.deadline}.`,
    [{ text: 'OK' }],
  );
}

export async function addToCalendar(screenshot: Screenshot): Promise<void> {
  const ev = screenshot.calendarEvent;
  if (!ev) return;
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

  const title = encodeURIComponent(ev.title);
  const details = encodeURIComponent(screenshot.summary);
  const location = encodeURIComponent(ev.location ?? '');
  const date = ev.date.replace(/-/g, '');
  const url = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&details=${details}&location=${location}&dates=${date}/${date}`;

  const ok = await Linking.canOpenURL(url);
  if (!ok) {
    Alert.alert('Calendar', `${ev.title}\n${ev.date}${ev.time ? ` · ${ev.time}` : ''}`);
    return;
  }
  await Linking.openURL(url);
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
