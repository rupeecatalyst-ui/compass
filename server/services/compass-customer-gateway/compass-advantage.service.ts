/**
 * COMPASS Advantage gateway projection — Catalyst One commercial engine only.
 * No gateway-local rates, ranges, caps, or product eligibility formulas.
 */
import { resolveCompassAdvantageForOpportunity } from "@server/services/compass-advantage/compass-advantage-commercial.service";
import type { CompassAdvantageDto, CompassProductCode } from "@/types/compass-customer-gateway";

export async function computeCompassAdvantage(input: {
  organizationId: string;
  opportunityId: string;
  opportunityReference: string;
  productCode: CompassProductCode;
  loanAmount?: number;
  caseReceivedAt: Date;
  snapshot: unknown;
  persist?: boolean;
}): Promise<CompassAdvantageDto> {
  return resolveCompassAdvantageForOpportunity({
    organizationId: input.organizationId,
    opportunityId: input.opportunityId,
    opportunityReference: input.opportunityReference,
    compassProductCode: input.productCode,
    requestedLoanAmount: input.loanAmount,
    caseReceivedAt: input.caseReceivedAt,
    snapshot: input.snapshot,
    persist: input.persist !== false,
  });
}
