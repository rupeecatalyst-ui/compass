/**
 * CO-CCC-001 — Corporate Compliance Center constants (SSOT).
 */

import { ROUTES } from "@/constants/routes";

export const CCC_MODULE_ID = "co-ccc-001";

export const CCC_REPOSITORY_KEYS = [
  "corporate",
  "banking",
  "financial",
  "compliance",
  "brand",
] as const;

export type CccRepositoryKey = (typeof CCC_REPOSITORY_KEYS)[number];

export const CCC_REPOSITORY_LABELS: Record<CccRepositoryKey, string> = {
  corporate: "Corporate Repository",
  banking: "Banking Repository",
  financial: "Financial Repository",
  compliance: "Compliance Repository",
  brand: "Brand Asset Repository",
};

export const CCC_INSTITUTION_TYPES = [
  "bank",
  "nbfc",
  "hfc",
  "insurance",
  "amc",
  "regulator",
  "auditor",
  "tech_partner",
  "vendor",
  "government",
  "other",
] as const;

export type CccInstitutionType = (typeof CCC_INSTITUTION_TYPES)[number];

export const CCC_INSTITUTION_TYPE_LABELS: Record<CccInstitutionType, string> = {
  bank: "Bank",
  nbfc: "NBFC",
  hfc: "HFC",
  insurance: "Insurance",
  amc: "AMC",
  regulator: "Regulator",
  auditor: "Auditor",
  tech_partner: "Technology Partner",
  vendor: "Vendor",
  government: "Government",
  other: "Other",
};

export const CCC_PACKAGE_KINDS = [
  "new_lender_onboarding",
  "annual_renewal",
  "banking_kyc",
  "compliance",
  "financial_update",
  "audit",
  "custom",
] as const;

export type CccPackageKind = (typeof CCC_PACKAGE_KINDS)[number];

export const CCC_PACKAGE_KIND_LABELS: Record<CccPackageKind, string> = {
  new_lender_onboarding: "New Lender Onboarding",
  annual_renewal: "Annual Renewal",
  banking_kyc: "Banking KYC",
  compliance: "Compliance",
  financial_update: "Financial Update",
  audit: "Audit",
  custom: "Custom",
};

export const CCC_APPROVAL_STATUSES = [
  "draft",
  "pending",
  "approved",
  "rejected",
  "superseded",
] as const;

export type CccApprovalStatus = (typeof CCC_APPROVAL_STATUSES)[number];

export const CCC_CONFIDENTIALITY_LEVELS = [
  "public",
  "internal",
  "confidential",
  "restricted",
] as const;

export type CccConfidentiality = (typeof CCC_CONFIDENTIALITY_LEVELS)[number];

export const CCC_LEGAL_ENTITY_STATUSES = ["active", "archived"] as const;

export type CccLegalEntityStatus = (typeof CCC_LEGAL_ENTITY_STATUSES)[number];

export const CCC_PACKAGE_INSTANCE_STATUSES = [
  "draft",
  "ready",
  "dispatched",
  "archived",
] as const;

export type CccPackageInstanceStatus = (typeof CCC_PACKAGE_INSTANCE_STATUSES)[number];

export const CCC_DISPATCH_STATUSES = [
  "draft",
  "previewed",
  "queued",
  "sent",
  "failed",
  "acknowledged",
] as const;

export type CccDispatchStatus = (typeof CCC_DISPATCH_STATUSES)[number];

export const CCC_NAV_SECTIONS = [
  { id: "overview", label: "Overview" },
  { id: "entities", label: "Entity Registry" },
  { id: "corporate", label: "Corporate Repository", repositoryKey: "corporate" as const },
  { id: "banking", label: "Banking Repository", repositoryKey: "banking" as const },
  { id: "financial", label: "Financial Repository", repositoryKey: "financial" as const },
  { id: "compliance", label: "Compliance Repository", repositoryKey: "compliance" as const },
  { id: "brand", label: "Brand Asset Repository", repositoryKey: "brand" as const },
  { id: "institutions", label: "Institution Requirements" },
  { id: "packages", label: "Package Builder" },
  { id: "dispatch", label: "Dispatch (EDDE)" },
  { id: "intelligence", label: "Compliance Intelligence" },
] as const;

export type CccNavSectionId = (typeof CCC_NAV_SECTIONS)[number]["id"];

export const CCC_HUB_ROUTE = ROUTES.ORGANIZATION_COMPLIANCE_CENTER;

export const CCC_ORG_DOCUMENTS_ROUTE = ROUTES.ORGANIZATION_DOCUMENTS;

/** Map Organization Documents category → default CCC repository key. */
export function mapOrgDocCategoryToRepositoryKey(
  categoryId: string,
): CccRepositoryKey | null {
  switch (categoryId) {
    case "legal":
      return "corporate";
    case "banking_finance":
      return "banking";
    case "compliance":
      return "compliance";
    case "branding":
      return "brand";
    default:
      return null;
  }
}

/** Financial document type ids for FY tracking. */
export const CCC_FINANCIAL_DOCUMENT_TYPE_IDS = new Set([
  "bf_financials",
  "bf_itr",
  "bf_gst_returns",
  "bf_statement",
]);

export function isFinancialDocumentType(documentTypeId: string): boolean {
  return CCC_FINANCIAL_DOCUMENT_TYPE_IDS.has(documentTypeId);
}
