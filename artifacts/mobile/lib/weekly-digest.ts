import { Platform } from 'react-native';
import type { FluxDashboard } from '@/lib/app-analytics';

const DIGEST_ID = 'flux_weekly_digest';

type NotificationsModule = typeof import('expo-notifications');

function getNotifications(): NotificationsModule | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('expo-notifications') as NotificationsModule;
  } catch {
    return null;
  }
}

/** Schedule a recurring weekly summary (Sunday 10:00 local). */
export async function scheduleWeeklyDigest(dashboard: FluxDashboard): Promise<boolean> {
  const Notifications = getNotifications();
  if (!Notifications) return false;

  const { privacy, insightCounts, totalSavingsUsd } = dashboard;
  const urgent = insightCounts.promise + insightCounts.price_drop;

  await Notifications.cancelScheduledNotificationAsync(DIGEST_ID).catch(() => undefined);

  await Notifications.scheduleNotificationAsync({
    identifier: DIGEST_ID,
    content: {
      title: 'Your Flux week',
      body: `${privacy.totalIndexed} screenshots indexed · ${urgent} need attention · $${totalSavingsUsd.toFixed(0)} saved`,
      data: { type: 'weekly_digest' },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: 60 * 60 * 24 * 7,
      repeats: true,
    },
  });

  return true;
}

export async function sendInstantDigest(dashboard: FluxDashboard): Promise<void> {
  const Notifications = getNotifications();
  if (!Notifications) return;

  const { privacy, insightCounts } = dashboard;
  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Flux snapshot',
      body: `${privacy.totalIndexed} indexed · ${insightCounts.promise} promises · ${insightCounts.price_drop} price drops`,
    },
    trigger: Platform.OS === 'android' ? { channelId: 'flux-insights' } : null,
  });
}
