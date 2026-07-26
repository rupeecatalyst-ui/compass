/**
 * GO-LIVE P0 + CO-ARCH-004 — Enterprise Lender Registry domain types.
 * Master SSOT for Borrow-domain lending institutions (immutable LND codes).
 */
import type {
  LenderInstitutionCategory,
  LenderLifecycleStatus,
  LenderOperationalStatus,
  LenderProgramLifecycleStatus,
  RegistryApprovalStatus,
  RegistryStatus,
} from "@prisma/client";

export type {
  LenderInstitutionCategory,
  LenderLifecycleStatus,
  LenderOperationalStatus,
  LenderProgramLifecycleStatus,
};

/** CO-ARCH-004 — exactly one master classification per lender. */
export type LenderMasterClassification =
  | "public_sector_bank"
  | "private_sector_bank"
  | "small_finance_bank"
  | "housing_finance_company"
  | "nbfc"
  | "cooperative_bank"
  | "payments_bank";

/** Human labels for CO-ARCH-004 master classification. */
export const LENDER_MASTER_CLASSIFICATION_LABELS: Record<
  LenderMasterClassification,
  string
> = {
  public_sector_bank: "Public Sector Bank",
  private_sector_bank: "Private Sector Bank",
  small_finance_bank: "Small Finance Bank",
  housing_finance_company: "Housing Finance Company",
  nbfc: "NBFC",
  cooperative_bank: "Cooperative Bank",
  payments_bank: "Payments Bank",
};

export type LenderContactDepartment =
  | "relationship_manager"
  | "credit"
  | "operations"
  | "legal"
  | "technical"
  | "escalation"
  | "other";

export type LenderDocumentKind =
  | "agreement"
  | "policy"
  | "program_circular"
  | "rate_sheet"
  | "sanction_format"
  | "kfs"
  | "other";

/** Configurable product codes supported by a lender (wizard Step 4). */
export const LENDER_REGISTRY_PRODUCT_OPTIONS = [
  { code: "home_loan", label: "Home Loan" },
  { code: "home_loan_bt", label: "Home Loan Balance Transfer" },
  { code: "lap", label: "Loan Against Property" },
  { code: "business_loan", label: "Business Loan" },
  { code: "working_capital", label: "Working Capital" },
  { code: "construction_funding", label: "Construction Funding" },
  { code: "personal_loan", label: "Personal Loan" },
  { code: "gold_loan", label: "Gold Loan" },
  { code: "las", label: "Loan Against Securities" },
] as const;

export type LenderRegistryProductCode =
  (typeof LENDER_REGISTRY_PRODUCT_OPTIONS)[number]["code"];

export interface EnterpriseLenderCategoryRecord {
  id: string;
  organizationId: string;
  code: string;
  label: string;
  description?: string | null;
  sortOrder: number;
  status: RegistryStatus;
  enabled: boolean;
  versionNumber: number;
  effectiveFrom?: string | null;
  effectiveUntil?: string | null;
  notes?: string | null;
  isDeleted: boolean;
  deletedAt?: string | null;
  deletedBy?: string | null;
  deletionReason?: string | null;
  approvalStatus: RegistryApprovalStatus;
  approvedBy?: string | null;
  approvedAt?: string | null;
  createdBy: string;
  modifiedBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface EnterpriseLenderContactRecord {
  id: string;
  organizationId: string;
  lenderId: string;
  name: string;
  designation?: string | null;
  department: LenderContactDepartment;
  mobile?: string | null;
  email?: string | null;
  preferredContactMethod?: string | null;
  enabled: boolean;
  sortOrder: number;
  isDeleted: boolean;
  createdBy: string;
  modifiedBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface EnterpriseLenderDocumentRecord {
  id: string;
  organizationId: string;
  lenderId: string;
  kind: LenderDocumentKind;
  title: string;
  fileName?: string | null;
  fileUrl?: string | null;
  mimeType?: string | null;
  notes?: string | null;
  enabled: boolean;
  isDeleted: boolean;
  createdBy: string;
  modifiedBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface EnterpriseLenderRecord {
  id: string;
  organizationId: string;
  categoryId: string;
  /** Immutable enterprise code — LND000001 format. Never changes after issue. */
  code: string;
  label: string;
  legalName?: string | null;
  displayName?: string | null;
  shortName?: string | null;
  aliases?: string[] | null;
  description?: string | null;
  institutionCategory: LenderInstitutionCategory;
  classification?: LenderMasterClassification | null;
  lifecycleStatus: LenderLifecycleStatus;
  operationalStatus: LenderOperationalStatus;
  countryReferenceId?: string | null;
  stateReferenceId?: string | null;
  cityReferenceId?: string | null;
  headquartersLabel?: string | null;
  website?: string | null;
  logoUrl?: string | null;
  rbiRegistrationNumber?: string | null;
  rbiRegulated?: boolean;
  customerCarePhone?: string | null;
  customerCareEmail?: string | null;
  panIndia: boolean;
  coverageStates?: string[] | null;
  coverageCities?: string[] | null;
  productsSupported?: string[] | null;
  tags?: string[] | null;
  sortOrder: number;
  status: RegistryStatus;
  enabled: boolean;
  versionNumber: number;
  effectiveFrom?: string | null;
  effectiveUntil?: string | null;
  notes?: string | null;
  isDeleted: boolean;
  deletedAt?: string | null;
  deletedBy?: string | null;
  deletionReason?: string | null;
  approvalStatus: RegistryApprovalStatus;
  approvedBy?: string | null;
  approvedAt?: string | null;
  createdBy: string;
  modifiedBy: string;
  createdAt: string;
  updatedAt: string;
}

/** Master fields auto-populated into Borrow / Deal transactions on lender select. */
export interface LenderMasterSnapshot {
  lenderId: string;
  lenderCode: string;
  legalName: string;
  displayName: string;
  shortName?: string | null;
  classification?: LenderMasterClassification | null;
  institutionCategory: LenderInstitutionCategory;
  website?: string | null;
  customerCarePhone?: string | null;
  customerCareEmail?: string | null;
  headquartersLabel?: string | null;
  productsSupported: string[];
  defaultContacts: Array<{
    name: string;
    designation?: string | null;
    department: string;
    mobile?: string | null;
    email?: string | null;
  }>;
}

export interface EnterpriseLenderProgramRecord {
  id: string;
  organizationId: string;
  lenderId: string;
  productId?: string | null;
  productCode?: string | null;
  code: string;
  label: string;
  description?: string | null;
  borrowerType?: string | null;
  employmentType?: string | null;
  roiPercent?: number | null;
  minRoiPercent?: number | null;
  maxRoiPercent?: number | null;
  processingFeeLabel?: string | null;
  processingFeePct?: number | null;
  maxFundingAmount?: number | null;
  maxLtvPercent?: number | null;
  maxTenureMonths?: number | null;
  minCibil?: number | null;
  minIncomeAmount?: number | null;
  eligibleStates?: string[] | null;
  eligibleCities?: string[] | null;
  averageTatDays?: number | null;
  remarks?: string | null;
  lifecycleStatus: LenderProgramLifecycleStatus;
  status: RegistryStatus;
  enabled: boolean;
  versionNumber: number;
  effectiveFrom?: string | null;
  effectiveUntil?: string | null;
  notes?: string | null;
  isDeleted: boolean;
  deletedAt?: string | null;
  deletedBy?: string | null;
  deletionReason?: string | null;
  approvalStatus: RegistryApprovalStatus;
  approvedBy?: string | null;
  approvedAt?: string | null;
  createdBy: string;
  modifiedBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface LenderRegistryListQuery {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: RegistryStatus | "all";
  enabled?: boolean | "all";
  includeDeleted?: boolean;
  sortBy?: "sortOrder" | "label" | "code" | "modifiedOn" | "createdOn";
  sortDir?: "asc" | "desc";
}

export interface LenderQuery extends LenderRegistryListQuery {
  categoryId?: string;
  institutionCategory?: LenderInstitutionCategory | "all";
  lifecycleStatus?: LenderLifecycleStatus | "all";
  operationalStatus?: LenderOperationalStatus | "all";
}

export interface LenderProgramQuery extends LenderRegistryListQuery {
  lenderId?: string;
  productId?: string;
  productCode?: string;
  lifecycleStatus?: LenderProgramLifecycleStatus | "all";
  /** Comparison page: only published programs */
  publishedOnly?: boolean;
}

export interface CreateLenderCategoryInput {
  code: string;
  label: string;
  description?: string;
  sortOrder?: number;
  status?: RegistryStatus;
  enabled?: boolean;
  notes?: string;
  createdBy: string;
}

export interface UpdateLenderCategoryInput {
  label?: string;
  description?: string | null;
  sortOrder?: number;
  status?: RegistryStatus;
  enabled?: boolean;
  notes?: string | null;
  modifiedBy: string;
}

export interface CreateLenderInput {
  categoryId: string;
  /** Optional — system allocates next LND###### when omitted. */
  code?: string;
  label: string;
  legalName?: string;
  displayName?: string;
  shortName?: string;
  aliases?: string[];
  description?: string;
  institutionCategory: LenderInstitutionCategory;
  classification?: LenderMasterClassification;
  lifecycleStatus?: LenderLifecycleStatus;
  operationalStatus?: LenderOperationalStatus;
  countryReferenceId?: string;
  stateReferenceId?: string;
  cityReferenceId?: string;
  headquartersLabel?: string;
  website?: string;
  logoUrl?: string;
  rbiRegistrationNumber?: string;
  rbiRegulated?: boolean;
  customerCarePhone?: string;
  customerCareEmail?: string;
  panIndia?: boolean;
  coverageStates?: string[];
  coverageCities?: string[];
  productsSupported?: string[];
  tags?: string[];
  sortOrder?: number;
  status?: RegistryStatus;
  enabled?: boolean;
  notes?: string;
  createdBy: string;
}

export interface UpdateLenderInput {
  label?: string;
  legalName?: string | null;
  displayName?: string | null;
  shortName?: string | null;
  aliases?: string[] | null;
  description?: string | null;
  categoryId?: string;
  institutionCategory?: LenderInstitutionCategory;
  classification?: LenderMasterClassification | null;
  lifecycleStatus?: LenderLifecycleStatus;
  operationalStatus?: LenderOperationalStatus;
  countryReferenceId?: string | null;
  stateReferenceId?: string | null;
  cityReferenceId?: string | null;
  headquartersLabel?: string | null;
  website?: string | null;
  logoUrl?: string | null;
  rbiRegistrationNumber?: string | null;
  rbiRegulated?: boolean;
  customerCarePhone?: string | null;
  customerCareEmail?: string | null;
  panIndia?: boolean;
  coverageStates?: string[] | null;
  coverageCities?: string[] | null;
  productsSupported?: string[] | null;
  tags?: string[] | null;
  sortOrder?: number;
  status?: RegistryStatus;
  enabled?: boolean;
  notes?: string | null;
  modifiedBy: string;
}

export interface CreateLenderProgramInput {
  lenderId: string;
  productId?: string;
  productCode?: string;
  code: string;
  label: string;
  description?: string;
  borrowerType?: string;
  employmentType?: string;
  roiPercent?: number;
  minRoiPercent?: number;
  maxRoiPercent?: number;
  processingFeeLabel?: string;
  processingFeePct?: number;
  maxFundingAmount?: number;
  maxLtvPercent?: number;
  maxTenureMonths?: number;
  minCibil?: number;
  minIncomeAmount?: number;
  eligibleStates?: string[];
  eligibleCities?: string[];
  averageTatDays?: number;
  remarks?: string;
  lifecycleStatus?: LenderProgramLifecycleStatus;
  status?: RegistryStatus;
  enabled?: boolean;
  notes?: string;
  createdBy: string;
}

export interface UpdateLenderProgramInput {
  label?: string;
  description?: string | null;
  lenderId?: string;
  productId?: string | null;
  productCode?: string | null;
  borrowerType?: string | null;
  employmentType?: string | null;
  roiPercent?: number | null;
  minRoiPercent?: number | null;
  maxRoiPercent?: number | null;
  processingFeeLabel?: string | null;
  processingFeePct?: number | null;
  maxFundingAmount?: number | null;
  maxLtvPercent?: number | null;
  maxTenureMonths?: number | null;
  minCibil?: number | null;
  minIncomeAmount?: number | null;
  eligibleStates?: string[] | null;
  eligibleCities?: string[] | null;
  averageTatDays?: number | null;
  remarks?: string | null;
  lifecycleStatus?: LenderProgramLifecycleStatus;
  status?: RegistryStatus;
  enabled?: boolean;
  notes?: string | null;
  modifiedBy: string;
}

export interface CreateLenderContactInput {
  lenderId: string;
  name: string;
  designation?: string;
  department: LenderContactDepartment;
  mobile?: string;
  email?: string;
  preferredContactMethod?: string;
  enabled?: boolean;
  sortOrder?: number;
  createdBy: string;
}

export interface CreateLenderDocumentInput {
  lenderId: string;
  kind: LenderDocumentKind;
  title: string;
  fileName?: string;
  fileUrl?: string;
  mimeType?: string;
  notes?: string;
  enabled?: boolean;
  createdBy: string;
}
