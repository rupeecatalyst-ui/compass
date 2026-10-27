/**
 * Published programme pricing range.
 * Minimum ROI is the rate used for ranking and illustrative EMI.
 * Maximum ROI is the upper end of the range only.
 * A generic roiPercent is not treated as Minimum ROI.
 */

export type MinimumRoiSource = "minRoiExact" | "minRoiPercent" | "absent";
export type MaximumRoiSource = "maxRoiExact" | "maxRoiPercent" | "absent";

function finiteRate(value: unknown): number | null {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  if (
    value &&
    typeof value === "object" &&
    "toNumber" in value &&
    typeof (value as { toNumber?: unknown }).toNumber === "function"
  ) {
    const parsed = (value as { toNumber: () => number }).toNumber();
    return typeof parsed === "number" && Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

export function authoritativeMinimumRoi(program: {
  minRoiExact?: unknown;
  minRoiPercent?: unknown;
}): { percent: number | null; source: MinimumRoiSource } {
  const exact = finiteRate(program.minRoiExact);
  if (exact != null) return { percent: exact, source: "minRoiExact" };
  const legacy = finiteRate(program.minRoiPercent);
  if (legacy != null) return { percent: legacy, source: "minRoiPercent" };
  return { percent: null, source: "absent" };
}

export function authoritativeMaximumRoi(program: {
  maxRoiExact?: unknown;
  maxRoiPercent?: unknown;
}): { percent: number | null; source: MaximumRoiSource } {
  const exact = finiteRate(program.maxRoiExact);
  if (exact != null) return { percent: exact, source: "maxRoiExact" };
  const legacy = finiteRate(program.maxRoiPercent);
  if (legacy != null) return { percent: legacy, source: "maxRoiPercent" };
  return { percent: null, source: "absent" };
}

/** Illustrative published range. The first number is the applicable minimum. */
export function illustrativePricingLabel(program: {
  minRoiExact?: unknown;
  minRoiPercent?: unknown;
  maxRoiExact?: unknown;
  maxRoiPercent?: unknown;
}): string | null {
  const minimum = authoritativeMinimumRoi(program);
  if (minimum.percent == null) return null;
  const floor = `${minimum.percent.toFixed(2)}%`;
  const maximum = authoritativeMaximumRoi(program);
  if (maximum.percent != null && maximum.percent !== minimum.percent) {
    return `Indicative ${floor} – ${maximum.percent.toFixed(2)}%`;
  }
  return `Indicative ${floor}`;
}
