/**
 * CO-ARCH-002-W3 — Map LoanFile (local SSOT) → Enterprise Deal API payloads.
 * Reads remain local; this is write-path mapping only.
 */
import { migrateLegacyStage } from "@/constants/loan-stage-master";
import type { LoanFile } from "@/types/catalyst-one";
import {
  DEAL_OPERATIONAL_STATUSES,
  DEAL_PRIORITIES,
} from "@/types/enterprise-deal";

export type DealOperationalStatus = (typeof DEAL_OPERATIONAL_STATUSES)[number];
export type DealPriority = (typeof DEAL_PRIORITIES)[number];

export type DealCreateBody = {
  productFamily: "lending";
  grossStage: string;
  /** CO-ARCH-003 BI-2 */
  opportunityId: string;
  /** CO-ARCH-003 BI-3 */
  lenderId: string;
  lenderProgramId?: string | null;
  subStage?: string | null;
  /** Historical Soft Go-Live id — optional; new Deals do not mint LoanFile ids. */
  legacyLoanFileId?: string | null;
  fileNumber?: string | null;
  productLabel?: string | null;
  productCode?: string | null;
  transactionType?: string | null;
  primaryBorrowerKind?: "individual" | "company" | null;
  companyId?: string | null;
  companyName?: string | null;
  primaryContactId?: string | null;
  primaryContactName?: string | null;
  primaryContactMobile?: string | null;
  primaryContactEmail?: string | null;
  relationshipManagerName?: string | null;
  relationshipManagerUserId?: string | null;
  primaryOwnerUserId?: string | null;
  assignmentMode?: string | null;
  priority?: DealPriority;
  requestedAmount?: number | null;
  currencyCode?: string;
  lendingExtension?: Record<string, unknown>;
  snapshot?: Record<string, unknown>;
  primaryCounterpartyName?: string | null;
  invoicePartyType?: string | null;
  invoicePartySpecify?: string | null;
  invoicePartyContactId?: string | null;
  invoicePartyId?: string | null;
};

export type DealUpdateBody = {
  rowVersion: number;
  fileNumber?: string | null;
  productLabel?: string | null;
  transactionType?: string | null;
  subStage?: string | null;
  operationalStatus?: DealOperationalStatus;
  primaryContactId?: string | null;
  primaryContactName?: string | null;
  primaryContactMobile?: string | null;
  primaryContactEmail?: string | null;
  relationshipManagerName?: string | null;
  primaryOwnerUserId?: string | null;
  relationshipManagerUserId?: string | null;
  priority?: DealPriority;
  isUrgent?: boolean;
  isDelayed?: boolean;
  requestedAmount?: number | null;
  approvedAmount?: number | null;
  fulfilledAmount?: number | null;
  lendingExtension?: Record<string, unknown>;
  snapshot?: Record<string, unknown>;
  reason?: string;
  rcEmployeeAssignment?: {
    mode: "override" | "restore_inheritance";
    userId?: string | null;
  };
  invoicePartyType?: string | null;
  invoicePartySpecify?: string | null;
  invoicePartyContactId?: string | null;
  invoicePartyId?: string | null;
  /** CO-ARCH-003 Phase 2B Sprint 2 */
  lenderId?: string | null;
  lenderProgramId?: string | null;
  primaryCounterpartyName?: string | null;
};

export type DealImportValidationIssue = {
  code: string;
  field: string;
  message: string;
  severity: "error" | "warning";
};

export function mapLoanFileGrossStage(file: LoanFile): string {
  return migrateLegacyStage(String(file.stage ?? "raw_lead"));
}

export function mapLoanFileOperationalStatus(file: LoanFile): DealOperationalStatus {
  switch (file.status) {
    case "at_risk":
      return "at_risk";
    case "delayed":
      return "delayed";
    case "completed":
      return "completed";
    default:
      return "on_track";
  }
}

export function mapLoanFilePriority(file: LoanFile): DealPriority {
  const p = file.priority;
  if (p === "urgent" || p === "high" || p === "medium" || p === "low") return p;
  return "medium";
}

export function buildLoanFileDealSnapshot(file: LoanFile): Record<string, unknown> {
  return {
    legacyLoanFileId: file.id,
    fileNumber: file.fileNumber,
    primaryContact: {
      id: file.customerId,
      name: file.customerName,
      mobile: file.customerMobile,
      email: file.customerEmail,
    },
    product: {
      label: file.loanProduct,
      lendingType: file.lendingType,
      transactionType: file.transactionType,
    },
    stage: {
      grossStage: mapLoanFileGrossStage(file),
      subStage: file.stageSubStatus ?? null,
    },
    lenderLabel: file.lender,
    lenders: (file.lenders ?? []).map((l) => ({
      id: l.id,
      name: l.lender,
      status: l.status,
      /** CO-ARCH-003 — Pipeline case stage must survive Registry round-trip. */
      caseStage: l.caseStage,
      lenderRegistryId: l.lenderRegistryId ?? null,
      lenderRef: l.lenderRef ?? null,
      isPrimary: Boolean(l.isPrimary),
      opportunityId: l.opportunityId ?? null,
    })),
    amounts: {
      loanAmount: file.loanAmount,
      requiredAmount: file.requiredAmount,
      sanctionAmount: file.sanctionAmount,
      disbursementAmount: file.disbursementAmount,
    },
  };
}

export function buildLoanFileLendingExtension(file: LoanFile): Record<string, unknown> {
  return {
    lendingType: file.lendingType,
    interestRate: file.interestRate,
    tenure: file.tenure,
    sanctionAmount: file.sanctionAmount,
    disbursementAmount: file.disbursementAmount,
    finalLoanAmount: file.finalLoanAmount,
    finalRoi: file.finalRoi,
    finalTenure: file.finalTenure,
    btInstitutionId: file.btInstitutionId,
    btInstitutionName: file.btInstitutionName,
    btAmount: file.btAmount,
    propertyType: file.propertyType,
    occupancyId: file.occupancyId,
    approxPropertyValue: file.approxPropertyValue,
    approxCibilScore: file.approxCibilScore,
  };
}

/** Validates a LoanFile can be dual-written / imported as a Deal (no I/O). */
export function validateLoanFileForDealImport(file: LoanFile): DealImportValidationIssue[] {
  const issues: DealImportValidationIssue[] = [];
  if (!file?.id?.trim()) {
    issues.push({
      code: "MISSING_ID",
      field: "id",
      message: "legacyLoanFileId (LoanFile.id) is required",
      severity: "error",
    });
  }
  if (!file.customerName?.trim()) {
    issues.push({
      code: "MISSING_CUSTOMER_NAME",
      field: "customerName",
      message: "Primary customer name is required for Deal snapshot",
      severity: "error",
    });
  }
  if (!file.loanProduct?.trim()) {
    issues.push({
      code: "MISSING_PRODUCT",
      field: "loanProduct",
      message: "Product label is required",
      severity: "warning",
    });
  }
  if (!file.stage) {
    issues.push({
      code: "MISSING_STAGE",
      field: "stage",
      message: "Stage is required; defaulting to raw_lead if empty at write time",
      severity: "warning",
    });
  }
  if (file.loanAmount == null && file.requiredAmount == null) {
    issues.push({
      code: "MISSING_AMOUNT",
      field: "loanAmount",
      message: "Requested amount missing",
      severity: "warning",
    });
  }
  return issues;
}

export function resolvePrimaryLenderRegistryId(file: LoanFile): string | null {
  const primary =
    file.lenders?.find((l) => l.isPrimary && l.lenderRegistryId?.trim()) ??
    file.lenders?.find((l) => l.lenderRegistryId?.trim());
  return primary?.lenderRegistryId?.trim() || null;
}

export function mapLoanFileToOpportunityCreateBody(file: LoanFile) {
  if (!file.customerId?.trim()) {
    throw new Error(
      "Borrower party id (LoanFile.customerId) is required for Opportunity create — Contact for Individual or Company for Company borrower",
    );
  }
  const productLabel = file.loanProduct?.trim() || "Home Loan";
  // Legacy LoanFile create path is Individual-oriented; company borrowers
  // must use startOpportunityFromCompany / Registry create with primaryBorrowerKind.
  return {
    primaryBorrowerKind: "individual" as const,
    primaryContactId: file.customerId,
    productFamily: "lending" as const,
    requirementStage: "raw_lead",
    productLabel,
    productCode: productLabel.toUpperCase().replace(/\s+/g, "_"),
    requestedAmount: file.requiredAmount || file.loanAmount || null,
    legacyLoanFileId: file.id,
    primaryContactName: file.customerName ?? null,
    primaryContactMobile: file.customerMobile ?? null,
    primaryContactEmail: file.customerEmail ?? null,
    relationshipManagerName: file.relationshipManager ?? null,
    transactionType: file.transactionType ?? null,
    priority: mapLoanFilePriority(file),
  };
}

export function mapLoanFileToDealCreateBody(
  file: LoanFile,
  links: { opportunityId: string; lenderId: string; lenderProgramId?: string | null },
): DealCreateBody {
  const errors = validateLoanFileForDealImport(file).filter((i) => i.severity === "error");
  if (errors.length > 0) {
    throw new Error(errors.map((e) => e.message).join("; "));
  }
  if (!links.opportunityId?.trim()) {
    throw new Error("opportunityId is required for Deal create (BI-2)");
  }
  if (!links.lenderId?.trim()) {
    throw new Error("lenderId is required for Deal create (BI-3)");
  }

  const primary =
    file.lenders?.find((l) => l.lenderRegistryId === links.lenderId) ??
    file.lenders?.find((l) => l.isPrimary);

  return {
    productFamily: "lending",
    grossStage: mapLoanFileGrossStage(file),
    opportunityId: links.opportunityId,
    lenderId: links.lenderId,
    lenderProgramId: links.lenderProgramId ?? null,
    subStage: file.stageSubStatus ?? null,
    legacyLoanFileId: file.id,
    fileNumber: file.fileNumber ?? null,
    productLabel: file.loanProduct ?? null,
    productCode: null,
    transactionType: file.transactionType ?? null,
    primaryContactId: file.customerId ?? null,
    primaryContactName: file.customerName ?? null,
    primaryContactMobile: file.customerMobile ?? null,
    primaryContactEmail: file.customerEmail ?? null,
    relationshipManagerName: file.relationshipManager ?? null,
    priority: mapLoanFilePriority(file),
    requestedAmount: file.requiredAmount || file.loanAmount || null,
    currencyCode: "INR",
    lendingExtension: buildLoanFileLendingExtension(file),
    snapshot: buildLoanFileDealSnapshot(file),
    primaryCounterpartyName:
      primary?.lenderDisplayName || primary?.lender || file.lender || null,
    invoicePartyType: file.commercialPayee ?? null,
    invoicePartySpecify: file.commercialPayeeSpecify ?? null,
    invoicePartyContactId:
      file.invoicePartyContactId ??
      (file.commercialPayee === "customer" ? file.customerId : null) ??
      null,
    invoicePartyId: file.invoicePartyId ?? file.commissionAccountingPayeeId ?? null,
  };
}

export function mapLoanFileToDealUpdateBody(
  file: LoanFile,
  rowVersion: number,
): DealUpdateBody {
  return {
    rowVersion,
    fileNumber: file.fileNumber ?? null,
    productLabel: file.loanProduct ?? null,
    transactionType: file.transactionType ?? null,
    subStage: file.stageSubStatus ?? null,
    operationalStatus: mapLoanFileOperationalStatus(file),
    primaryContactId: file.customerId ?? null,
    primaryContactName: file.customerName ?? null,
    primaryContactMobile: file.customerMobile ?? null,
    primaryContactEmail: file.customerEmail ?? null,
    relationshipManagerName: file.relationshipManager ?? null,
    priority: mapLoanFilePriority(file),
    isUrgent: Boolean(file.isUrgent),
    isDelayed: Boolean(file.isDelayed),
    requestedAmount: file.requiredAmount || file.loanAmount || null,
    approvedAmount: file.sanctionAmount || file.finalLoanAmount || null,
    fulfilledAmount: file.disbursementAmount || null,
    lendingExtension: buildLoanFileLendingExtension(file),
    snapshot: buildLoanFileDealSnapshot(file),
    reason: "dual_write_sync",
    invoicePartyType: file.commercialPayee ?? null,
    invoicePartySpecify: file.commercialPayeeSpecify ?? null,
    invoicePartyContactId:
      file.invoicePartyContactId ??
      (file.commercialPayee === "customer" ? file.customerId : null) ??
      null,
    invoicePartyId: file.invoicePartyId ?? file.commissionAccountingPayeeId ?? null,
  };
}

/** Stable fingerprint for dual-write diffing (skip unchanged files). */
export function loanFileDealSyncFingerprint(file: LoanFile): string {
  return JSON.stringify({
    id: file.id,
    fileNumber: file.fileNumber,
    stage: file.stage,
    stageSubStatus: file.stageSubStatus,
    status: file.status,
    priority: file.priority,
    archived: Boolean(file.archived),
    customerId: file.customerId,
    customerName: file.customerName,
    customerMobile: file.customerMobile,
    customerEmail: file.customerEmail,
    loanProduct: file.loanProduct,
    loanAmount: file.loanAmount,
    requiredAmount: file.requiredAmount,
    sanctionAmount: file.sanctionAmount,
    disbursementAmount: file.disbursementAmount,
    lender: file.lender,
    relationshipManager: file.relationshipManager,
    isUrgent: file.isUrgent,
    isDelayed: file.isDelayed,
    transactionType: file.transactionType,
    lenders: (file.lenders ?? []).map((l) => `${l.id}:${l.status}:${l.caseStage}`),
  });
}
