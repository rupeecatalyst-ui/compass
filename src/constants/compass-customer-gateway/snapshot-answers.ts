/**
 * Product-aware COMPASS journey answers.
 * Persist only fields the product actually collects — never shared UI defaults.
 */

import {
  getCompassProductDefinition,
  type CompassProductCode,
} from "@/constants/compass-customer-gateway/product-registry";

const CORE_KEYS = ["loanAmount", "mobile", "otpVerified", "city", "displayName", "personalEmail"] as const;

/**
 * Name and email are journey stages, not published question ids.
 * They stay server-validated identity fields. They are not a product allow-list.
 */
const PUBLISHED_JOURNEY_IDENTITY_KEYS = ["displayName", "personalEmail"] as const;

export type CompassAnswerAuthority = "legacy" | "published";

export function publishedJourneyAnswerAuthority(config: {
  dtoSource?: string | null;
  journeyVersion?: number | null;
} | null | undefined): CompassAnswerAuthority {
  return config?.dtoSource === "published_product_journey" &&
    typeof config.journeyVersion === "number" &&
    config.journeyVersion > 0
    ? "published"
    : "legacy";
}

export function compassPersistedAnswerKeys(productCode: CompassProductCode): Set<string> {
  const definition = getCompassProductDefinition(productCode);
  const keys = new Set<string>(CORE_KEYS);
  keys.add("approxCibilScore");
  keys.add("employmentTypeCode");

  if (definition.borrowerKind === "individual") {
    keys.add("incomeType");
    keys.add("monthlyIncome");
    keys.add("existingEmi");
  }

  if (definition.compassCode === "home-loan" || definition.compassCode === "home-loan-balance-transfer") {
    keys.add("propertyType");
    keys.add("propertyValue");
    keys.add("loanPurpose");
    keys.add("builderSource");
    keys.add("constructionStatus");
    keys.add("propertyKind");
    keys.add("occupancy");
    keys.add("pincode");
    keys.add("pincodeCertainty");
    keys.add("dateOfBirth");
    keys.add("residency");
    keys.add("coApplicantDecision");
    keys.add("coApplicantRelationship");
    keys.add("coApplicantDob");
    keys.add("coApplicantEmployment");
    keys.add("coApplicantIncome");
    keys.add("coApplicantExistingEmi");
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
    keys.add("topUpChoice");
    keys.add("topUpAmount");
    keys.add("topUpAmountCertainty");
    keys.add("topUpPurpose");
    keys.add("originalSanctionedAmount");
    keys.add("originalSanctionedCertainty");
    keys.add("outstandingCertainty");
    keys.add("loanStartDate");
    keys.add("loanStartDateCertainty");
    keys.add("currentRoi");
    keys.add("currentRoiCertainty");
    keys.add("rateType");
    keys.add("currentEmi");
    keys.add("currentEmiCertainty");
    keys.add("remainingTenureMonths");
    keys.add("remainingTenureCertainty");
    keys.add("originalTenureMonths");
    keys.add("originalTenureCertainty");
    keys.add("repaymentTrack");
    keys.add("delayedEmiCount");
    keys.add("delayedEmiCountCertainty");
    keys.add("possessionStatus");
    keys.add("registrationStatus");
    keys.add("propertyKind");
    keys.add("propertyValueCertainty");
  }

  if (definition.compassCode === "personal-loan") {
    keys.add("loanPurpose");
  }

  return keys;
}

export function sanitizeCompassJourneyAnswers(
  productCode: CompassProductCode,
  answers: Record<string, string | number | boolean | null | undefined>,
  configuredFieldIds?: readonly string[],
  authority: CompassAnswerAuthority = "legacy",
): Record<string, string | number | boolean | null> {
  const out: Record<string, string | number | boolean | null> = {};
  if (authority === "published") {
    const published = new Set(configuredFieldIds ?? []);
    const identity = new Set<string>(PUBLISHED_JOURNEY_IDENTITY_KEYS);
    for (const [key, raw] of Object.entries(answers)) {
      if (raw == null) continue;
      if (typeof raw === "string" && !raw.trim()) continue;
      if (!published.has(key) && !identity.has(key)) continue;
      out[key] = raw;
    }
    return out;
  }

  const allowed = compassPersistedAnswerKeys(productCode);
  const published = configuredFieldIds ? new Set(configuredFieldIds) : null;
  for (const [key, raw] of Object.entries(answers)) {
    if (!allowed.has(key) || raw == null) continue;
    if (published && !published.has(key)) continue;
    if (typeof raw === "string" && !raw.trim()) continue;
    out[key] = raw;
  }
  return out;
}
