import type { ProgrammeEditorState } from "@/lib/product-programme-operations/editor-state";

const WRITE_KEYS = [
  "lenderId",
  "productId",
  "productCode",
  "productVariantCode",
  "code",
  "label",
  "description",
  "applicantTypes",
  "employmentTypes",
  "legalConstitutions",
  "residencyEligibility",
  "customerSegments",
  "propertyTypes",
  "transactionTypes",
  "eligibleStates",
  "eligibleCities",
  "geographyStates",
  "geographyCities",
  "minCibil",
  "maxCibil",
  "minAge",
  "maxAge",
  "incomeAssessmentMethods",
  "minTenureMonths",
  "maxTenureMonths",
  "minLoanAmountExact",
  "maxLoanAmountExact",
  "minIncomeExact",
  "maxIncomeExact",
  "processingFeeAmountExact",
  "minRoiExact",
  "maxRoiExact",
  "processingFeePctExact",
  "minLtvExact",
  "maxLtvExact",
  "minFoirExact",
  "maxFoirExact",
  "minDbrExact",
  "maxDbrExact",
  "spreadExact",
  "rateType",
  "benchmarkCode",
  "processingFeeLabel",
  "concessions",
  "deviationCategories",
  "policyVersionId",
  "creditRiskPolicyRef",
  "requiredDocumentTypeIds",
  "requiredDocuments",
  "averageTatDays",
  "effectiveFrom",
  "reviewAt",
  "effectiveUntil",
  "notes",
  "remarks",
] as const;

export function toProgrammeWritePayload(
  state: ProgrammeEditorState,
  extra?: Record<string, unknown>,
): Record<string, unknown> {
  const payload: Record<string, unknown> = {};
  for (const key of WRITE_KEYS) {
    payload[key] = state[key as keyof ProgrammeEditorState];
  }
  payload.eligibleStates = state.geographyStates;
  payload.eligibleCities = state.geographyCities;
  return { ...payload, ...extra };
}
