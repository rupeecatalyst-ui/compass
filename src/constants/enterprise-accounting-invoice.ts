import { POST_DISBURSEMENT_CONFIRMATION_STAGE, POST_DISBURSEMENT_CONFIRMATION_SUB_STAGES } from "@/constants/post-disbursement-confirmation";

export const ACCOUNTING_INVOICE_SOURCE = "enterprise_accounting_invoice" as const;

export const ACCOUNTING_INVOICE_DOCUMENT_STATUS = {
  draft: "draft",
  raised: "raised",
  shared: "shared",
  cancelled: "cancelled",
} as const;

export type AccountingInvoiceDocumentStatus =
  (typeof ACCOUNTING_INVOICE_DOCUMENT_STATUS)[keyof typeof ACCOUNTING_INVOICE_DOCUMENT_STATUS];

export const ACCOUNTING_INVOICE_PREFIX = {
  lending: "LN",
  mutual_fund: "MF",
} as const;

export type AccountingInvoiceProductFamily = keyof typeof ACCOUNTING_INVOICE_PREFIX;

export const ACCOUNTING_INVOICE_BLOCKED_FAMILIES = [
  "insurance",
  "bonds",
  "pms",
  "other",
] as const;

export const ACCOUNTING_INVOICE_RAISE_ROLES = ["ADMIN", "SUPER_ADMIN"] as const;

export const ACCOUNTING_INVOICE_EAR_TITLE = "Invoice Raised";

export const ACCOUNTING_CASE_ELIGIBLE_STAGE = POST_DISBURSEMENT_CONFIRMATION_STAGE;
export const ACCOUNTING_CASE_ELIGIBLE_SUB_STAGE =
  POST_DISBURSEMENT_CONFIRMATION_SUB_STAGES.received;

export function isAccountingInvoiceRaiseRole(role: string | null | undefined): boolean {
  return role === "ADMIN" || role === "SUPER_ADMIN";
}

export function invoiceNumberFromParts(
  prefix: string,
  financialYearKey: string,
  sequenceNumber: number,
): string {
  return `${prefix}-${financialYearKey}-${String(sequenceNumber).padStart(6, "0")}`;
}

export function invoiceRaisedEventId(invoiceId: string): string {
  return `accounting-invoice:${invoiceId}:raised`;
}
