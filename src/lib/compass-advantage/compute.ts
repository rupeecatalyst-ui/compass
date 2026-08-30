/**
 * COMPASS Advantage engine — Catalyst One SSOT.
 */

import type { CompassAdvantageDto, CompassProductCode } from "@/types/compass-customer-gateway";
import { getCompassProductDefinition } from "@/constants/compass-customer-gateway/product-registry";
import {
  COMPASS_ADVANTAGE_DISCLAIMER,
  COMPASS_ADVANTAGE_INDICATIVE_BPS,
  COMPASS_ADVANTAGE_MAX_AMOUNT,
  COMPASS_ADVANTAGE_MIN_AMOUNT,
  COMPASS_ADVANTAGE_RULE_ID,
  COMPASS_ADVANTAGE_TITLE,
} from "@/constants/compass-advantage/schedule";

function isAdvantageProduct(productCode: CompassProductCode): boolean {
  return getCompassProductDefinition(productCode).advantageEnabled;
}

export function isCompassAdvantageCommercialEffective(): boolean {
  const flag = process.env.COMPASS_ADVANTAGE_COMMERCIAL_ENABLED?.trim().toLowerCase();
  if (flag === "false" || flag === "0") return false;
  if (flag === "true" || flag === "1") return true;
  return process.env.VERCEL_ENV === "preview";
}

function formatInr(amount: number): string {
  return `₹${Math.round(amount).toLocaleString("en-IN")}`;
}

function dto(partial: Omit<CompassAdvantageDto, "dtoSource" | "title"> & { title?: string }): CompassAdvantageDto {
  return {
    title: partial.title ?? COMPASS_ADVANTAGE_TITLE,
    eligible: partial.eligible,
    status: partial.status,
    amount: partial.amount,
    amountFormatted: partial.amountFormatted,
    disclaimer: partial.disclaimer,
    reason: partial.reason ?? null,
    ruleId: partial.ruleId ?? null,
    productCode: partial.productCode,
    dtoSource: "enterprise_compass_advantage",
  };
}

export function calculateCompassAdvantageAmount(loanAmount: number): number {
  const raw = (loanAmount * COMPASS_ADVANTAGE_INDICATIVE_BPS) / 10_000;
  return Math.min(
    COMPASS_ADVANTAGE_MAX_AMOUNT,
    Math.max(COMPASS_ADVANTAGE_MIN_AMOUNT, Math.round(raw)),
  );
}

export function computeEnterpriseCompassAdvantage(input: {
  productCode: CompassProductCode;
  loanAmount?: number;
  monthlyIncome?: number;
  propertyValue?: number;
  propertyType?: "ready" | "construction";
  existingEmi?: number;
}): CompassAdvantageDto {
  if (!isAdvantageProduct(input.productCode)) {
    return dto({
      eligible: false,
      status: "ineligible",
      amount: null,
      amountFormatted: null,
      disclaimer: "COMPASS Advantage applies only to New Home Loan and Home Loan Balance Transfer.",
      reason: "product_not_applicable",
      productCode: input.productCode,
    });
  }

  const loanAmount = input.loanAmount ?? 0;
  const monthlyIncome = input.monthlyIncome ?? 0;
  const propertyValue = input.propertyValue ?? 0;

  if (!(loanAmount > 0)) {
    return dto({
      eligible: false,
      status: "ineligible",
      amount: null,
      amountFormatted: null,
      disclaimer: "Add your desired loan amount to see an indicative COMPASS Advantage.",
      reason: "loan_amount_required",
      ruleId: COMPASS_ADVANTAGE_RULE_ID,
      productCode: input.productCode,
    });
  }

  if (!(propertyValue > 0)) {
    return dto({
      eligible: false,
      status: "ineligible",
      amount: null,
      amountFormatted: null,
      disclaimer: "Add the property value to see an indicative COMPASS Advantage.",
      reason: "property_value_required",
      ruleId: COMPASS_ADVANTAGE_RULE_ID,
      productCode: input.productCode,
    });
  }

  if (!(monthlyIncome > 0)) {
    return dto({
      eligible: false,
      status: "ineligible",
      amount: null,
      amountFormatted: null,
      disclaimer: "Add your monthly income to see an indicative COMPASS Advantage.",
      reason: "monthly_income_required",
      ruleId: COMPASS_ADVANTAGE_RULE_ID,
      productCode: input.productCode,
    });
  }

  if (!isCompassAdvantageCommercialEffective()) {
    return dto({
      eligible: false,
      status: "not_available",
      amount: null,
      amountFormatted: null,
      disclaimer:
        "COMPASS Advantage is calculated by Catalyst One when the indicative commercial schedule is effective for this environment.",
      reason: "commercial_schedule_not_effective",
      ruleId: COMPASS_ADVANTAGE_RULE_ID,
      productCode: input.productCode,
    });
  }

  const amount = calculateCompassAdvantageAmount(loanAmount);
  return dto({
    eligible: true,
    status: "ready",
    amount,
    amountFormatted: formatInr(amount),
    disclaimer: COMPASS_ADVANTAGE_DISCLAIMER,
    reason: null,
    ruleId: COMPASS_ADVANTAGE_RULE_ID,
    productCode: input.productCode,
  });
}
