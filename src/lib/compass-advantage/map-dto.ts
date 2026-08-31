/**
 * Map a commercial calculation result onto the COMPASS gateway DTO.
 * COMPASS must display these fields and must not recalculate them.
 */

import { COMPASS_ADVANTAGE_DISCLAIMER, COMPASS_ADVANTAGE_TITLE } from "@/constants/compass-advantage/schedule";
import { formatInrFromRupees } from "@/lib/compass-advantage/exact-decimal";
import type { CompassAdvantageCalculationResult } from "@/types/compass-advantage-commercial";
import type { CompassAdvantageDto, CompassProductCode } from "@/types/compass-customer-gateway";

export function toCompassAdvantageDto(
  productCode: CompassProductCode,
  result: CompassAdvantageCalculationResult,
  extras?: {
    caseReceivedAt?: string | null;
    calculatedAt?: string | null;
  },
): CompassAdvantageDto {
  const ready = result.applies && result.status === "ready" && result.totalAdvantageAmount != null;
  const gatewayStatus = ready ? "ready" : result.status === "product_not_applicable" ? "ineligible" : "not_available";
  const displayStatus =
    result.status === "required_inputs_unavailable"
      ? "ineligible"
      : result.status === "product_not_applicable"
        ? "ineligible"
        : gatewayStatus;

  return {
    eligible: ready,
    status: displayStatus,
    title: COMPASS_ADVANTAGE_TITLE,
    amount: ready ? Number(result.totalAdvantageAmount) : null,
    amountFormatted: ready ? formatInrFromRupees(result.totalAdvantageAmount) : null,
    disclaimer: ready ? result.customerExplanation : result.customerExplanation || COMPASS_ADVANTAGE_DISCLAIMER,
    reason: result.reason,
    ruleId: result.scheduleId,
    productCode,
    dtoSource: "enterprise_compass_advantage",
    totalAdvantageAmount: ready ? result.totalAdvantageAmount : null,
    currency: result.currency,
    requestedLoanAmount: result.requestedLoanAmount,
    matchedRangeFrom: result.matchedRange?.rangeFromRupees ?? null,
    matchedRangeTo: result.matchedRange?.rangeToRupees ?? null,
    percentageRate: result.percentageRate,
    percentageBenefitAmount: ready ? result.percentageBenefitAmount : null,
    fixedBenefitComponents: ready ? result.fixedBenefitComponents : [],
    totalFixedBenefitAmount: ready ? result.totalFixedBenefitAmount : null,
    scheduleId: result.scheduleId,
    scheduleVersion: result.scheduleVersion,
    caseReceivedAt: extras?.caseReceivedAt ?? null,
    calculatedAt: extras?.calculatedAt ?? null,
    customerExplanation: result.customerExplanation,
    unavailableReason: ready ? null : result.reason,
  };
}
