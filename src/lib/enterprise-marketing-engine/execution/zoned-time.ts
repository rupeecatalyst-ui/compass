/**
 * CO-MARKETING-REDESIGN-004 — Timezone helpers for paced delivery (no extra deps).
 */

import { getZonedParts } from "./batch-schedule";

function parseHm(hm: string): { hour: number; minute: number } {
  const [h, m] = hm.split(":").map((x) => Number.parseInt(x, 10));
  return { hour: Number.isFinite(h) ? h : 0, minute: Number.isFinite(m) ? m : 0 };
}

export function addCalendarDays(
  year: number,
  month: number,
  day: number,
  days: number,
): { year: number; month: number; day: number } {
  const utc = new Date(Date.UTC(year, month - 1, day + days));
  return {
    year: utc.getUTCFullYear(),
    month: utc.getUTCMonth() + 1,
    day: utc.getUTCDate(),
  };
}

/** Convert a civil wall-clock in `timeZone` to a UTC Date. */
export function zonedWallClockToUtc(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  timeZone: string,
): Date {
  let utcMs = Date.UTC(year, month - 1, day, hour, minute, 0);
  for (let i = 0; i < 8; i += 1) {
    const parts = getZonedParts(new Date(utcMs), timeZone);
    const got = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, 0);
    const want = Date.UTC(year, month - 1, day, hour, minute, 0);
    const delta = want - got;
    if (delta === 0) break;
    utcMs += delta;
  }
  return new Date(utcMs);
}

export function zonedWindowStartOnDate(
  year: number,
  month: number,
  day: number,
  sendWindowStart: string,
  timeZone: string,
): Date {
  const start = parseHm(sendWindowStart);
  return zonedWallClockToUtc(year, month, day, start.hour, start.minute, timeZone);
}

/**
 * Next permitted window start at or after `from` (does not apply campaign startAt/endAt).
 * End of window is exclusive.
 */
export function nextMarketingSendWindowStart(
  from: Date,
  sendWindowStart: string,
  sendWindowEnd: string,
  timeZone: string,
): Date {
  const parts = getZonedParts(from, timeZone);
  const start = parseHm(sendWindowStart);
  const end = parseHm(sendWindowEnd);
  const nowMin = parts.hour * 60 + parts.minute;
  const startMin = start.hour * 60 + start.minute;
  const endMin = end.hour * 60 + end.minute;
  if (nowMin < startMin) {
    return zonedWindowStartOnDate(parts.year, parts.month, parts.day, sendWindowStart, timeZone);
  }
  if (nowMin < endMin) {
    return new Date(from.getTime());
  }
  const next = addCalendarDays(parts.year, parts.month, parts.day, 1);
  return zonedWindowStartOnDate(next.year, next.month, next.day, sendWindowStart, timeZone);
}

export function nextCalendarDayWindowStart(
  from: Date,
  sendWindowStart: string,
  timeZone: string,
): Date {
  const parts = getZonedParts(from, timeZone);
  const next = addCalendarDays(parts.year, parts.month, parts.day, 1);
  return zonedWindowStartOnDate(next.year, next.month, next.day, sendWindowStart, timeZone);
}

export function isWithinDailySendWindow(
  at: Date,
  sendWindowStart: string,
  sendWindowEnd: string,
  timeZone: string,
): boolean {
  const parts = getZonedParts(at, timeZone);
  const nowMin = parts.hour * 60 + parts.minute;
  const start = parseHm(sendWindowStart);
  const end = parseHm(sendWindowEnd);
  const startMin = start.hour * 60 + start.minute;
  const endMin = end.hour * 60 + end.minute;
  return nowMin >= startMin && nowMin < endMin;
}
