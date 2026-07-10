import type { DateKey } from "@/lib/date";
import { addWeeks, weekStartKeyFromDateKey } from "@/lib/week";

/**
 * First week in the system: Jun 22 – Jun 28, 2026 (week ending June 28).
 * Stored as the Monday-start key for that period.
 */
export const FIRST_WEEK_START: DateKey = "2026-06-22";

/** Every Monday week-start from the anchor through `through` (inclusive). */
export function weekStartsFromAnchorThrough(through: DateKey): DateKey[] {
  const throughMonday = weekStartKeyFromDateKey(through);
  if (throughMonday < FIRST_WEEK_START) return [];

  const keys: DateKey[] = [];
  let cursor: DateKey = FIRST_WEEK_START;

  while (cursor <= throughMonday) {
    keys.push(cursor);
    if (cursor === throughMonday) break;
    cursor = addWeeks(cursor, 1);
  }

  return keys;
}

export function isCanonicalWeekStart(key: DateKey): boolean {
  if (key < FIRST_WEEK_START) return false;
  return weekStartsFromAnchorThrough(key).includes(key);
}
