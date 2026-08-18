import {
  invoiceNumberFromParts,
  isAccountingInvoiceRaiseRole,
} from "@/constants/enterprise-accounting-invoice";

export const ACCOUNTING_CREDIT_NOTE_SOURCE = "enterprise_accounting_credit_note" as const;
export const ACCOUNTING_CREDIT_NOTE_PREFIX = "CN" as const;
export const ACCOUNTING_CREDIT_NOTE_STATUS = { posted: "posted" } as const;
export const ACCOUNTING_CREDIT_NOTE_EAR_TITLE = "Credit Note Created";

export function isAccountingCreditNoteRole(role: string | null | undefined): boolean {
  return isAccountingInvoiceRaiseRole(role);
}

export function creditNoteNumberFromParts(financialYearKey: string, sequenceNumber: number): string {
  return invoiceNumberFromParts(ACCOUNTING_CREDIT_NOTE_PREFIX, financialYearKey, sequenceNumber);
}

export function creditNoteCreatedEventId(creditNoteId: string): string {
  return `accounting-credit-note:${creditNoteId}:created`;
}
