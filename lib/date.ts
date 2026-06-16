// Date helpers. We treat a "date" as a calendar day in the active local
// timezone, and serialize it to "YYYY-MM-DD" for URLs and DB-facing UTC
// midnight Date objects.

export type DateKey = string; // "YYYY-MM-DD"
export const TIME_ZONE_COOKIE_NAME = "weekly_compass_time_zone";

const pad = (n: number) => String(n).padStart(2, "0");

export function toDateKey(date: Date): DateKey {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function fromDateKey(key: DateKey): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

export function isValidDateKey(key: string): key is DateKey {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(key)) return false;
  const d = fromDateKey(key);
  return !Number.isNaN(d.getTime()) && toDateKey(d) === key;
}

/**
 * Convert a local calendar date (YYYY-MM-DD) to a UTC midnight Date.
 * Postgres `@db.Date` stores a pure date; Prisma returns it as UTC midnight.
 * To avoid "off-by-one" drift, we always write UTC midnight for a given key.
 */
export function dateKeyToUtc(key: DateKey): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(Date.UTC(y, (m ?? 1) - 1, d ?? 1));
}

export function utcToDateKey(date: Date): DateKey {
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(
    date.getUTCDate(),
  )}`;
}

export function dateKeyInTimeZone(
  date: Date,
  timeZone: string,
): DateKey {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;

  if (!year || !month || !day) {
    throw new Error(`Unable to format date for time zone "${timeZone}"`);
  }

  return `${year}-${month}-${day}`;
}

export function isValidTimeZone(value: string | null | undefined): value is string {
  if (!value) return false;
  try {
    Intl.DateTimeFormat(undefined, { timeZone: value });
    return true;
  } catch {
    return false;
  }
}

export function todayKey(timeZone?: string): DateKey {
  return timeZone ? dateKeyInTimeZone(new Date(), timeZone) : toDateKey(new Date());
}

export function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

/** ISO week: Monday as first day. */
export function startOfWeek(date: Date): Date {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const day = d.getDay(); // 0=Sun..6=Sat
  const diff = (day + 6) % 7; // days since Monday
  d.setDate(d.getDate() - diff);
  return d;
}

export function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

export function endOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}

export function weekKeys(anchor: Date = new Date()): DateKey[] {
  const start = startOfWeek(anchor);
  return Array.from({ length: 7 }, (_, i) => toDateKey(addDays(start, i)));
}

/**
 * Returns a 6x7 grid of DateKeys (Mon..Sun) covering the month that contains `anchor`.
 * Some leading/trailing cells belong to adjacent months.
 */
export function monthGridKeys(anchor: Date = new Date()): DateKey[] {
  const first = startOfMonth(anchor);
  const gridStart = startOfWeek(first);
  return Array.from({ length: 42 }, (_, i) => toDateKey(addDays(gridStart, i)));
}

export function formatLongDate(key: DateKey): string {
  const d = fromDateKey(key);
  return d.toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export function formatShortWeekday(key: DateKey): string {
  return fromDateKey(key).toLocaleDateString(undefined, { weekday: "short" });
}

export function formatDayNumber(key: DateKey): string {
  return String(fromDateKey(key).getDate());
}

export function isSameMonth(key: DateKey, anchor: Date): boolean {
  const d = fromDateKey(key);
  return d.getMonth() === anchor.getMonth() && d.getFullYear() === anchor.getFullYear();
}

export function isToday(key: DateKey, today: DateKey = todayKey()): boolean {
  return key === today;
}

export function isFuture(key: DateKey, today: DateKey = todayKey()): boolean {
  return key > today;
}

/**
 * Monday date keys for each Mon–Sun week that touches the calendar year
 * (at least one day between Jan 1 and Dec 31 inclusive). Monday-first, consistent
 * with startOfWeek. Typically 52 or 53 weeks.
 */
/**
 * ISO week number (1–53) for the given Monday and the ISO year that week belongs to.
 */
export function isoWeekNumberForMonday(mondayKey: DateKey): {
  isoYear: number;
  week: number;
} {
  const monday = fromDateKey(mondayKey);
  const thursday = addDays(monday, 3);
  let isoYear = thursday.getFullYear();
  let jan4 = new Date(isoYear, 0, 4);
  let week1Monday = startOfWeek(jan4);
  let diffDays = Math.round(
    (monday.getTime() - week1Monday.getTime()) / 86400000,
  );
  let week = Math.floor(diffDays / 7) + 1;
  if (week < 1) {
    isoYear -= 1;
    jan4 = new Date(isoYear, 0, 4);
    week1Monday = startOfWeek(jan4);
    diffDays = Math.round(
      (monday.getTime() - week1Monday.getTime()) / 86400000,
    );
    week = Math.floor(diffDays / 7) + 1;
  }
  return { isoYear, week: Math.min(53, Math.max(1, week)) };
}

export function weekMondayKeysForCalendarYear(year: number): DateKey[] {
  const jan1 = new Date(year, 0, 1);
  const dec31 = new Date(year, 11, 31);
  let cursor = startOfWeek(jan1);
  const keys: DateKey[] = [];
  while (true) {
    if (cursor > dec31) break;
    const weekEnd = addDays(cursor, 6);
    const touchesYear = weekEnd >= jan1 && cursor <= dec31;
    if (touchesYear) keys.push(toDateKey(cursor));
    cursor = addDays(cursor, 7);
  }
  return keys;
}
