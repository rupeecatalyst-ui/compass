/**
 * Deterministic COMPASS Advantage calculator.
 * Consumes a versioned schedule. Does not invent rates, ranges, or caps.
 */

import type {
  CompassAdvantageCalculationResult,
  CompassAdvantageCalculationStatus,
  CompassAdvantageRangeInput,
  CompassAdvantageScheduleInput,
} from "@/types/compass-advantage-commercial";
import {
  addIntegerDecimals,
  compareExactDecimal,
  formatInrFromRupees,
  isValidNonNegativeDecimal,
  multiplyAmountByRateRoundHalfUp,
  rateToPercentDisplay,
} from "./exact-decimal";

const TITLE = "COMPASS Advantage";

export function amountMatchesRange(amountRupees: string, range: CompassAdvantageRangeInput): boolean {
  if (compareExactDecimal(amountRupees, range.rangeFromRupees) < 0) return false;
  if (range.noUpperLimit || range.rangeToRupees == null || range.rangeToRupees === "") {
    return true;
  }
  return compareExactDecimal(amountRupees, range.rangeToRupees) < 0;
}

export function findMatchingActiveRange(
  amountRupees: string,
  ranges: CompassAdvantageRangeInput[],
): CompassAdvantageRangeInput | null {
  const active = ranges.filter((range) => range.active);
  const matches = active.filter((range) => amountMatchesRange(amountRupees, range));
  if (matches.length !== 1) return null;
  return matches[0];
}

export function calculateAdvantageFromSchedule(input: {
  schedule: CompassAdvantageScheduleInput | null;
  productCode: string;
  requestedLoanAmount: string | null | undefined;
  unavailableStatus?: CompassAdvantageCalculationStatus;
  unavailableReason?: string;
}): CompassAdvantageCalculationResult {
  const productCode = input.productCode;
  const empty = (
    status: CompassAdvantageCalculationStatus,
    reason: string,
    explanation: string,
  ): CompassAdvantageCalculationResult => ({
    status,
    reason,
    applies: false,
    currency: "INR",
    productCode,
    requestedLoanAmount: input.requestedLoanAmount?.trim() || null,
    matchedRange: null,
    percentageRate: null,
    percentageBenefitAmount: null,
    fixedBenefitComponents: [],
    totalFixedBenefitAmount: null,
    totalAdvantageAmount: null,
    customerExplanation: explanation,
    scheduleId: input.schedule?.id ?? null,
    scheduleVersion: input.schedule?.versionNumber ?? null,
    effectiveFrom: input.schedule?.effectiveFrom ?? null,
  });

  if (input.unavailableStatus) {
    return empty(
      input.unavailableStatus,
      input.unavailableReason ?? input.unavailableStatus,
      explanationFor(input.unavailableStatus),
    );
  }

  if (!input.schedule) {
    return empty("not_available", "not_available", explanationFor("not_available"));
  }

  if (!input.schedule.advantageActive) {
    return empty("product_inactive", "product_inactive", explanationFor("product_inactive"));
  }

  if (input.schedule.status === "suspended") {
    return empty("schedule_suspended", "schedule_suspended", explanationFor("schedule_suspended"));
  }

  if (input.schedule.status === "retired") {
    return empty("schedule_retired", "schedule_retired", explanationFor("schedule_retired"));
  }

  if (input.schedule.status !== "published") {
    return empty("not_available", "draft_not_effective", explanationFor("not_available"));
  }

  const amount = input.requestedLoanAmount?.trim() ?? "";
  if (!amount || !isValidNonNegativeDecimal(amount) || compareExactDecimal(amount, "0") <= 0) {
    return empty(
      "required_inputs_unavailable",
      "loan_amount_required",
      "Add your desired loan amount to see COMPASS Advantage.",
    );
  }

  const range = findMatchingActiveRange(amount, input.schedule.ranges);
  if (!range) {
    return empty(
      "amount_not_in_range",
      "amount_not_in_range",
      "COMPASS Advantage is not applicable for this requested loan amount.",
    );
  }

  const percentageBenefit = multiplyAmountByRateRoundHalfUp(amount, range.percentageRate);
  const activeFixed = [...range.fixedBenefits]
    .filter((benefit) => benefit.active)
    .sort((a, b) => a.displayOrder - b.displayOrder);
  const fixedComponents = activeFixed.map((benefit) => ({
    name: benefit.name,
    amountRupees: benefit.amountRupees,
    customerDescription: benefit.customerDescription ?? null,
  }));
  const totalFixed = addIntegerDecimals(fixedComponents.map((item) => item.amountRupees));
  const total = addIntegerDecimals([percentageBenefit, totalFixed]);

  if (compareExactDecimal(total, "0") <= 0) {
    return empty(
      "amount_not_in_range",
      "zero_advantage_not_displayed",
      "COMPASS Advantage is not applicable for this requested loan amount.",
    );
  }

  const percentLabel = rateToPercentDisplay(range.percentageRate);
  const explanationParts = [
    `${TITLE} is ${formatInrFromRupees(percentageBenefit)} (${percentLabel}% of the requested loan amount)`,
  ];
  for (const component of fixedComponents) {
    explanationParts.push(`${component.name}: ${formatInrFromRupees(component.amountRupees)}`);
  }
  explanationParts.push(`Total COMPASS Advantage: ${formatInrFromRupees(total)}.`);
  explanationParts.push(
    "This is an Advantage offered to you. It is not a charge payable by you. It is not a sanctioned offer and remains subject to lender policy, documentation, and credit appraisal.",
  );

  return {
    status: "ready",
    reason: "ready",
    applies: true,
    currency: "INR",
    productCode,
    requestedLoanAmount: amount,
    matchedRange: {
      rangeFromRupees: range.rangeFromRupees,
      rangeToRupees: range.noUpperLimit ? null : range.rangeToRupees,
      noUpperLimit: range.noUpperLimit,
      percentageRate: range.percentageRate,
      customerDescription: range.customerDescription ?? null,
      displayOrder: range.displayOrder,
    },
    percentageRate: range.percentageRate,
    percentageBenefitAmount: percentageBenefit,
    fixedBenefitComponents: fixedComponents,
    totalFixedBenefitAmount: totalFixed,
    totalAdvantageAmount: total,
    customerExplanation: explanationParts.join(". "),
    scheduleId: input.schedule.id ?? null,
    scheduleVersion: input.schedule.versionNumber,
    effectiveFrom: input.schedule.effectiveFrom,
  };
}

function explanationFor(status: CompassAdvantageCalculationStatus): string {
  switch (status) {
    case "product_not_applicable":
      return "COMPASS Advantage is not configured for this product.";
    case "product_inactive":
      return "COMPASS Advantage is not currently active for this product.";
    case "schedule_suspended":
      return "COMPASS Advantage is temporarily unavailable for this product.";
    case "schedule_retired":
      return "COMPASS Advantage is not available for this product.";
    case "amount_not_in_range":
      return "COMPASS Advantage is not applicable for this requested loan amount.";
    case "required_inputs_unavailable":
      return "Add your desired loan amount to see COMPASS Advantage.";
    default:
      return "COMPASS Advantage is not available yet.";
  }
}
