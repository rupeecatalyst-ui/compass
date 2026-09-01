import type { AccountingReceivablePaymentStatus } from "@/constants/enterprise-accounting-payment";
import type {
  AccountingWithholdingClassification,
  ActualCreditReconciliationResult,
} from "@/lib/enterprise-accounting-invoice/payment-reconciliation";

export type PostEnterpriseAccountingPaymentInput = {
  invoiceId: string;
  invoiceRowVersion: number;
  /** Amount Credited (bank credit). Prefer this over legacy `amount`. */
  amountCredited?: number;
  /** Legacy alias — treated as Amount Credited when amountCredited omitted */
  amount?: number;
  paymentDate: string;
  paymentReference: string;
  paymentMode: string;
  notes?: string | null;
  otherAdjustment?: number | null;
  classifyDifferenceAs?: AccountingWithholdingClassification | null;
  confirmWithholdingAsTds?: boolean;
  payerReference?: string | null;
  tdsCertificateReference?: string | null;
  tdsCertificateDate?: string | null;
};

export type VoidEnterpriseAccountingPaymentInput = {
  reason: string;
};

export type EnterpriseAccountingPaymentReconciliationDto = ActualCreditReconciliationResult & {
  payerReference?: string | null;
  tdsCertificateReference?: string | null;
  tdsCertificateDate?: string | null;
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
  reconciliation: EnterpriseAccountingPaymentReconciliationDto | null;
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
