import type {
  DurablePolicyStatus,
  ProgrammeCompletenessState,
  ProgrammeEmploymentTypeId,
  ProgrammeLegalConstitutionId,
  ProgrammePublicationState,
  ProgrammeResidencyId,
} from "@/constants/product-programme-operations/controlled-masters";
import type { ProgramLodRequirement } from "@/lib/document-requests/resolve-program-lod";
import type { ExactDecimal } from "@/lib/product-programme-operations/money";
import type { EmploymentFamily } from "@/lib/product-programme-operations/employment";

export type ProgrammeMoneyFields = {
  minLoanAmountExact: ExactDecimal | null;
  maxLoanAmountExact: ExactDecimal | null;
  minIncomeExact: ExactDecimal | null;
  maxIncomeExact: ExactDecimal | null;
  processingFeeAmountExact: ExactDecimal | null;
  minRoiExact: ExactDecimal | null;
  maxRoiExact: ExactDecimal | null;
  processingFeePctExact: ExactDecimal | null;
  minLtvExact: ExactDecimal | null;
  maxLtvExact: ExactDecimal | null;
  minFoirExact: ExactDecimal | null;
  maxFoirExact: ExactDecimal | null;
  minDbrExact: ExactDecimal | null;
  maxDbrExact: ExactDecimal | null;
  spreadExact: ExactDecimal | null;
};

export type StructuredProgrammePayload = ProgrammeMoneyFields & {
  lenderId: string;
  productId?: string | null;
  productCode?: string | null;
  productVariantCode?: string | null;
  code: string;
  label: string;
  description?: string | null;
  applicantTypes: string[];
  employmentTypes: ProgrammeEmploymentTypeId[];
  employmentFamily: EmploymentFamily | null;
  legalConstitutions: ProgrammeLegalConstitutionId[];
  residencyEligibility: ProgrammeResidencyId[];
  customerSegments: string[];
  propertyTypes: string[];
  transactionTypes: string[];
  geographyStates: string[];
  geographyCities: string[];
  minCibil: number | null;
  maxCibil: number | null;
  minAge: number | null;
  maxAge: number | null;
  incomeAssessmentMethods: string[];
  minTenureMonths: number | null;
  maxTenureMonths: number | null;
  rateType: string | null;
  benchmarkCode: string | null;
  processingFeeLabel: string | null;
  concessions: string[];
  deviationCategories: string[];
  policyVersionId: string | null;
  creditRiskPolicyRef: string | null;
  requiredDocumentTypeIds: string[];
  requiredDocuments: ProgramLodRequirement[];
  averageTatDays: number | null;
  effectiveFrom: string | null;
  reviewAt: string | null;
  effectiveUntil: string | null;
  notes: string | null;
  remarks: string | null;
};

export type ProgrammeVersionRecord = StructuredProgrammePayload & {
  id: string;
  organizationId: string;
  lineageId: string;
  versionNumber: number;
  lockVersion: number;
  completenessState: ProgrammeCompletenessState;
  publicationState: ProgrammePublicationState;
  isLivePublished: boolean;
  enabled: boolean;
  lifecycleStatus: "draft" | "active" | "inactive" | "archived";
  status: "draft" | "active" | "inactive" | "archived";
  approvalStatus: "none" | "pending" | "approved" | "rejected";
  supersedesProgramId: string | null;
  submittedByUserId: string | null;
  submittedAt: string | null;
  approvedBy: string | null;
  approvedAt: string | null;
  approvalReason: string | null;
  createdBy: string;
  modifiedBy: string;
  createdAt: string;
  updatedAt: string;
  isDeleted: boolean;
};

export type DurablePolicyVersionRecord = {
  id: string;
  organizationId: string;
  policyId: string;
  policyCode: string;
  name: string;
  lenderId: string | null;
  productCode: string | null;
  productVariantCode: string | null;
  versionNumber: number;
  status: DurablePolicyStatus;
  eligibilityRules: Record<string, unknown>;
  creditRules: Record<string, unknown>;
  payload: Record<string, unknown>;
  sourceRef: string | null;
  effectiveFrom: string | null;
  reviewAt: string | null;
  effectiveUntil: string | null;
  createdBy: string;
  approvedBy: string | null;
  approvedAt: string | null;
  publishedBy: string | null;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ProgrammeAuditEvent = {
  id: string;
  organizationId: string;
  programId: string;
  lineageId: string;
  action: string;
  previousValue: Record<string, unknown> | null;
  newValue: Record<string, unknown> | null;
  actorUserId: string;
  actorName?: string;
  reason: string;
  createdAt: string;
};

export type ProgrammeFieldError = {
  field: string;
  message: string;
};

export class ProgrammeValidationError extends Error {
  readonly fieldErrors: ProgrammeFieldError[];
  readonly code: string;
  constructor(message: string, fieldErrors: ProgrammeFieldError[], code = "PROGRAMME_VALIDATION_FAILED") {
    super(message);
    this.name = "ProgrammeValidationError";
    this.fieldErrors = fieldErrors;
    this.code = code;
  }
}

export class ProgrammeConflictError extends Error {
  readonly code = "PROGRAMME_VERSION_CONFLICT";
  constructor(message: string) {
    super(message);
    this.name = "ProgrammeConflictError";
  }
}

export class ProgrammePermissionError extends Error {
  readonly code: "FORBIDDEN" | "TENANT_FORBIDDEN";
  constructor(message: string, code: "FORBIDDEN" | "TENANT_FORBIDDEN" = "FORBIDDEN") {
    super(message);
    this.name = "ProgrammePermissionError";
    this.code = code;
  }
}
