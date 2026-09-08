/**
 * Home Loan Balance Transfer journey values.
 * Unknown stays unknown. Never coerce missing technical values to zero.
 */

export type ValueCertainty = "exact" | "approximate" | "not_known";

export type RateType = "floating" | "fixed" | "hybrid" | "not_known";

export type CertaintyAmount = {
  valueRupees: number | null;
  certainty: ValueCertainty;
  raw: string | number | null;
};

export type CertaintyPercent = {
  valuePercent: number | null;
  certainty: ValueCertainty;
  raw: string | number | null;
};

export type CertaintyDate = {
  isoDate: string | null;
  certainty: ValueCertainty;
  raw: string | null;
};

export type CertaintyMonths = {
  months: number | null;
  certainty: ValueCertainty;
  raw: string | number | null;
};

export function parseCertainty(value: unknown): ValueCertainty | null {
  if (value === "exact" || value === "approximate" || value === "not_known") return value;
  return null;
}

export function parseRateType(value: unknown): RateType | null {
  if (value === "floating" || value === "fixed" || value === "hybrid" || value === "not_known") {
    return value;
  }
  return null;
}

function finiteNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const n = Number(value.replace(/,/g, ""));
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

/** Missing / not-known amounts stay null. Zero is not used as a stand-in for unknown. */
export function parseCertaintyAmount(
  value: unknown,
  certaintyRaw: unknown,
): CertaintyAmount {
  const certainty = parseCertainty(certaintyRaw) ?? (value == null || value === "" ? "not_known" : "exact");
  if (certainty === "not_known") {
    return { valueRupees: null, certainty, raw: value == null ? null : String(value) };
  }
  const n = finiteNumber(value);
  return {
    valueRupees: n == null ? null : Math.round(n),
    certainty,
    raw: value == null ? null : (typeof value === "number" ? value : String(value)),
  };
}

export function parseCertaintyPercent(value: unknown, certaintyRaw: unknown): CertaintyPercent {
  const certainty = parseCertainty(certaintyRaw) ?? (value == null || value === "" ? "not_known" : "exact");
  if (certainty === "not_known") {
    return { valuePercent: null, certainty, raw: value == null ? null : String(value) };
  }
  const n = finiteNumber(value);
  return {
    valuePercent: n,
    certainty,
    raw: value == null ? null : (typeof value === "number" ? value : String(value)),
  };
}

export function parseCertaintyMonths(value: unknown, certaintyRaw: unknown): CertaintyMonths {
  const certainty = parseCertainty(certaintyRaw) ?? (value == null || value === "" ? "not_known" : "exact");
  if (certainty === "not_known") {
    return { months: null, certainty, raw: value == null ? null : String(value) };
  }
  const n = finiteNumber(value);
  return {
    months: n == null ? null : Math.round(n),
    certainty,
    raw: value == null ? null : (typeof value === "number" ? value : String(value)),
  };
}

export function parseCertaintyDate(value: unknown, certaintyRaw: unknown): CertaintyDate {
  const certainty = parseCertainty(certaintyRaw) ?? (!value ? "not_known" : "exact");
  if (certainty === "not_known") {
    return { isoDate: null, certainty, raw: value == null ? null : String(value) };
  }
  const raw = typeof value === "string" && value.trim() ? value.trim() : null;
  if (!raw) return { isoDate: null, certainty, raw: null };
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return { isoDate: null, certainty, raw };
  return { isoDate: raw.slice(0, 10), certainty, raw };
}

export type SeasoningResult = {
  status: "met" | "not_met" | "unknown" | "not_applicable";
  seasoningMonths: number | null;
  requiredMonths: number | null;
};

/**
 * Seasoning is programme-specific. No universal seasoning is assumed.
 * Missing start date → unknown, never a fabricated fail or pass.
 */
export function evaluateProgrammeSeasoning(input: {
  loanStartIsoDate: string | null | undefined;
  loanStartCertainty?: ValueCertainty | null;
  requiredSeasoningMonths: number | null | undefined;
  now?: Date;
}): SeasoningResult {
  const required =
    input.requiredSeasoningMonths != null && Number.isFinite(input.requiredSeasoningMonths)
      ? Math.round(input.requiredSeasoningMonths)
      : null;
  if (required == null) {
    return { status: "not_applicable", seasoningMonths: null, requiredMonths: null };
  }
  if (input.loanStartCertainty === "not_known" || !input.loanStartIsoDate) {
    return { status: "unknown", seasoningMonths: null, requiredMonths: required };
  }
  const start = new Date(input.loanStartIsoDate);
  if (Number.isNaN(start.getTime())) {
    return { status: "unknown", seasoningMonths: null, requiredMonths: required };
  }
  const now = input.now ?? new Date();
  const months =
    (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth());
  const adjust = now.getDate() < start.getDate() ? -1 : 0;
  const seasoningMonths = Math.max(0, months + adjust);
  return {
    status: seasoningMonths >= required ? "met" : "not_met",
    seasoningMonths,
    requiredMonths: required,
  };
}

export type IndicativeSavingResult = {
  monthlyDifferenceRupees: number | null;
  indicativeSavingRupees: number | null;
  suppressed: boolean;
  suppressReason: string | null;
};

/**
 * Savings and break-even are shown only when EMI, remaining tenure and comparable rates exist.
 * Foreclosure charges, processing fees and other costs are never invented.
 */
export function calculateIndicativeBtSaving(input: {
  currentEmiRupees: number | null | undefined;
  currentEmiCertainty?: ValueCertainty | null;
  remainingTenureMonths: number | null | undefined;
  remainingTenureCertainty?: ValueCertainty | null;
  currentRoiPercent: number | null | undefined;
  currentRoiCertainty?: ValueCertainty | null;
  proposedEmiRupees: number | null | undefined;
}): IndicativeSavingResult {
  const missing: string[] = [];
  if (input.currentEmiCertainty === "not_known" || input.currentEmiRupees == null) {
    missing.push("current EMI");
  }
  if (input.remainingTenureCertainty === "not_known" || input.remainingTenureMonths == null) {
    missing.push("remaining tenure");
  }
  if (input.currentRoiCertainty === "not_known" || input.currentRoiPercent == null) {
    missing.push("current ROI");
  }
  if (input.proposedEmiRupees == null) missing.push("proposed EMI");
  if (missing.length > 0) {
    return {
      monthlyDifferenceRupees: null,
      indicativeSavingRupees: null,
      suppressed: true,
      suppressReason: `Indicative saving is not shown because ${missing.join(", ")} ${missing.length === 1 ? "is" : "are"} not available. Foreclosure charges and fees are not assumed.`,
    };
  }
  const monthly = Math.round((input.currentEmiRupees as number) - (input.proposedEmiRupees as number));
  return {
    monthlyDifferenceRupees: monthly,
    indicativeSavingRupees: monthly * (input.remainingTenureMonths as number),
    suppressed: false,
    suppressReason: null,
  };
}

export function shouldAskOriginalTenure(input: {
  remainingTenureMonths: number | null | undefined;
  remainingTenureCertainty?: ValueCertainty | null;
}): boolean {
  return (
    input.remainingTenureCertainty === "not_known" ||
    input.remainingTenureMonths == null
  );
}

export function shouldAskDelayedEmiCount(repaymentTrack: string | null | undefined): boolean {
  return repaymentTrack === "no";
}

export function shouldAskTopUpAmount(topUpChoice: string | null | undefined): boolean {
  return topUpChoice === "with_topup";
}

/** Top-up purpose is asked only when a verified active programme requires it. */
export function shouldAskTopUpPurpose(input: {
  topUpChoice: string | null | undefined;
  programmeRequiresTopUpPurpose: boolean;
}): boolean {
  return input.topUpChoice === "with_topup" && input.programmeRequiresTopUpPurpose;
}

export function shouldAskRegistrationStatus(input: {
  constructionStatus?: string | null;
  possessionStatus?: string | null;
}): boolean {
  if (input.possessionStatus === "possessed") return true;
  if (input.constructionStatus === "ready") return true;
  if (input.constructionStatus === "under_construction" || input.constructionStatus === "newly_launched") {
    return false;
  }
  return Boolean(input.constructionStatus);
}

export function listMissingBtInformation(answers: {
  currentLender?: string | null;
  originalSanctionedAmount?: number | null;
  originalSanctionedCertainty?: ValueCertainty | null;
  outstandingLoanAmount?: number | null;
  outstandingCertainty?: ValueCertainty | null;
  loanStartDate?: string | null;
  loanStartDateCertainty?: ValueCertainty | null;
  currentRoi?: number | null;
  currentRoiCertainty?: ValueCertainty | null;
  rateType?: RateType | null;
  currentEmi?: number | null;
  currentEmiCertainty?: ValueCertainty | null;
  remainingTenureMonths?: number | null;
  remainingTenureCertainty?: ValueCertainty | null;
  repaymentTrack?: string | null;
  propertyValue?: number | null;
  propertyValueCertainty?: ValueCertainty | null;
  city?: string | null;
  pincode?: string | null;
  propertyKind?: string | null;
  constructionStatus?: string | null;
  occupancy?: string | null;
  possessionStatus?: string | null;
}): string[] {
  const missing: string[] = [];
  const unknown = (label: string, value: unknown, certainty?: ValueCertainty | null) => {
    if (certainty === "not_known" || value == null || value === "") missing.push(label);
  };
  unknown("Current lender", answers.currentLender);
  unknown("Original sanctioned amount", answers.originalSanctionedAmount, answers.originalSanctionedCertainty);
  unknown("Current principal outstanding", answers.outstandingLoanAmount, answers.outstandingCertainty);
  unknown("Loan start / disbursement date", answers.loanStartDate, answers.loanStartDateCertainty);
  unknown("Current ROI", answers.currentRoi, answers.currentRoiCertainty);
  if (!answers.rateType || answers.rateType === "not_known") missing.push("Interest-rate type");
  unknown("Current EMI", answers.currentEmi, answers.currentEmiCertainty);
  unknown("Remaining tenure", answers.remainingTenureMonths, answers.remainingTenureCertainty);
  unknown("Repayment track", answers.repaymentTrack);
  unknown("Estimated property value", answers.propertyValue, answers.propertyValueCertainty);
  unknown("Property location", answers.city);
  unknown("Pincode", answers.pincode);
  unknown("Property type", answers.propertyKind);
  unknown("Construction status", answers.constructionStatus);
  unknown("Occupancy", answers.occupancy);
  unknown("Possession status", answers.possessionStatus);
  return missing;
}
