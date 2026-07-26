/**
 * CO-SPRINT-095 — Accounting Workspace contracts (mock UI only).
 */

export type InvoiceStatus = "draft" | "raised" | "shared" | "cancelled";
export type PaymentStatus = "unpaid" | "partial" | "paid" | "overdue";
export type PayoutStatus = "expected" | "pending" | "received" | "overdue";

export interface AccountingFinancialSummary {
  totalRevenue: number;
  invoicesRaised: number;
  outstandingReceivables: number;
  expectedPayouts: number;
  gstCollected: number;
  todaysCollections: number;
  mtdRevenue: number;
  ytdRevenue: number;
}

export interface AccountingInvoice {
  id: string;
  invoiceNumber: string;
  invoiceDate: string;
  customer: string;
  lender: string;
  product: string;
  loanAmount: number;
  taxableValue: number;
  gst: number;
  invoiceAmount: number;
  invoiceStatus: InvoiceStatus;
  paymentStatus: PaymentStatus;
  loanFileRef: string;
  gstin?: string;
  notes?: string;
  paymentHistory: Array<{ id: string; date: string; amount: number; mode: string }>;
  auditTrail: Array<{ id: string; at: string; actor: string; action: string }>;
}

export interface AccountingPayout {
  id: string;
  lender: string;
  product: string;
  expectedPayout: number;
  receivedPayout: number;
  pendingPayout: number;
  expectedDate: string;
  actualDate?: string;
  difference: number;
  status: PayoutStatus;
}

export type FinancialActivityKind =
  | "invoice_created"
  | "invoice_shared"
  | "payment_received"
  | "payout_received"
  | "adjustment"
  | "credit_note"
  | "debit_note";

export interface FinancialActivityEvent {
  id: string;
  kind: FinancialActivityKind;
  title: string;
  detail: string;
  at: string;
}

export interface ChanakyaFinancialInsight {
  id: string;
  tone: "attention" | "info" | "positive";
  title: string;
  message: string;
}

export interface AccountingWorkspaceModel {
  summary: AccountingFinancialSummary;
  invoices: AccountingInvoice[];
  payouts: AccountingPayout[];
  activity: FinancialActivityEvent[];
  insights: ChanakyaFinancialInsight[];
}
