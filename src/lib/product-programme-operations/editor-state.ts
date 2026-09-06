import type { EnterpriseLenderProgramRecord } from "@/types/enterprise-lender-registry";
import type { StructuredProgrammePayload } from "@/types/product-programme-operations";
import { deriveEmploymentFamily } from "@/lib/product-programme-operations/employment";
import type { ProgrammeEmploymentTypeId } from "@/constants/product-programme-operations/controlled-masters";

export type ProgrammeEditorState = StructuredProgrammePayload & {
  id?: string;
  lockVersion?: number;
  publicationState?: string;
  isLivePublished?: boolean;
};

export function emptyProgrammeEditorState(): ProgrammeEditorState {
  return {
    lenderId: "",
    productId: null,
    productCode: null,
    productVariantCode: null,
    code: "",
    label: "",
    description: "",
    applicantTypes: ["primary_applicant"],
    employmentTypes: [],
    employmentFamily: null,
    legalConstitutions: [],
    residencyEligibility: [],
    customerSegments: [],
    propertyTypes: [],
    transactionTypes: [],
    geographyStates: [],
    geographyCities: [],
    minCibil: null,
    maxCibil: null,
    minAge: null,
    maxAge: null,
    incomeAssessmentMethods: [],
    minTenureMonths: null,
    maxTenureMonths: null,
    minLoanAmountExact: null,
    maxLoanAmountExact: null,
    minIncomeExact: null,
    maxIncomeExact: null,
    processingFeeAmountExact: null,
    minRoiExact: null,
    maxRoiExact: null,
    processingFeePctExact: null,
    minLtvExact: null,
    maxLtvExact: null,
    minFoirExact: null,
    maxFoirExact: null,
    minDbrExact: null,
    maxDbrExact: null,
    spreadExact: null,
    rateType: null,
    benchmarkCode: null,
    processingFeeLabel: null,
    concessions: [],
    deviationCategories: [],
    policyVersionId: null,
    creditRiskPolicyRef: null,
    requiredDocumentTypeIds: [],
    requiredDocuments: [],
    averageTatDays: null,
    effectiveFrom: null,
    reviewAt: null,
    effectiveUntil: null,
    notes: null,
    remarks: null,
  };
}

export function recordToEditorState(record: EnterpriseLenderProgramRecord): ProgrammeEditorState {
  const employmentTypes = (record.employmentTypes ?? []) as ProgrammeEmploymentTypeId[];
  return {
    ...emptyProgrammeEditorState(),
    id: record.id,
    lockVersion: record.lockVersion ?? 1,
    publicationState: record.publicationState ?? "draft",
    isLivePublished: record.isLivePublished ?? false,
    lenderId: record.lenderId,
    productId: record.productId ?? null,
    productCode: record.productCode ?? null,
    productVariantCode: record.productVariantCode ?? null,
    code: record.code,
    label: record.label,
    description: record.description ?? "",
    applicantTypes: record.applicantTypes ?? ["primary_applicant"],
    employmentTypes,
    employmentFamily: deriveEmploymentFamily(employmentTypes),
    legalConstitutions: (record.legalConstitutions ?? []) as ProgrammeEditorState["legalConstitutions"],
    residencyEligibility: (record.residencyEligibility ?? []) as ProgrammeEditorState["residencyEligibility"],
    customerSegments: record.customerSegments ?? [],
    propertyTypes: record.propertyTypes ?? [],
    transactionTypes: record.transactionTypes ?? [],
    geographyStates: record.eligibleStates ?? [],
    geographyCities: record.eligibleCities ?? [],
    minCibil: record.minCibil ?? null,
    maxCibil: record.maxCibil ?? null,
    minAge: record.minAge ?? null,
    maxAge: record.maxAge ?? null,
    incomeAssessmentMethods: record.incomeAssessmentMethods ?? [],
    minTenureMonths: record.minTenureMonths ?? null,
    maxTenureMonths: record.maxTenureMonths ?? null,
    minLoanAmountExact: record.minLoanAmountExact ?? null,
    maxLoanAmountExact: record.maxLoanAmountExact ?? null,
    minIncomeExact: record.minIncomeExact ?? null,
    maxIncomeExact: record.maxIncomeExact ?? null,
    processingFeeAmountExact: record.processingFeeAmountExact ?? null,
    minRoiExact: record.minRoiExact ?? null,
    maxRoiExact: record.maxRoiExact ?? null,
    processingFeePctExact: record.processingFeePctExact ?? null,
    minLtvExact: record.minLtvExact ?? null,
    maxLtvExact: record.maxLtvExact ?? null,
    minFoirExact: record.minFoirExact ?? null,
    maxFoirExact: record.maxFoirExact ?? null,
    minDbrExact: record.minDbrExact ?? null,
    maxDbrExact: record.maxDbrExact ?? null,
    spreadExact: record.spreadExact ?? null,
    rateType: record.rateType ?? null,
    benchmarkCode: record.benchmarkCode ?? null,
    processingFeeLabel: record.processingFeeLabel ?? null,
    concessions: record.concessions ?? [],
    deviationCategories: record.deviationCategories ?? [],
    policyVersionId: record.policyVersionId ?? null,
    creditRiskPolicyRef: record.creditRiskPolicyRef ?? null,
    requiredDocumentTypeIds: record.requiredDocumentTypeIds ?? [],
    requiredDocuments: record.requiredDocuments ?? [],
    averageTatDays: record.averageTatDays ?? null,
    effectiveFrom: record.effectiveFrom ?? null,
    reviewAt: record.reviewAt ?? null,
    effectiveUntil: record.effectiveUntil ?? null,
    notes: record.notes ?? null,
    remarks: record.remarks ?? null,
  };
}

export function formatIndianCurrency(value: string | null): string {
  if (!value) return "";
  const [whole, fraction = "00"] = value.split(".");
  const formatted = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return `₹${formatted}.${fraction.slice(0, 2).padEnd(2, "0")}`;
}
