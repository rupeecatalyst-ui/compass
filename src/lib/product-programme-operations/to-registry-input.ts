import type { StructuredProgrammePayload } from "@/types/product-programme-operations";
import type { CreateLenderProgramInput, UpdateLenderProgramInput } from "@/types/enterprise-lender-registry";

export function structuredPayloadToCreateInput(
  payload: StructuredProgrammePayload,
  createdBy: string,
): CreateLenderProgramInput {
  return {
    lenderId: payload.lenderId,
    productId: payload.productId ?? undefined,
    productCode: payload.productCode ?? undefined,
    productVariantCode: payload.productVariantCode ?? undefined,
    code: payload.code,
    label: payload.label,
    description: payload.description ?? undefined,
    applicantTypes: payload.applicantTypes,
    employmentTypes: payload.employmentTypes,
    legalConstitutions: payload.legalConstitutions,
    residencyEligibility: payload.residencyEligibility,
    customerSegments: payload.customerSegments,
    propertyTypes: payload.propertyTypes,
    transactionTypes: payload.transactionTypes,
    incomeAssessmentMethods: payload.incomeAssessmentMethods,
    eligibleStates: payload.geographyStates,
    eligibleCities: payload.geographyCities,
    minCibil: payload.minCibil ?? undefined,
    maxCibil: payload.maxCibil ?? undefined,
    minAge: payload.minAge ?? undefined,
    maxAge: payload.maxAge ?? undefined,
    minTenureMonths: payload.minTenureMonths ?? undefined,
    maxTenureMonths: payload.maxTenureMonths ?? undefined,
    rateType: payload.rateType ?? undefined,
    benchmarkCode: payload.benchmarkCode ?? undefined,
    processingFeeLabel: payload.processingFeeLabel ?? undefined,
    concessions: payload.concessions,
    deviationCategories: payload.deviationCategories,
    policyVersionId: payload.policyVersionId ?? undefined,
    creditRiskPolicyRef: payload.creditRiskPolicyRef ?? undefined,
    requiredDocumentTypeIds: payload.requiredDocumentTypeIds,
    requiredDocuments: payload.requiredDocuments,
    minRoiExact: payload.minRoiExact,
    maxRoiExact: payload.maxRoiExact,
    minLoanAmountExact: payload.minLoanAmountExact,
    maxLoanAmountExact: payload.maxLoanAmountExact,
    minIncomeExact: payload.minIncomeExact,
    maxIncomeExact: payload.maxIncomeExact,
    processingFeeAmountExact: payload.processingFeeAmountExact,
    processingFeePctExact: payload.processingFeePctExact,
    minLtvExact: payload.minLtvExact,
    maxLtvExact: payload.maxLtvExact,
    minFoirExact: payload.minFoirExact,
    maxFoirExact: payload.maxFoirExact,
    minDbrExact: payload.minDbrExact,
    maxDbrExact: payload.maxDbrExact,
    spreadExact: payload.spreadExact,
    averageTatDays: payload.averageTatDays ?? undefined,
    remarks: payload.remarks ?? undefined,
    notes: payload.notes ?? undefined,
    reviewAt: payload.reviewAt,
    effectiveFrom: payload.effectiveFrom,
    effectiveUntil: payload.effectiveUntil,
    createdBy,
  };
}

export function structuredPayloadToUpdateInput(
  payload: StructuredProgrammePayload,
  modifiedBy: string,
): UpdateLenderProgramInput {
  const created = structuredPayloadToCreateInput(payload, modifiedBy);
  const { createdBy: _createdBy, code: _code, ...rest } = created;
  return { ...rest, modifiedBy };
}
