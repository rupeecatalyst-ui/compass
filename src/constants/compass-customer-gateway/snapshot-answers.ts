/**
 * Product-aware COMPASS journey answers.
 * Persist only fields the product actually collects — never shared UI defaults.
 */

import {
  getCompassProductDefinition,
  type CompassProductCode,
} from "@/constants/compass-customer-gateway/product-registry";

const CORE_KEYS = ["loanAmount", "mobile", "otpVerified", "city"] as const;

export function compassPersistedAnswerKeys(productCode: CompassProductCode): Set<string> {
  const definition = getCompassProductDefinition(productCode);
  const keys = new Set<string>(CORE_KEYS);

  if (definition.borrowerKind === "individual") {
    keys.add("incomeType");
    keys.add("monthlyIncome");
    keys.add("existingEmi");
  }

  if (definition.compassCode === "home-loan" || definition.compassCode === "home-loan-balance-transfer") {
    keys.add("propertyType");
    keys.add("propertyValue");
  }

  if (definition.compassCode === "loan-against-property") {
    keys.add("propertyUsage");
    keys.add("propertyValue");
  }

  if (definition.hasBusinessFields) {
    keys.add("companyName");
    keys.add("constitution");
  }

  if (definition.hasBusinessFields && !definition.hasProjectFields) {
    keys.add("annualTurnover");
  }

  if (definition.hasFacilityFields) {
    keys.add("facilityType");
  }

  if (definition.hasProjectFields) {
    keys.add("projectCost");
  }

  if (definition.transactionType === "balance_transfer") {
    keys.add("currentLender");
    keys.add("currentLendingInstitution");
    keys.add("outstandingLoanAmount");
    keys.add("outstandingLoanAmountLabel");
  }

  if (definition.compassCode === "personal-loan") {
    keys.add("loanPurpose");
  }

  return keys;
}

export function sanitizeCompassJourneyAnswers(
  productCode: CompassProductCode,
  answers: Record<string, string | number | boolean | null | undefined>,
): Record<string, string | number | boolean | null> {
  const allowed = compassPersistedAnswerKeys(productCode);
  const out: Record<string, string | number | boolean | null> = {};
  for (const [key, raw] of Object.entries(answers)) {
    if (!allowed.has(key) || raw == null) continue;
    if (typeof raw === "string" && !raw.trim()) continue;
    out[key] = raw;
  }
  return out;
}
