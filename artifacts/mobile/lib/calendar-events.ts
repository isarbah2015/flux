import type { Screenshot } from '@/context/ScreenshotsContext';

export interface CalendarDayEvent {
  screenshotId: string;
  title: string;
  date: string;
  time?: string;
  location?: string;
  colorHex: string;
  screenshot: Screenshot;
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;

export function weekdayLabels(): readonly string[] {
  return WEEKDAYS;
}

export function parseEventDate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

export function toDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function sameCalendarDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function collectCalendarEvents(screenshots: Screenshot[]): CalendarDayEvent[] {
  const events: CalendarDayEvent[] = [];
  for (const shot of screenshots) {
    if (!shot.calendarEvent?.date) continue;
    events.push({
      screenshotId: shot.id,
      title: shot.calendarEvent.title,
      date: shot.calendarEvent.date,
      time: shot.calendarEvent.time,
      location: shot.calendarEvent.location,
      colorHex: shot.colorHex || '#00D4FF',
      screenshot: shot,
    });
  }
  return events.sort((a, b) => parseEventDate(a.date).getTime() - parseEventDate(b.date).getTime());
}

export function groupEventsByDate(events: CalendarDayEvent[]): Map<string, CalendarDayEvent[]> {
  const map = new Map<string, CalendarDayEvent[]>();
  for (const ev of events) {
    const list = map.get(ev.date) ?? [];
    list.push(ev);
    map.set(ev.date, list);
  }
  return map;
}

/** Flat grid cells for a month (null = padding). */
export function buildMonthGrid(year: number, month: number): (Date | null)[] {
  const first = new Date(year, month, 1);
  const startPad = first.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells: (Date | null)[] = [];
  for (let i = 0; i < startPad; i += 1) cells.push(null);
  for (let d = 1; d <= daysInMonth; d += 1) {
    cells.push(new Date(year, month, d));
  }
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

export function formatMonthYear(year: number, month: number): string {
  return new Date(year, month, 1).toLocaleDateString(undefined, {
    month: 'long',
    year: 'numeric',
  });
}

export function daysUntil(dateKey: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = parseEventDate(dateKey);
  target.setHours(0, 0, 0, 0);
  return Math.ceil((target.getTime() - today.getTime()) / 86_400_000);
}
