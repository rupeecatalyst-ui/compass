import { Prisma } from "@prisma/client";
import { toLegacyFloat } from "@/lib/product-programme-operations/money";
import type { CreateLenderProgramInput, UpdateLenderProgramInput } from "@/types/enterprise-lender-registry";

export function jsonOrUndefined(
  value: Prisma.JsonValue | unknown[] | null | undefined,
): Prisma.InputJsonValue | typeof Prisma.JsonNull | undefined {
  if (value === undefined) return undefined;
  if (value === null) return Prisma.JsonNull;
  return value as Prisma.InputJsonValue;
}

function exactOrNull(value: string | null | undefined) {
  if (value === undefined) return undefined;
  return value;
}

export function structuredCreateData(input: CreateLenderProgramInput) {
  return {
    productVariantCode: input.productVariantCode?.trim() || null,
    applicantTypes: input.applicantTypes ?? [],
    employmentTypes: input.employmentTypes ?? [],
    legalConstitutions: input.legalConstitutions ?? [],
    residencyEligibility: input.residencyEligibility ?? [],
    customerSegments: input.customerSegments ?? [],
    propertyTypes: input.propertyTypes ?? [],
    propertyCategories: input.propertyCategories ?? [],
    constructionStatuses: input.constructionStatuses ?? [],
    transactionTypes: input.transactionTypes ?? [],
    incomeAssessmentMethods: input.incomeAssessmentMethods ?? [],
    rateType: input.rateType ?? null,
    benchmarkCode: input.benchmarkCode ?? null,
    concessions: input.concessions ?? [],
    deviationCategories: input.deviationCategories ?? [],
    policyVersionId: input.policyVersionId ?? null,
    minTenureMonths: input.minTenureMonths ?? null,
    maxCibil: input.maxCibil ?? null,
    minRoiExact: exactOrNull(input.minRoiExact) ?? null,
    maxRoiExact: exactOrNull(input.maxRoiExact) ?? null,
    minLoanAmountExact: exactOrNull(input.minLoanAmountExact) ?? null,
    maxLoanAmountExact: exactOrNull(input.maxLoanAmountExact) ?? null,
    minIncomeExact: exactOrNull(input.minIncomeExact) ?? null,
    maxIncomeExact: exactOrNull(input.maxIncomeExact) ?? null,
    processingFeeAmountExact: exactOrNull(input.processingFeeAmountExact) ?? null,
    processingFeePctExact: exactOrNull(input.processingFeePctExact) ?? null,
    minLtvExact: exactOrNull(input.minLtvExact) ?? null,
    maxLtvExact: exactOrNull(input.maxLtvExact) ?? null,
    minFoirExact: exactOrNull(input.minFoirExact) ?? null,
    maxFoirExact: exactOrNull(input.maxFoirExact) ?? null,
    minDbrExact: exactOrNull(input.minDbrExact) ?? null,
    maxDbrExact: exactOrNull(input.maxDbrExact) ?? null,
    spreadExact: exactOrNull(input.spreadExact) ?? null,
    reviewAt: input.reviewAt ? new Date(input.reviewAt) : null,
    effectiveFrom: input.effectiveFrom ? new Date(input.effectiveFrom) : undefined,
    effectiveUntil: input.effectiveUntil ? new Date(input.effectiveUntil) : undefined,
    policyAssessmentJson: jsonOrUndefined(input.policyAssessmentJson ?? null),
    additionalEligibilityFilters: jsonOrUndefined(input.additionalEligibilityFilters ?? null),
    minRoiPercent: input.minRoiPercent ?? toLegacyFloat(input.minRoiExact ?? null),
    maxRoiPercent: input.maxRoiPercent ?? toLegacyFloat(input.maxRoiExact ?? null),
    minFundingAmount: input.minFundingAmount ?? toLegacyFloat(input.minLoanAmountExact ?? null),
    maxFundingAmount: input.maxFundingAmount ?? toLegacyFloat(input.maxLoanAmountExact ?? null),
    minIncomeAmount: input.minIncomeAmount ?? toLegacyFloat(input.minIncomeExact ?? null),
    processingFeePct: input.processingFeePct ?? toLegacyFloat(input.processingFeePctExact ?? null),
    maxLtvPercent: input.maxLtvPercent ?? toLegacyFloat(input.maxLtvExact ?? null),
    maxFoirPercent: input.maxFoirPercent ?? toLegacyFloat(input.maxFoirExact ?? null),
    maxDbrPercent: input.maxDbrPercent ?? toLegacyFloat(input.maxDbrExact ?? null),
  };
}

export function structuredUpdateData(input: UpdateLenderProgramInput) {
  return {
    productVariantCode: input.productVariantCode,
    applicantTypes: jsonOrUndefined(input.applicantTypes ?? undefined),
    employmentTypes: jsonOrUndefined(input.employmentTypes ?? undefined),
    legalConstitutions: jsonOrUndefined(input.legalConstitutions ?? undefined),
    residencyEligibility: jsonOrUndefined(input.residencyEligibility ?? undefined),
    customerSegments: jsonOrUndefined(input.customerSegments ?? undefined),
    propertyTypes: jsonOrUndefined(input.propertyTypes ?? undefined),
    propertyCategories: jsonOrUndefined(input.propertyCategories ?? undefined),
    constructionStatuses: jsonOrUndefined(input.constructionStatuses ?? undefined),
    transactionTypes: jsonOrUndefined(input.transactionTypes ?? undefined),
    incomeAssessmentMethods: jsonOrUndefined(input.incomeAssessmentMethods ?? undefined),
    rateType: input.rateType,
    benchmarkCode: input.benchmarkCode,
    concessions: jsonOrUndefined(input.concessions ?? undefined),
    deviationCategories: jsonOrUndefined(input.deviationCategories ?? undefined),
    policyVersionId: input.policyVersionId,
    minTenureMonths: input.minTenureMonths,
    maxCibil: input.maxCibil,
    minRoiExact: exactOrNull(input.minRoiExact),
    maxRoiExact: exactOrNull(input.maxRoiExact),
    minLoanAmountExact: exactOrNull(input.minLoanAmountExact),
    maxLoanAmountExact: exactOrNull(input.maxLoanAmountExact),
    minIncomeExact: exactOrNull(input.minIncomeExact),
    maxIncomeExact: exactOrNull(input.maxIncomeExact),
    processingFeeAmountExact: exactOrNull(input.processingFeeAmountExact),
    processingFeePctExact: exactOrNull(input.processingFeePctExact),
    minLtvExact: exactOrNull(input.minLtvExact),
    maxLtvExact: exactOrNull(input.maxLtvExact),
    minFoirExact: exactOrNull(input.minFoirExact),
    maxFoirExact: exactOrNull(input.maxFoirExact),
    minDbrExact: exactOrNull(input.minDbrExact),
    maxDbrExact: exactOrNull(input.maxDbrExact),
    spreadExact: exactOrNull(input.spreadExact),
    reviewAt: input.reviewAt === undefined ? undefined : input.reviewAt ? new Date(input.reviewAt) : null,
    effectiveFrom: input.effectiveFrom === undefined ? undefined : input.effectiveFrom ? new Date(input.effectiveFrom) : null,
    effectiveUntil:
      input.effectiveUntil === undefined ? undefined : input.effectiveUntil ? new Date(input.effectiveUntil) : null,
    minRoiPercent: input.minRoiPercent ?? toLegacyFloat(input.minRoiExact),
    maxRoiPercent: input.maxRoiPercent ?? toLegacyFloat(input.maxRoiExact),
    minFundingAmount: input.minFundingAmount ?? toLegacyFloat(input.minLoanAmountExact),
    maxFundingAmount: input.maxFundingAmount ?? toLegacyFloat(input.maxLoanAmountExact),
    minIncomeAmount: input.minIncomeAmount ?? toLegacyFloat(input.minIncomeExact),
    processingFeePct: input.processingFeePct ?? toLegacyFloat(input.processingFeePctExact),
    maxLtvPercent: input.maxLtvPercent ?? toLegacyFloat(input.maxLtvExact),
    maxFoirPercent: input.maxFoirPercent ?? toLegacyFloat(input.maxFoirExact),
    maxDbrPercent: input.maxDbrPercent ?? toLegacyFloat(input.maxDbrExact),
    policyAssessmentJson: jsonOrUndefined(input.policyAssessmentJson),
    additionalEligibilityFilters: jsonOrUndefined(input.additionalEligibilityFilters),
  };
}

/** Merge published create-input with defined draft/editor overlay fields. Undefined does not wipe. */
export function overlayDefinedCreateInput(
  published: CreateLenderProgramInput,
  input: UpdateLenderProgramInput,
): CreateLenderProgramInput {
  const next: CreateLenderProgramInput = { ...published, createdBy: input.modifiedBy };
  const assign = <K extends keyof CreateLenderProgramInput>(key: K, value: CreateLenderProgramInput[K] | undefined) => {
    if (value !== undefined) next[key] = value;
  };
  assign("lenderId", input.lenderId);
  assign("productId", input.productId ?? undefined);
  assign("productCode", input.productCode ?? undefined);
  assign("label", input.label);
  assign("description", input.description ?? undefined);
  assign("borrowerType", input.borrowerType ?? undefined);
  assign("employmentType", input.employmentType ?? undefined);
  assign("roiPercent", input.roiPercent ?? undefined);
  assign("processingFeeLabel", input.processingFeeLabel ?? undefined);
  assign("maxTenureMonths", input.maxTenureMonths ?? undefined);
  assign("minCibil", input.minCibil ?? undefined);
  assign("minAge", input.minAge ?? undefined);
  assign("maxAge", input.maxAge ?? undefined);
  assign("creditRiskPolicyRef", input.creditRiskPolicyRef ?? undefined);
  assign("requiredDocumentTypeIds", input.requiredDocumentTypeIds ?? undefined);
  assign("requiredDocuments", input.requiredDocuments ?? undefined);
  assign("eligibleStates", input.eligibleStates ?? undefined);
  assign("eligibleCities", input.eligibleCities ?? undefined);
  assign("averageTatDays", input.averageTatDays ?? undefined);
  assign("remarks", input.remarks ?? undefined);
  assign("notes", input.notes ?? undefined);
  assign("productVariantCode", input.productVariantCode ?? undefined);
  assign("applicantTypes", input.applicantTypes ?? undefined);
  assign("employmentTypes", input.employmentTypes ?? undefined);
  assign("legalConstitutions", input.legalConstitutions ?? undefined);
  assign("residencyEligibility", input.residencyEligibility ?? undefined);
  assign("customerSegments", input.customerSegments ?? undefined);
  assign("propertyTypes", input.propertyTypes ?? undefined);
  assign("propertyCategories", input.propertyCategories ?? undefined);
  assign("constructionStatuses", input.constructionStatuses ?? undefined);
  assign("transactionTypes", input.transactionTypes ?? undefined);
  assign("incomeAssessmentMethods", input.incomeAssessmentMethods ?? undefined);
  assign("rateType", input.rateType ?? undefined);
  assign("benchmarkCode", input.benchmarkCode ?? undefined);
  assign("concessions", input.concessions ?? undefined);
  assign("deviationCategories", input.deviationCategories ?? undefined);
  assign("policyVersionId", input.policyVersionId ?? undefined);
  assign("minTenureMonths", input.minTenureMonths ?? undefined);
  assign("maxCibil", input.maxCibil ?? undefined);
  assign("minRoiExact", input.minRoiExact);
  assign("maxRoiExact", input.maxRoiExact);
  assign("minLoanAmountExact", input.minLoanAmountExact);
  assign("maxLoanAmountExact", input.maxLoanAmountExact);
  assign("minIncomeExact", input.minIncomeExact);
  assign("maxIncomeExact", input.maxIncomeExact);
  assign("processingFeeAmountExact", input.processingFeeAmountExact);
  assign("processingFeePctExact", input.processingFeePctExact);
  assign("minLtvExact", input.minLtvExact);
  assign("maxLtvExact", input.maxLtvExact);
  assign("minFoirExact", input.minFoirExact);
  assign("maxFoirExact", input.maxFoirExact);
  assign("minDbrExact", input.minDbrExact);
  assign("maxDbrExact", input.maxDbrExact);
  assign("spreadExact", input.spreadExact);
  assign("reviewAt", input.reviewAt);
  assign("effectiveFrom", input.effectiveFrom);
  assign("effectiveUntil", input.effectiveUntil);
  assign("policyAssessmentJson", input.policyAssessmentJson);
  assign("additionalEligibilityFilters", input.additionalEligibilityFilters);
  return next;
}
