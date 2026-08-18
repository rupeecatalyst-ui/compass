/**
 * Historical Disbursed clock for PDC schedule repair.
 * Single 72h dueAt formula. Persistence clocks and metric stamps are out of scope.
 */
import { POST_DISBURSEMENT_CONFIRMATION_DELAY_HOURS } from "@/constants/post-disbursement-confirmation";

export type HistoricalDisbursedClockSource =
  | "disbursedAt"
  | "stageEnteredAt"
  | "timeline";

export type HistoricalDisbursedClock = {
  at: Date;
  source: HistoricalDisbursedClockSource;
};

const MS_PER_HOUR = 60 * 60 * 1000;

export function computePostDisbursementDueAt(disbursedTransitionAt: Date): Date {
  return new Date(
    disbursedTransitionAt.getTime() +
      POST_DISBURSEMENT_CONFIRMATION_DELAY_HOURS * MS_PER_HOUR,
  );
}

export function parseTimestamp(value: Date | string | null | undefined): Date | null {
  if (value == null) return null;
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }
  const raw = String(value).trim();
  if (!raw) return null;
  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function isCanonicalDisbursedStage(stage: string | null | undefined): boolean {
  return String(stage ?? "").trim() === "disbursed";
}

export function pickEarliestDisbursedTimelineOccurredAt(
  events: ReadonlyArray<{
    eventType?: string | null;
    occurredAt?: Date | string | null;
    payload?: unknown;
    summary?: string | null;
  }>,
): Date | null {
  const times: number[] = [];
  for (const event of events) {
    if (!isDisbursedStageTransitionEvent(event)) continue;
    const at = parseTimestamp(event.occurredAt);
    if (at) times.push(at.getTime());
  }
  if (times.length === 0) return null;
  return new Date(Math.min(...times));
}

export function isDisbursedStageTransitionEvent(event: {
  eventType?: string | null;
  payload?: unknown;
  summary?: string | null;
}): boolean {
  const payload =
    event.payload && typeof event.payload === "object" && !Array.isArray(event.payload)
      ? (event.payload as Record<string, unknown>)
      : {};
  if (payload.toGrossStage === "disbursed") return true;
  if (event.eventType !== "stage_transition") return false;
  return /→\s*disbursed\b/i.test(String(event.summary ?? ""));
}

/**
 * Authority for a Deal already in Disbursed with no PDC schedule:
 * disbursedAt → stageEnteredAt (current disbursed only) → timeline.
 */
export function resolveHistoricalDisbursedTransitionAt(input: {
  grossStage: string;
  disbursedAt?: Date | string | null;
  stageEnteredAt?: Date | string | null;
  disbursedTimelineOccurredAt?: Date | string | null;
}): HistoricalDisbursedClock | null {
  const disbursedAt = parseTimestamp(input.disbursedAt);
  if (disbursedAt) {
    return { at: disbursedAt, source: "disbursedAt" };
  }
  if (isCanonicalDisbursedStage(input.grossStage)) {
    const entered = parseTimestamp(input.stageEnteredAt);
    if (entered) {
      return { at: entered, source: "stageEnteredAt" };
    }
  }
  const timeline = parseTimestamp(input.disbursedTimelineOccurredAt);
  if (timeline) {
    return { at: timeline, source: "timeline" };
  }
  return null;
}
