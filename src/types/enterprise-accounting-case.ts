export type PostDisbursementConfirmationSubStage =
  | "confirmation_pending"
  | "confirmation_received";

export type AccountingMoneyInput = number | null;

export type ConfirmPostDisbursementInput = {
  rowVersion: number;
  upstreamSnapshot?: Record<string, unknown> | null;
  finalAmount?: AccountingMoneyInput;
  disbursedAmount?: AccountingMoneyInput;
  disbursedDate?: string | null;
  roiPercent?: AccountingMoneyInput;
  fees?: Record<string, unknown> | unknown[] | null;
  commissionPercent?: AccountingMoneyInput;
  expectedCommission?: AccountingMoneyInput;
  confirmedInvoiceAmount?: AccountingMoneyInput;
  payoutAmount?: AccountingMoneyInput;
  tdsAmount?: AccountingMoneyInput;
  shortPaymentAmount?: AccountingMoneyInput;
  reconciliation?: Record<string, unknown> | null;
};

export type UpdateEnterpriseAccountingCaseInput = {
  rowVersion: number;
  status?: string;
  finalAmount?: AccountingMoneyInput;
  disbursedAmount?: AccountingMoneyInput;
  disbursedDate?: string | null;
  roiPercent?: AccountingMoneyInput;
  fees?: Record<string, unknown> | unknown[] | null;
  commissionPercent?: AccountingMoneyInput;
  expectedCommission?: AccountingMoneyInput;
  confirmedInvoiceAmount?: AccountingMoneyInput;
  payoutAmount?: AccountingMoneyInput;
  tdsAmount?: AccountingMoneyInput;
  shortPaymentAmount?: AccountingMoneyInput;
  reconciliation?: Record<string, unknown> | null;
};

export type EnterpriseAccountingCaseQuery = {
  q?: string;
  status?: string;
  dealId?: string;
  page?: number;
  pageSize?: number;
};
