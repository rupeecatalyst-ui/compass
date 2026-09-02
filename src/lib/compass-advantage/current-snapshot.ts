/**
 * Current COMPASS Advantage result vs schedule pin.
 * Pin = published schedule identity. Current result = latest calculation for the
 * Opportunity’s current requested loan amount.
 */

import { compareExactDecimal, isValidNonNegativeDecimal, parseExactDecimal } from "./exact-decimal";

export function canonicalAdvantageLoanAmount(value: unknown): string | null {
  if (value == null || value === "") return null;
  if (typeof value === "number") {
    if (!Number.isFinite(value) || value <= 0) return null;
    return String(Math.round(value));
  }
  const raw = typeof value === "object" && value !== null && "toString" in value ? value.toString() : String(value);
  const trimmed = raw.trim();
  if (!trimmed || !isValidNonNegativeDecimal(trimmed)) return null;
  const parsed = parseExactDecimal(trimmed);
  if (parsed.negative || parsed.digits === 0n) return null;
  if (parsed.scale === 0) return parsed.digits.toString();
  const whole = parsed.digits / 10n ** BigInt(parsed.scale);
  return whole === 0n ? null : whole.toString();
}

export function advantageLoanAmountsEqual(left: unknown, right: unknown): boolean {
  const a = canonicalAdvantageLoanAmount(left);
  const b = canonicalAdvantageLoanAmount(right);
  if (a == null || b == null) return false;
  return compareExactDecimal(a, b) === 0;
}

export function shouldReuseCurrentAdvantageSnapshot(input: {
  existingRequestedLoanAmount: unknown;
  existingScheduleId?: string | null;
  existingScheduleVersion?: number | null;
  incomingRequestedLoanAmount: unknown;
  pinScheduleId?: string | null;
  pinVersionNumber?: number | null;
}): boolean {
  if (!advantageLoanAmountsEqual(input.existingRequestedLoanAmount, input.incomingRequestedLoanAmount)) {
    return false;
  }
  const existingSchedule = input.existingScheduleId ?? null;
  const pinSchedule = input.pinScheduleId ?? null;
  if (existingSchedule !== pinSchedule) return false;
  if (
    input.existingScheduleVersion != null &&
    input.pinVersionNumber != null &&
    input.existingScheduleVersion !== input.pinVersionNumber
  ) {
    return false;
  }
  return true;
}

export type AdvantageSnapshotWriteDecision = "reuse" | "create" | "replace" | "ignore-stale-request";

export function decideAdvantageSnapshotWrite(input: {
  hasExisting: boolean;
  reuse: boolean;
  existingCalculatedAt?: Date | null;
  requestStartedAt: Date;
}): AdvantageSnapshotWriteDecision {
  if (input.reuse && input.hasExisting) return "reuse";
  if (
    input.hasExisting &&
    input.existingCalculatedAt &&
    input.existingCalculatedAt.getTime() > input.requestStartedAt.getTime()
  ) {
    return "ignore-stale-request";
  }
  return input.hasExisting ? "replace" : "create";
}
