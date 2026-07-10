import { cookies } from "next/headers";
import {
  TIME_ZONE_COOKIE_NAME,
  isValidTimeZone,
  todayKey,
  type DateKey,
} from "@/lib/date";
import { weekStartKey, weekStartKeyInTimeZone } from "@/lib/week";

export function getRequestTimeZone(): string | undefined {
  const value = cookies().get(TIME_ZONE_COOKIE_NAME)?.value;
  return isValidTimeZone(value) ? value : undefined;
}

export function weekStartKeyForRequest(): DateKey {
  const tz = getRequestTimeZone();
  return tz ? weekStartKeyInTimeZone(tz) : weekStartKey();
}

export function todayKeyForRequest(): DateKey {
  const tz = getRequestTimeZone();
  return todayKey(tz);
}
