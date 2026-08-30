/**
 * COMPASS Advantage — gateway projection of the Catalyst One engine.
 * No gateway-local commercial arithmetic.
 */
import { computeEnterpriseCompassAdvantage } from "@/lib/compass-advantage";
import type { CompassAdvantageDto, CompassProductCode } from "@/types/compass-customer-gateway";

export function computeCompassAdvantage(input: {
  productCode: CompassProductCode;
  loanAmount?: number;
  monthlyIncome?: number;
  propertyValue?: number;
  propertyType?: "ready" | "construction";
  existingEmi?: number;
}): CompassAdvantageDto {
  return computeEnterpriseCompassAdvantage(input);
}
