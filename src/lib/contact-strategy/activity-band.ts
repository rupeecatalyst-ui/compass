/**
 * CO-C1-CONTACT-STRATEGY-STICKY-NOTES-007
 * Reuses the certified Relationship Heat Map recency bands — one definition.
 */

import { bandFromRecency } from "@/lib/relationship-heat-map/score-framework";
import type { ContactStrategyActivityBand } from "@/types/contact-strategy";

export { bandFromRecency };

export function activityBandFromLastMeaningfulAt(
  lastMeaningfulAt: string | null | undefined,
  nowMs = Date.now(),
): ContactStrategyActivityBand {
  if (!lastMeaningfulAt) return "dormant";
  const days = daysSinceIsoAt(lastMeaningfulAt, nowMs);
  return bandFromRecency(days);
}

export function daysSinceIsoAt(iso: string | null | undefined, nowMs = Date.now()): number {
  if (!iso) return Number.POSITIVE_INFINITY;
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return Number.POSITIVE_INFINITY;
  return Math.max(0, (nowMs - t) / 86400000);
}

export function isDueToday(iso: string | null | undefined, nowMs = Date.now()): boolean {
  if (!iso) return false;
  const due = new Date(iso);
  if (Number.isNaN(due.getTime())) return false;
  const now = new Date(nowMs);
  return (
    due.getFullYear() === now.getFullYear() &&
    due.getMonth() === now.getMonth() &&
    due.getDate() === now.getDate()
  );
}

export function isOverdue(iso: string | null | undefined, nowMs = Date.now()): boolean {
  if (!iso) return false;
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return false;
  return t < nowMs && !isDueToday(iso, nowMs);
}

export function isUpcoming(iso: string | null | undefined, nowMs = Date.now()): boolean {
  if (!iso) return false;
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return false;
  return t > nowMs;
}
