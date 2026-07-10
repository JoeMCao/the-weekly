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
  const weekday = date.toLocaleDateString(undefined, { weekday: "short" });
  const dayPart = date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
  return `${weekday}, ${dayPart}`;
}

export function isDateInWeek(noteDate: DateKey, weekStart: DateKey): boolean {
  return dayKeysForWeek(weekStart).includes(noteDate);
}

export function formatWeekRangeShort(key: DateKey): string {
  const [y, m, d] = key.split("-").map(Number);
  const start = new Date(y, (m ?? 1) - 1, d ?? 1);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  const sameMonth = start.getMonth() === end.getMonth();
  const startPart = start.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
  const endPart = end.toLocaleDateString(undefined, {
    month: sameMonth ? undefined : "short",
    day: "numeric",
    year: "numeric",
  });
  return `${startPart} – ${endPart}`;
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
