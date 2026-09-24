import { calculateReducingBalanceEmi, calculateEffectiveTenureMonths } from "@/lib/home-loan-recommendation/tenure";
import { calculateSalariedFoir } from "@/lib/home-loan-recommendation/foir";
import { MATCH_PERCENT_CRITERION_REASONS } from "./match-percent-reasons";
import type { CriterionEvaluationContext } from "./types";

const positive = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value) && value > 0;
const nonnegative = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value) && value >= 0;

export function contributingCoApplicantIncomeRupees(input: {
  acceptsCoApplicantIncome: boolean | null | undefined;
  coApplicantDecision: string | null | undefined;
  coApplicantIncomeRupees: number | null | undefined;
}): number {
  if (input.acceptsCoApplicantIncome !== true) return 0;
  if (input.coApplicantDecision !== "yes") return 0;
  if (!positive(input.coApplicantIncomeRupees)) return 0;
  return input.coApplicantIncomeRupees;
}

export function ageYearsToMonths(ageYears: number | null | undefined): number | null {
  if (!positive(ageYears)) return null;
  return Math.round(ageYears * 12);
}

export function resolveEffectiveAvailableTenureMonths(input: {
  ageYears?: number | null;
  applicantAgeMonths?: number | null;
  programmeMaxTenureMonths?: number | null;
  maxAgeAtMaturityYears?: number | null;
  effectiveTenureMonths?: number | null;
}): {
  effectiveAvailableTenureMonths: number | null;
  agePermittedTenureMonths: number | null;
  programmeMaxTenureMonths: number | null;
} {
  if (positive(input.effectiveTenureMonths)) {
    const ageMonths = input.applicantAgeMonths ?? ageYearsToMonths(input.ageYears);
    const agePermitted =
      input.maxAgeAtMaturityYears != null && ageMonths != null
        ? input.maxAgeAtMaturityYears * 12 - ageMonths
        : null;
    return {
      effectiveAvailableTenureMonths: Math.floor(input.effectiveTenureMonths),
      agePermittedTenureMonths: agePermitted != null && agePermitted > 0 ? agePermitted : agePermitted,
      programmeMaxTenureMonths: input.programmeMaxTenureMonths ?? null,
    };
  }
  const ageMonths = input.applicantAgeMonths ?? ageYearsToMonths(input.ageYears);
  if (input.maxAgeAtMaturityYears != null && ageMonths != null) {
    const agePermitted = input.maxAgeAtMaturityYears * 12 - ageMonths;
    if (agePermitted <= 0) {
      return {
        effectiveAvailableTenureMonths: null,
        agePermittedTenureMonths: agePermitted,
        programmeMaxTenureMonths: input.programmeMaxTenureMonths ?? null,
      };
    }
  }
  const computed = calculateEffectiveTenureMonths({
    programmeMaxTenureMonths: input.programmeMaxTenureMonths ?? null,
    maxAgeAtMaturityYears: input.maxAgeAtMaturityYears ?? null,
    applicantAgeMonths: ageMonths,
  });
  return {
    effectiveAvailableTenureMonths: computed.effectiveTenureMonths,
    agePermittedTenureMonths: computed.components.ageBasedTenureMonths,
    programmeMaxTenureMonths: input.programmeMaxTenureMonths ?? null,
  };
}

export type HomeLoanMatchInputSource = {
  programmeId: string;
  requiredDocumentTypeIds?: string[] | null;
  maxDbrPercent?: string | number | null;
  minDbrPercent?: string | number | null;
  maxFoirPercent: string | number | null;
  minRoiPercent: string | number | null;
  maxRoiPercent?: string | number | null;
  minLtvPercent?: string | number | null;
  maxLtvPercent?: string | number | null;
  acceptsCoApplicantIncome?: boolean | null;
  requiredAmountRupees: number | null;
  assessedOfferRupees?: number | null;
  propertyValueRupees: number | null;
  monthlyIncomeRupees: number | null;
  existingMonthlyEmiRupees: number | null;
  customerSelectedTenureMonths?: number | null;
  effectiveTenureMonths?: number | null;
  programmeMaxTenureMonths?: number | null;
  maxAgeAtMaturityYears?: number | null;
  ageYears?: number | null;
  applicantAgeMonths?: number | null;
  coApplicantDecision?: string | null;
  coApplicantIncomeRupees?: number | null;
  coApplicantExistingMonthlyEmiRupees?: number | null;
  highestEffectiveAvailableTenureMonthsAmongEligible?: number | null;
  lowestApplicableRoiPercentAmongEligible?: number | null;
};

function buildOneContext(
  source: HomeLoanMatchInputSource,
  peers?: {
    highestEffectiveAvailableTenureMonthsAmongEligible: number | null;
    lowestApplicableRoiPercentAmongEligible: number | null;
  },
): CriterionEvaluationContext | { error: string } {
  if (!positive(source.monthlyIncomeRupees)) return { error: "monthlyIncome" };
  if (!nonnegative(source.existingMonthlyEmiRupees)) return { error: "obligations" };
  if (!positive(source.requiredAmountRupees)) return { error: "requestedAmount" };
  if (!positive(source.propertyValueRupees)) return { error: "propertyValue" };

  const assessed = positive(source.assessedOfferRupees) ? source.assessedOfferRupees : source.requiredAmountRupees;
  const tenure = resolveEffectiveAvailableTenureMonths(source);
  const tenureMonths =
    tenure.effectiveAvailableTenureMonths ??
    (positive(source.customerSelectedTenureMonths) && Number.isInteger(source.customerSelectedTenureMonths)
      ? source.customerSelectedTenureMonths
      : null);

  const roi = source.minRoiPercent == null ? null : Number(source.minRoiPercent);
  const comparableRoi = roi != null && Number.isFinite(roi) ? roi : null;
  const foirNorm = source.maxFoirPercent == null ? null : Number(source.maxFoirPercent);
  if (foirNorm != null && !Number.isFinite(foirNorm)) return { error: "PROGRAMME_CONFIGURATION_INVALID" };

  const coIncome = contributingCoApplicantIncomeRupees({
    acceptsCoApplicantIncome: source.acceptsCoApplicantIncome,
    coApplicantDecision: source.coApplicantDecision,
    coApplicantIncomeRupees: source.coApplicantIncomeRupees,
  });
  const income = source.monthlyIncomeRupees + coIncome;
  const obligations =
    source.existingMonthlyEmiRupees +
    (source.coApplicantDecision === "yes" ? (source.coApplicantExistingMonthlyEmiRupees ?? 0) : 0);
  const emi =
    comparableRoi != null && tenureMonths != null
      ? calculateReducingBalanceEmi({
          principalRupees: assessed,
          annualRoiPercent: comparableRoi,
          tenureMonths,
        })
      : null;
  const foir =
    foirNorm != null
      ? calculateSalariedFoir({
          eligibleMonthlyIncomeRupees: income,
          existingMonthlyEmiRupees: obligations,
          proposedMonthlyEmiRupees: emi,
          maxFoirPercent: foirNorm,
        })
      : null;
  const actualLtv = (assessed / source.propertyValueRupees) * 100;
  const maxLtv = source.maxLtvPercent == null ? null : Number(source.maxLtvPercent);
  const highestTenure =
    peers?.highestEffectiveAvailableTenureMonthsAmongEligible ??
    source.highestEffectiveAvailableTenureMonthsAmongEligible ??
    tenure.effectiveAvailableTenureMonths ??
    tenureMonths;
  const lowestRoi =
    peers?.lowestApplicableRoiPercentAmongEligible ?? source.lowestApplicableRoiPercentAmongEligible ?? comparableRoi;

  return {
    programmeId: source.programmeId,
    eligibleAmountInputs: {
      assessedOfferRupees: assessed,
      requiredAmountRupees: source.requiredAmountRupees,
    },
    tenureAvailabilityInputs: {
      effectiveAvailableTenureMonths: tenure.effectiveAvailableTenureMonths ?? tenureMonths,
      highestEffectiveAvailableTenureMonthsAmongEligible: highestTenure,
      ageYears: source.ageYears ?? null,
      programmeMaxTenureMonths: tenure.programmeMaxTenureMonths,
      agePermittedTenureMonths: tenure.agePermittedTenureMonths,
    },
    foirFitInputs: {
      calculatedFoirPercent: foir?.foirPercent ?? null,
      programmeFoirNormPercent: foirNorm,
      aboveProgrammeNorm: foir?.withinProgrammeCap === false,
      obligationsRupees: obligations,
      proposedEmiRupees: emi,
      eligibleMonthlyIncomeRupees: income,
      coApplicantIncomeUsed: coIncome > 0,
    },
    roiCompetitivenessInputs: {
      applicableRoiPercent: comparableRoi,
      programmeMinRoiPercent: comparableRoi,
      programmeMaxRoiPercent: source.maxRoiPercent == null ? null : Number(source.maxRoiPercent),
      lowestApplicableRoiPercentAmongEligible: lowestRoi,
      pendingReason:
        comparableRoi == null ? MATCH_PERCENT_CRITERION_REASONS.APPLICABLE_ROI_UNAVAILABLE : undefined,
    },
    ltvFitInputs: {
      requestedLtvPercent: (source.requiredAmountRupees / source.propertyValueRupees) * 100,
      actualLtvPercent: actualLtv,
      assessedOfferRupees: assessed,
      propertyValueRupees: source.propertyValueRupees,
      programmeMaxLtvPercent: maxLtv,
      programmeMinLtvPercent: source.minLtvPercent == null ? null : Number(source.minLtvPercent),
      pendingReason: MATCH_PERCENT_CRITERION_REASONS.LTV_SCORING_CONTRACT_PENDING,
    },
    // Explicitly excluded from scoring. Presence here is for proof that they are not read by the scorer.
    excludedDocumentTypeIds: source.requiredDocumentTypeIds ?? null,
    excludedDbrPercent: source.maxDbrPercent ?? source.minDbrPercent ?? null,
  };
}

/**
 * Product-specific Match % input preparation for Home Loan.
 * Documents and DBR are captured only to prove they are excluded from scoring context.
 */
export function buildHomeLoanMatchPercentContext(
  source: HomeLoanMatchInputSource,
): CriterionEvaluationContext | { error: string } {
  return buildOneContext(source);
}

export function buildHomeLoanMatchPercentContexts(
  sources: readonly HomeLoanMatchInputSource[],
): Array<CriterionEvaluationContext | { error: string }> {
  const prepared = sources.map((source) => {
    const tenure = resolveEffectiveAvailableTenureMonths(source);
    const roi = source.minRoiPercent == null ? null : Number(source.minRoiPercent);
    return {
      source,
      tenureMonths: tenure.effectiveAvailableTenureMonths,
      roi: roi != null && Number.isFinite(roi) ? roi : null,
    };
  });
  const validTenures = prepared
    .map((row) => row.tenureMonths)
    .filter((value): value is number => value != null && value > 0);
  const validRois = prepared.map((row) => row.roi).filter((value): value is number => value != null);
  const peers = {
    highestEffectiveAvailableTenureMonthsAmongEligible: validTenures.length ? Math.max(...validTenures) : null,
    lowestApplicableRoiPercentAmongEligible: validRois.length ? Math.min(...validRois) : null,
  };
  return sources.map((source) => buildOneContext(source, peers));
}
