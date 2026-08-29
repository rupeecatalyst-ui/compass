/**
 * COMPASS Advantage — Catalyst One projection only.
 * No gateway-local commercial arithmetic. Returns not_available until C1 engine exists.
 */
import type { CompassAdvantageDto, CompassProductCode } from "@/types/compass-customer-gateway";

function isAdvantageProduct(productCode: CompassProductCode): boolean {
  return productCode === "home-loan" || productCode === "home-loan-balance-transfer";
}

export function computeCompassAdvantage(input: {
  productCode: CompassProductCode;
  loanAmount?: number;
  monthlyIncome?: number;
  propertyValue?: number;
  propertyType?: "ready" | "construction";
  existingEmi?: number;
}): CompassAdvantageDto {
  if (!isAdvantageProduct(input.productCode)) {
    return {
      eligible: false,
      status: "not_available",
      title: "Not applicable",
      amount: null,
      amountFormatted: null,
      disclaimer: "COMPASS Advantage applies only to New Home Loan and Home Loan Balance Transfer.",
      productCode: input.productCode,
      dtoSource: "enterprise_compass_advantage",
    };
  }

  return {
    eligible: false,
    status: "not_available",
    title: "COMPASS Advantage",
    amount: null,
    amountFormatted: null,
    disclaimer:
      "COMPASS Advantage is calculated by Catalyst One when the enterprise commercial engine is configured for your application. An indicative amount is not available at this stage.",
    productCode: input.productCode,
    dtoSource: "enterprise_compass_advantage",
  };
}
