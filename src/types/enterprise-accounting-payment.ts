import type { AccountingReceivablePaymentStatus } from "@/constants/enterprise-accounting-payment";

export type PostEnterpriseAccountingPaymentInput = {
  invoiceId: string;
  invoiceRowVersion: number;
  amount: number;
  paymentDate: string;
  paymentReference: string;
  paymentMode: string;
  notes?: string | null;
};

export type VoidEnterpriseAccountingPaymentInput = {
  reason: string;
};

export type EnterpriseAccountingPaymentDto = {
  id: string;
  organizationId: string;
  invoiceId: string;
  accountingCaseId: string;
  dealId: string;
  opportunityId: string | null;
  paymentDate: string;
  amount: number;
  paymentReference: string;
  paymentMode: string;
  status: string;
  receivedBy: string;
  receivedAt: string;
  notes: string | null;
  voidedAt: string | null;
  voidedBy: string | null;
  voidReason: string | null;
  rowVersion: number;
  createdAt: string;
  updatedAt: string;
};

export type DerivedInvoiceReceivable = {
  invoiceTotal: number;
  netReceivable: number;
  amountReceived: number;
  creditNoteAmount: number;
  outstanding: number;
  paymentStatus: AccountingReceivablePaymentStatus;
};

export type DerivedAccountingPaymentSummary = {
  totalInvoiced: number;
  totalReceived: number;
  creditNotesTotal: number;
  outstanding: number;
  invoicesRaised: number;
  paidCount: number;
  partiallyPaidCount: number;
  unpaidCount: number;
  todaysCollections: number;
};
