import { isAccountingInvoiceRaiseRole } from "@/constants/enterprise-accounting-invoice";

export const ACCOUNTING_PAYMENT_SOURCE = "enterprise_accounting_payment" as const;

export const ACCOUNTING_PAYMENT_STATUS = {
  draft: "draft",
  posted: "posted",
  voided: "voided",
} as const;

export type AccountingPaymentStatus =
  (typeof ACCOUNTING_PAYMENT_STATUS)[keyof typeof ACCOUNTING_PAYMENT_STATUS];

export const ACCOUNTING_PAYMENT_MODES = [
  "neft",
  "rtgs",
  "imps",
  "upi",
  "cheque",
  "cash",
  "other",
] as const;

export type AccountingPaymentMode = (typeof ACCOUNTING_PAYMENT_MODES)[number];

export const ACCOUNTING_RECEIVABLE_PAYMENT_STATUS = {
  unpaid: "UNPAID",
  partially_paid: "PARTIALLY_PAID",
  paid: "PAID",
} as const;

export type AccountingReceivablePaymentStatus =
  (typeof ACCOUNTING_RECEIVABLE_PAYMENT_STATUS)[keyof typeof ACCOUNTING_RECEIVABLE_PAYMENT_STATUS];

export const ACCOUNTING_PAYMENT_POSTED_EAR_TITLE = "Payment Posted";
export const ACCOUNTING_PAYMENT_VOIDED_EAR_TITLE = "Payment Voided";

export const ACCOUNTING_INVOICE_PAYMENT_ELIGIBLE_STATUS = ["raised", "shared"] as const;

export function isAccountingPaymentRole(role: string | null | undefined): boolean {
  return isAccountingInvoiceRaiseRole(role);
}

export function isAccountingPaymentMode(value: string): value is AccountingPaymentMode {
  return (ACCOUNTING_PAYMENT_MODES as readonly string[]).includes(value);
}

export function paymentPostedEventId(paymentId: string): string {
  return `accounting-payment:${paymentId}:posted`;
}

export function paymentVoidedEventId(paymentId: string): string {
  return `accounting-payment:${paymentId}:voided`;
}
