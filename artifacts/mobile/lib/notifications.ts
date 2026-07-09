import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Screenshot } from '@/context/ScreenshotsContext';
import type { PriceDropAlert } from '@/lib/price-watch';

const REMINDERS_KEY = 'flux_reminders';
const CHANNEL_ID = 'flux-insights';

type NotificationsModule = typeof import('expo-notifications');

function notificationsGranted(
  result: Awaited<ReturnType<NonNullable<NotificationsModule['getPermissionsAsync']>>>,
): boolean {
  const r = result as { granted?: boolean; status?: string | number };
  return r.granted === true || r.status === 'granted' || r.status === 2;
}

let notificationsModule: NotificationsModule | null | undefined;

function getNotifications(): NotificationsModule | null {
  if (notificationsModule !== undefined) return notificationsModule;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    notificationsModule = require('expo-notifications') as NotificationsModule;
  } catch {
    notificationsModule = null;
  }
  return notificationsModule;
}

export async function initFluxNotifications(): Promise<boolean> {
  const Notifications = getNotifications();
  if (!Notifications) return false;

  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
      name: 'Flux insights',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 180, 80, 180],
      lightColor: '#7C72FF',
    });
  }

  const existing = await Notifications.getPermissionsAsync();
  if (notificationsGranted(existing)) return true;
  const requested = await Notifications.requestPermissionsAsync();
  return notificationsGranted(requested);
}

export async function schedulePromiseReminder(screenshot: Screenshot): Promise<boolean> {
  const p = screenshot.promise;
  if (!p) return false;

  const Notifications = getNotifications();
  if (!Notifications) return false;

  const granted = await initFluxNotifications();
  if (!granted) return false;

  const triggerDate = new Date(p.followUpDate);
  if (triggerDate.getTime() <= Date.now()) {
    triggerDate.setTime(Date.now() + 60_000);
  }

  await Notifications.scheduleNotificationAsync({
    identifier: `promise_${screenshot.id}`,
    content: {
      title: `Follow up with ${p.from}`,
      body: `"${p.content.slice(0, 100)}" — due ${p.deadline}`,
      data: { screenshotId: screenshot.id, type: 'promise' },
      sound: true,
      ...(Platform.OS === 'android' ? { channelId: CHANNEL_ID } : {}),
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: triggerDate,
    },
  });

  const reminders = JSON.parse((await AsyncStorage.getItem(REMINDERS_KEY)) ?? '[]') as string[];
  if (!reminders.includes(screenshot.id)) {
    reminders.push(screenshot.id);
    await AsyncStorage.setItem(REMINDERS_KEY, JSON.stringify(reminders));
  }

  return true;
}

export async function notifyPriceDrop(alert: PriceDropAlert): Promise<void> {
  const Notifications = getNotifications();
  if (!Notifications) return;

  const granted = await initFluxNotifications();
  if (!granted) return;

  await Notifications.scheduleNotificationAsync({
    identifier: `price_drop_${alert.screenshotId}_${alert.newPrice}`,
    content: {
      title: `Price dropped: ${alert.productName}`,
      body: `Now ${alert.newPrice} (was ${alert.oldPrice}) on ${alert.retailer}`,
      data: { screenshotId: alert.screenshotId, type: 'price_drop' },
      sound: true,
      ...(Platform.OS === 'android' ? { channelId: CHANNEL_ID } : {}),
    },
    trigger: null,
  });
}

export async function reschedulePromiseReminders(screenshots: Screenshot[]): Promise<void> {
  const raw = await AsyncStorage.getItem(REMINDERS_KEY);
  if (!raw) return;
  const ids = JSON.parse(raw) as string[];
  for (const id of ids) {
    const shot = screenshots.find((s) => s.id === id);
    if (shot?.promise) {
      await schedulePromiseReminder(shot);
    }
  }
}
