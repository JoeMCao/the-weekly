import {
  type DateKey,
  dateKeyInTimeZone,
  dateKeyToUtc,
  isValidDateKey,
  toDateKey,
  utcToDateKey,
} from "@/lib/date";

/** Sunday as the first day of the week. */
export function startOfWeekSunday(date: Date): Date {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const day = d.getDay();
  d.setDate(d.getDate() - day);
  return d;
}

export function weekStartKey(date: Date = new Date()): DateKey {
  return toDateKey(startOfWeekSunday(date));
}

export function weekStartKeyInTimeZone(timeZone: string, now = new Date()): DateKey {
  const parts = dateKeyInTimeZone(now, timeZone);
  return weekStartKeyFromDateKey(parts);
}

export function weekStartKeyFromDateKey(key: DateKey): DateKey {
  const [y, m, d] = key.split("-").map(Number);
  const date = new Date(y, (m ?? 1) - 1, d ?? 1);
  return toDateKey(startOfWeekSunday(date));
}

export function addWeeks(key: DateKey, weeks: number): DateKey {
  const [y, m, d] = key.split("-").map(Number);
  const date = new Date(y, (m ?? 1) - 1, d ?? 1);
  date.setDate(date.getDate() + weeks * 7);
  return toDateKey(date);
}

export function formatWeekLabel(key: DateKey): string {
  const [y, m, d] = key.split("-").map(Number);
  const date = new Date(y, (m ?? 1) - 1, d ?? 1);
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

export function formatWeekLong(key: DateKey): string {
  const [y, m, d] = key.split("-").map(Number);
  const start = new Date(y, (m ?? 1) - 1, d ?? 1);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  const left = start.toLocaleDateString(undefined, {
    month: "long",
    day: "numeric",
  });
  const right = end.toLocaleDateString(undefined, {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
  return `${left} – ${right}`;
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
