/**
 * CO-MARKETING-MKT-06 — Send window + next-run scheduling (no external deps).
 */

import type { MarketingBatchPolicy } from "@/types/enterprise-marketing-execution";

function parseHm(hm: string): { hour: number; minute: number } {
  const [h, m] = hm.split(":").map((x) => Number.parseInt(x, 10));
  return { hour: h || 0, minute: m || 0 };
}

/** Local date/time parts in IANA timezone. */
export function getZonedParts(date: Date, timeZone: string) {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const parts = fmt.formatToParts(date);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "0";
  return {
    year: Number.parseInt(get("year"), 10),
    month: Number.parseInt(get("month"), 10),
    day: Number.parseInt(get("day"), 10),
    hour: Number.parseInt(get("hour"), 10) % 24,
    minute: Number.parseInt(get("minute"), 10),
  };
}

export function zonedDateKey(date: Date, timeZone: string): string {
  const p = getZonedParts(date, timeZone);
  return `${p.year}-${String(p.month).padStart(2, "0")}-${String(p.day).padStart(2, "0")}`;
}

function minutesOfDay(hour: number, minute: number) {
  return hour * 60 + minute;
}

export function isWithinSendWindow(now: Date, policy: MarketingBatchPolicy): boolean {
  if (policy.startAt && now.getTime() < Date.parse(policy.startAt)) return false;
  if (policy.endAt && now.getTime() > Date.parse(policy.endAt)) return false;
  const p = getZonedParts(now, policy.timezone);
  const nowMin = minutesOfDay(p.hour, p.minute);
  const start = parseHm(policy.sendWindowStart);
  const end = parseHm(policy.sendWindowEnd);
  const startMin = minutesOfDay(start.hour, start.minute);
  const endMin = minutesOfDay(end.hour, end.minute);
  return nowMin >= startMin && nowMin < endMin;
}

/** Next ISO timestamp when a batch may run (respects window + interval). */
export function computeNextRunAt(
  now: Date,
  policy: MarketingBatchPolicy,
  afterBatch = false,
): string {
  if (policy.startAt && now.getTime() < Date.parse(policy.startAt)) {
    return policy.startAt;
  }
  if (policy.endAt && now.getTime() > Date.parse(policy.endAt)) {
    return policy.endAt;
  }
  if (!isWithinSendWindow(now, policy)) {
    // Outside window — retry in 30 minutes (cron/worker will re-check window).
    return new Date(now.getTime() + 30 * 60 * 1000).toISOString();
  }
  const base = afterBatch ? now.getTime() + policy.intervalMs : now.getTime();
  return new Date(base).toISOString();
}
