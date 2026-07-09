import { Linking, Platform } from 'react-native';
import type { Screenshot } from '@/context/ScreenshotsContext';

type CalendarModule = typeof import('expo-calendar');

let calendarModule: CalendarModule | null | undefined;

function getCalendar(): CalendarModule | null {
  if (calendarModule !== undefined) return calendarModule;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    calendarModule = require('expo-calendar') as CalendarModule;
  } catch {
    calendarModule = null;
  }
  return calendarModule;
}

function googleCalendarUrl(screenshot: Screenshot): string {
  const ev = screenshot.calendarEvent!;
  const title = encodeURIComponent(ev.title);
  const details = encodeURIComponent(screenshot.summary);
  const location = encodeURIComponent(ev.location ?? '');
  const date = ev.date.replace(/-/g, '');
  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&details=${details}&location=${location}&dates=${date}/${date}`;
}

export async function addScreenshotToCalendar(screenshot: Screenshot): Promise<'native' | 'web' | 'alert'> {
  const ev = screenshot.calendarEvent;
  if (!ev) return 'alert';

  const Calendar = getCalendar();
  if (Calendar) {
    const { status } = await Calendar.requestCalendarPermissionsAsync();
    if (status === 'granted') {
      const defaultCal =
        Platform.OS === 'ios'
          ? await Calendar.getDefaultCalendarAsync()
          : (await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT))[0];

      if (defaultCal) {
        const start = new Date(`${ev.date}T${ev.time ? parseTime(ev.time) : '09:00'}:00`);
        const end = new Date(start.getTime() + 60 * 60 * 1000);

        await Calendar.createEventAsync(defaultCal.id, {
          title: ev.title,
          startDate: start,
          endDate: end,
          location: ev.location,
          notes: screenshot.extractedText.slice(0, 500),
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        });
        return 'native';
      }
    }
  }

  const url = googleCalendarUrl(screenshot);
  const ok = await Linking.canOpenURL(url);
  if (ok) {
    await Linking.openURL(url);
    return 'web';
  }
  return 'alert';
}

function parseTime(time: string): string {
  const m12 = time.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (m12) {
    let h = parseInt(m12[1], 10);
    const min = m12[2];
    if (m12[3].toUpperCase() === 'PM' && h < 12) h += 12;
    if (m12[3].toUpperCase() === 'AM' && h === 12) h = 0;
    return `${h < 10 ? '0' : ''}${h}:${min}`;
  }
  return time.length === 5 ? time : '09:00';
}
