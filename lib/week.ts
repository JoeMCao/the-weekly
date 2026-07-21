import {
  type DateKey,
  dateKeyInTimeZone,
  dateKeyToUtc,
  isValidDateKey,
  toDateKey,
  utcToDateKey,
} from "@/lib/date";

/** Monday as the first day of the week (matches FIRST_WEEK_START anchor). */
export function startOfWeekMonday(date: Date): Date {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const day = d.getDay();
  const diff = (day + 6) % 7;
  d.setDate(d.getDate() - diff);
  return d;
}

export function weekStartKey(date: Date = new Date()): DateKey {
  return toDateKey(startOfWeekMonday(date));
}

export function weekStartKeyInTimeZone(timeZone: string, now = new Date()): DateKey {
  const parts = dateKeyInTimeZone(now, timeZone);
  return weekStartKeyFromDateKey(parts);
}

export function weekStartKeyFromDateKey(key: DateKey): DateKey {
  const [y, m, d] = key.split("-").map(Number);
  const date = new Date(y, (m ?? 1) - 1, d ?? 1);
  return toDateKey(startOfWeekMonday(date));
}

export function addWeeks(key: DateKey, weeks: number): DateKey {
  const [y, m, d] = key.split("-").map(Number);
  const date = new Date(y, (m ?? 1) - 1, d ?? 1);
  date.setDate(date.getDate() + weeks * 7);
  return toDateKey(date);
}

export function weekEndKey(weekStart: DateKey): DateKey {
  const [y, m, d] = weekStart.split("-").map(Number);
  const date = new Date(y, (m ?? 1) - 1, d ?? 1);
  date.setDate(date.getDate() + 6);
  return toDateKey(date);
}

/** Monday through Sunday date keys for a week. */
export function dayKeysForWeek(weekStart: DateKey): DateKey[] {
  const [y, m, d] = weekStart.split("-").map(Number);
  const start = new Date(y, (m ?? 1) - 1, d ?? 1);
  return Array.from({ length: 7 }, (_, i) => {
    const date = new Date(start);
    date.setDate(start.getDate() + i);
    return toDateKey(date);
  });
}

export function formatDayNoteLabel(noteDate: DateKey): string {
  const [y, m, d] = noteDate.split("-").map(Number);
  const date = new Date(y, (m ?? 1) - 1, d ?? 1);
  const weekday = date.toLocaleDateString("en-US", { weekday: "short" });
  const dayPart = date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
  return `${weekday}, ${dayPart}`;
}

export function isDateInWeek(noteDate: DateKey, weekStart: DateKey): boolean {
  return dayKeysForWeek(weekStart).includes(noteDate);
}

const MONTH_SHORT = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const;

/**
 * Compact weekly range from a Monday week-start key.
 * Examples:
 *   2026-07-13 → Jul 13–19, 2026
 *   2026-07-27 → Jul 27–Aug 2, 2026
 *   2026-12-28 → Dec 28, 2026–Jan 3, 2027
 */
export function formatWeekRange(weekStart: DateKey): string {
  const [y, m, d] = weekStart.split("-").map(Number);
  const start = new Date(y, (m ?? 1) - 1, d ?? 1);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);

  const startMonth = MONTH_SHORT[start.getMonth()];
  const endMonth = MONTH_SHORT[end.getMonth()];
  const startDay = start.getDate();
  const endDay = end.getDate();
  const startYear = start.getFullYear();
  const endYear = end.getFullYear();

  const sameMonth = start.getMonth() === end.getMonth() && startYear === endYear;
  const sameYear = startYear === endYear;

  if (sameMonth) {
    return `${startMonth} ${startDay}–${endDay}, ${endYear}`;
  }

  if (sameYear) {
    return `${startMonth} ${startDay}–${endMonth} ${endDay}, ${endYear}`;
  }

  return `${startMonth} ${startDay}, ${startYear}–${endMonth} ${endDay}, ${endYear}`;
}

/** @deprecated Prefer formatWeekRange — kept as an alias for existing call sites. */
export function formatWeekRangeShort(key: DateKey): string {
  return formatWeekRange(key);
}

export function formatWeekLabel(key: DateKey): string {
  const [y, m, d] = key.split("-").map(Number);
  const date = new Date(y, (m ?? 1) - 1, d ?? 1);
  return `${MONTH_SHORT[date.getMonth()]} ${date.getDate()}`;
}

export function formatWeekLong(key: DateKey): string {
  return formatWeekRange(key);
}

export function weekStartToUtc(key: DateKey): Date {
  if (!isValidDateKey(key)) {
    throw new Error(`Invalid week start: ${key}`);
  }
  return dateKeyToUtc(key);
}

export function utcToWeekStart(date: Date): DateKey {
  return utcToDateKey(date);
}
