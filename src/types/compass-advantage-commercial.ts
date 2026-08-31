/**
 * COMPASS Advantage commercial rule engine — Catalyst One domain types.
 * Calculation authority lives here. COMPASS renders the DTO only.
 */

export const COMPASS_ADVANTAGE_SCHEDULE_STATUSES = [
  "draft",
  "published",
  "suspended",
  "retired",
] as const;

export type CompassAdvantageScheduleStatus = (typeof COMPASS_ADVANTAGE_SCHEDULE_STATUSES)[number];

export const COMPASS_ADVANTAGE_CALCULATION_STATUSES = [
  "ready",
  "not_available",
  "product_not_applicable",
  "product_inactive",
  "schedule_suspended",
  "schedule_retired",
  "amount_not_in_range",
  "required_inputs_unavailable",
] as const;

export type CompassAdvantageCalculationStatus =
  (typeof COMPASS_ADVANTAGE_CALCULATION_STATUSES)[number];

export type CompassAdvantageFixedBenefitInput = {
  id?: string;
  name: string;
  amountRupees: string;
  active: boolean;
  displayOrder: number;
  customerDescription?: string | null;
};

export type CompassAdvantageRangeInput = {
  id?: string;
  rangeFromRupees: string;
  rangeToRupees: string | null;
  noUpperLimit: boolean;
  percentageRate: string;
  customerDescription?: string | null;
  internalNote?: string | null;
  active: boolean;
  displayOrder: number;
  fixedBenefits: CompassAdvantageFixedBenefitInput[];
};

export type CompassAdvantageScheduleInput = {
  id?: string;
  productCode: string;
  versionNumber: number;
  status: CompassAdvantageScheduleStatus;
  advantageActive: boolean;
  effectiveFrom: string;
  effectiveTo?: string | null;
  changeReason?: string | null;
  ranges: CompassAdvantageRangeInput[];
};

export type CompassAdvantageMatchedRange = {
  rangeFromRupees: string;
  rangeToRupees: string | null;
  noUpperLimit: boolean;
  percentageRate: string;
  customerDescription: string | null;
  displayOrder: number;
};

export type CompassAdvantageFixedBenefitResult = {
  name: string;
  amountRupees: string;
  customerDescription: string | null;
};

export type CompassAdvantageCalculationResult = {
  status: CompassAdvantageCalculationStatus;
  reason: string;
  applies: boolean;
  currency: "INR";
  productCode: string;
  requestedLoanAmount: string | null;
  matchedRange: CompassAdvantageMatchedRange | null;
  percentageRate: string | null;
  percentageBenefitAmount: string | null;
  fixedBenefitComponents: CompassAdvantageFixedBenefitResult[];
  totalFixedBenefitAmount: string | null;
  totalAdvantageAmount: string | null;
  customerExplanation: string;
  scheduleId: string | null;
  scheduleVersion: number | null;
  effectiveFrom: string | null;
};

export type CompassAdvantagePin = {
  scheduleId: string | null;
  versionNumber: number | null;
  productCode: string;
  caseReceivedAt: string;
  pinnedAt: string;
  noScheduleAtCreate: boolean;
};

export type CompassAdvantagePublishValidation = {
  ok: boolean;
  errors: string[];
  uncoveredGaps: Array<{ fromRupees: string; toRupees: string | null }>;
};

export type CompassAdvantageWorkspaceProductSummary = {
  productCode: string;
  productLabel: string;
  advantageActive: boolean;
  currentPublishedVersion: number | null;
  currentPublishedStatus: CompassAdvantageScheduleStatus | null;
  effectiveFrom: string | null;
  draftVersion: number | null;
};
