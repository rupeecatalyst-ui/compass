import type { CompassAdvantagePin, CompassAdvantageScheduleInput } from "@/types/compass-advantage-commercial";
import { isScheduleEffectiveAt } from "./validate";

export function pickEffectiveSchedule(
  schedules: CompassAdvantageScheduleInput[],
  productCode: string,
  caseReceivedAt: Date,
): CompassAdvantageScheduleInput | null {
  const candidates = schedules.filter(
    (schedule) =>
      schedule.productCode === productCode && isScheduleEffectiveAt(schedule, caseReceivedAt),
  );
  if (candidates.length === 0) return null;
  candidates.sort((a, b) => {
    const from = new Date(b.effectiveFrom).getTime() - new Date(a.effectiveFrom).getTime();
    if (from !== 0) return from;
    return b.versionNumber - a.versionNumber;
  });
  return candidates[0] ?? null;
}

export function buildAdvantagePin(input: {
  productCode: string;
  caseReceivedAt: Date;
  schedule: CompassAdvantageScheduleInput | null;
  pinnedAt?: Date;
}): CompassAdvantagePin {
  const pinnedAt = input.pinnedAt ?? new Date();
  return {
    scheduleId: input.schedule?.id ?? null,
    versionNumber: input.schedule?.versionNumber ?? null,
    productCode: input.productCode,
    caseReceivedAt: input.caseReceivedAt.toISOString(),
    pinnedAt: pinnedAt.toISOString(),
    noScheduleAtCreate: !input.schedule,
  };
}

export function pinAlreadySet(snapshot: unknown): CompassAdvantagePin | null {
  if (!snapshot || typeof snapshot !== "object") return null;
  const pin = (snapshot as Record<string, unknown>).compassAdvantagePin;
  if (!pin || typeof pin !== "object") return null;
  const record = pin as Record<string, unknown>;
  if (typeof record.productCode !== "string") return null;
  if (typeof record.caseReceivedAt !== "string") return null;
  if (typeof record.pinnedAt !== "string") return null;
  return {
    scheduleId: typeof record.scheduleId === "string" ? record.scheduleId : null,
    versionNumber: typeof record.versionNumber === "number" ? record.versionNumber : null,
    productCode: record.productCode,
    caseReceivedAt: record.caseReceivedAt,
    pinnedAt: record.pinnedAt,
    noScheduleAtCreate: Boolean(record.noScheduleAtCreate),
  };
}

export function mergePinIntoSnapshot(
  snapshot: unknown,
  pin: CompassAdvantagePin,
): Record<string, unknown> {
  const base =
    snapshot && typeof snapshot === "object" && !Array.isArray(snapshot)
      ? { ...(snapshot as Record<string, unknown>) }
      : {};
  if (pinAlreadySet(base)) return base;
  return { ...base, compassAdvantagePin: pin };
}
