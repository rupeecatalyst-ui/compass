import { calculateReducingBalanceEmi } from "@/lib/home-loan-recommendation/tenure";
import { calculateSalariedFoir } from "@/lib/home-loan-recommendation/foir";
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
  propertyValueRupees: number | null;
  monthlyIncomeRupees: number | null;
  existingMonthlyEmiRupees: number | null;
  customerSelectedTenureMonths: number | null;
  coApplicantDecision?: string | null;
  coApplicantIncomeRupees?: number | null;
  coApplicantExistingMonthlyEmiRupees?: number | null;
};

/**
 * Product-specific Match % input preparation for Home Loan.
 * Documents and DBR are captured only to prove they are excluded from scoring context.
 */
export function buildHomeLoanMatchPercentContext(source: HomeLoanMatchInputSource): CriterionEvaluationContext | { error: string } {
  if (!positive(source.monthlyIncomeRupees)) return { error: "monthlyIncome" };
  if (!nonnegative(source.existingMonthlyEmiRupees)) return { error: "obligations" };
  if (!positive(source.requiredAmountRupees)) return { error: "requestedAmount" };
  if (!positive(source.propertyValueRupees)) return { error: "propertyValue" };
  if (!positive(source.customerSelectedTenureMonths) || !Number.isInteger(source.customerSelectedTenureMonths)) {
    return { error: "requestedTenure" };
  }
  const roi = source.minRoiPercent == null ? null : Number(source.minRoiPercent);
  if (roi == null || !Number.isFinite(roi)) return { error: "PROGRAMME_CONFIGURATION_INVALID" };
  const foirNorm = source.maxFoirPercent == null ? null : Number(source.maxFoirPercent);
  if (foirNorm == null || !Number.isFinite(foirNorm)) return { error: "PROGRAMME_CONFIGURATION_INVALID" };

  const coIncome = contributingCoApplicantIncomeRupees({
    acceptsCoApplicantIncome: source.acceptsCoApplicantIncome,
    coApplicantDecision: source.coApplicantDecision,
    coApplicantIncomeRupees: source.coApplicantIncomeRupees,
  });
  const income = source.monthlyIncomeRupees + coIncome;
  const obligations =
    source.existingMonthlyEmiRupees +
    (source.coApplicantDecision === "yes" ? (source.coApplicantExistingMonthlyEmiRupees ?? 0) : 0);
  const emi = calculateReducingBalanceEmi({
    principalRupees: source.requiredAmountRupees,
    annualRoiPercent: roi,
    tenureMonths: source.customerSelectedTenureMonths,
  });
  if (emi == null) return { error: "PROGRAMME_CONFIGURATION_INVALID" };
  const foir = calculateSalariedFoir({
    eligibleMonthlyIncomeRupees: income,
    existingMonthlyEmiRupees: obligations,
    proposedMonthlyEmiRupees: emi,
    maxFoirPercent: foirNorm,
  });
  const requestedLtv = (source.requiredAmountRupees / source.propertyValueRupees) * 100;
  const maxLtv = source.maxLtvPercent == null ? null : Number(source.maxLtvPercent);

  return {
    programmeId: source.programmeId,
    foirFitInputs: {
      calculatedFoirPercent: foir.foirPercent,
      programmeFoirNormPercent: foirNorm,
      aboveProgrammeNorm: foir.withinProgrammeCap === false,
      obligationsRupees: obligations,
      proposedEmiRupees: emi,
      eligibleMonthlyIncomeRupees: income,
      coApplicantIncomeUsed: coIncome > 0,
    },
    roiCompetitivenessInputs: {
      applicableRoiPercent: roi,
      programmeMinRoiPercent: roi,
      programmeMaxRoiPercent: source.maxRoiPercent == null ? null : Number(source.maxRoiPercent),
    },
    ltvFitInputs: {
      requestedLtvPercent: requestedLtv,
      programmeMaxLtvPercent: maxLtv,
      programmeMinLtvPercent: source.minLtvPercent == null ? null : Number(source.minLtvPercent),
    },
    // Explicitly excluded from scoring. Presence here is for proof that they are not read by the scorer.
    excludedDocumentTypeIds: source.requiredDocumentTypeIds ?? null,
    excludedDbrPercent: source.maxDbrPercent ?? source.minDbrPercent ?? null,
  };
}
