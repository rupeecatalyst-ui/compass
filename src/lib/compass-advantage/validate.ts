import type {
  CompassAdvantagePublishValidation,
  CompassAdvantageRangeInput,
  CompassAdvantageScheduleInput,
} from "@/types/compass-advantage-commercial";
import { compareExactDecimal, isValidNonNegativeDecimal } from "./exact-decimal";

export function validateScheduleForPublication(
  schedule: CompassAdvantageScheduleInput,
): CompassAdvantagePublishValidation {
  const errors: string[] = [];
  if (!schedule.productCode?.trim()) {
    errors.push("A product must be selected.");
  }
  if (!Number.isInteger(schedule.versionNumber) || schedule.versionNumber < 1) {
    errors.push("Version number is required.");
  }
  if (!schedule.effectiveFrom) {
    errors.push("Effective-from timestamp is required.");
  }
  if (!schedule.changeReason?.trim()) {
    errors.push("A change reason is required before publication.");
  }

  const active = [...schedule.ranges]
    .filter((range) => range.active)
    .sort((a, b) => compareExactDecimal(a.rangeFromRupees, b.rangeFromRupees));

  for (const range of schedule.ranges) {
    if (!isValidNonNegativeDecimal(range.rangeFromRupees)) {
      errors.push("Every range must have a valid Range From amount.");
    }
    if (!range.noUpperLimit && (range.rangeToRupees == null || range.rangeToRupees === "")) {
      errors.push("Each range needs an upper limit or No Upper Limit.");
    }
    if (
      !range.noUpperLimit &&
      range.rangeToRupees &&
      isValidNonNegativeDecimal(range.rangeFromRupees) &&
      isValidNonNegativeDecimal(range.rangeToRupees) &&
      compareExactDecimal(range.rangeFromRupees, range.rangeToRupees) >= 0
    ) {
      errors.push("Range From must be less than Range To.");
    }
    if (!isValidNonNegativeDecimal(range.percentageRate)) {
      errors.push("Percentage of loan amount is missing or invalid.");
    }
    for (const benefit of range.fixedBenefits) {
      if (!benefit.name?.trim()) {
        errors.push("Every fixed benefit needs a name.");
      }
      if (!isValidNonNegativeDecimal(benefit.amountRupees)) {
        errors.push(`Fixed benefit "${benefit.name || "unnamed"}" has an invalid amount.`);
      }
      try {
        if (benefit.amountRupees.trim().startsWith("-")) {
          errors.push(`Fixed benefit "${benefit.name || "unnamed"}" cannot be negative.`);
        }
      } catch {
        /* already reported */
      }
    }
  }

  for (let i = 0; i < active.length; i += 1) {
    for (let j = i + 1; j < active.length; j += 1) {
      if (rangesOverlap(active[i], active[j])) {
        errors.push("Active ranges must not overlap.");
      }
    }
  }

  return {
    ok: errors.length === 0,
    errors: [...new Set(errors)],
    uncoveredGaps: describeGaps(active),
  };
}

export function rangesOverlap(a: CompassAdvantageRangeInput, b: CompassAdvantageRangeInput): boolean {
  const aEnd = a.noUpperLimit || !a.rangeToRupees ? null : a.rangeToRupees;
  const bEnd = b.noUpperLimit || !b.rangeToRupees ? null : b.rangeToRupees;
  const aStartsBeforeBEnds = bEnd == null || compareExactDecimal(a.rangeFromRupees, bEnd) < 0;
  const bStartsBeforeAEnds = aEnd == null || compareExactDecimal(b.rangeFromRupees, aEnd) < 0;
  return aStartsBeforeBEnds && bStartsBeforeAEnds;
}

export function isScheduleEffectiveAt(
  schedule: Pick<CompassAdvantageScheduleInput, "status" | "advantageActive" | "effectiveFrom" | "effectiveTo">,
  at: Date,
): boolean {
  if (schedule.status !== "published" || !schedule.advantageActive) return false;
  const from = new Date(schedule.effectiveFrom);
  if (Number.isNaN(from.getTime()) || from.getTime() > at.getTime()) return false;
  if (!schedule.effectiveTo) return true;
  const to = new Date(schedule.effectiveTo);
  return to.getTime() > at.getTime();
}

function describeGaps(
  activeSorted: CompassAdvantageRangeInput[],
): Array<{ fromRupees: string; toRupees: string | null }> {
  const gaps: Array<{ fromRupees: string; toRupees: string | null }> = [];
  if (activeSorted.length === 0) {
    return [{ fromRupees: "0", toRupees: null }];
  }
  if (compareExactDecimal(activeSorted[0].rangeFromRupees, "0") > 0) {
    gaps.push({ fromRupees: "0", toRupees: activeSorted[0].rangeFromRupees });
  }
  for (let i = 0; i < activeSorted.length - 1; i += 1) {
    const current = activeSorted[i];
    const next = activeSorted[i + 1];
    if (current.noUpperLimit || !current.rangeToRupees) continue;
    if (compareExactDecimal(current.rangeToRupees, next.rangeFromRupees) < 0) {
      gaps.push({ fromRupees: current.rangeToRupees, toRupees: next.rangeFromRupees });
    }
  }
  const last = activeSorted[activeSorted.length - 1];
  if (!last.noUpperLimit && last.rangeToRupees) {
    gaps.push({ fromRupees: last.rangeToRupees, toRupees: null });
  }
  return gaps;
}
