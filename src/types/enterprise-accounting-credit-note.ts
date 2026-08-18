export type CreateEnterpriseAccountingCreditNoteInput = {
  invoiceId: string;
  invoiceRowVersion: number;
  creditNoteAmount: number;
  creditNoteDate: string;
  reason: string;
};

export type EnterpriseAccountingCreditNoteDto = {
  id: string;
  organizationId: string;
  invoiceId: string;
  financialYearKey: string;
  sequenceNumber: number;
  creditNoteNumber: string;
  creditNoteDate: string;
  reason: string;
  taxableAmount: number;
  gstRatePercent: number;
  gstAmount: number;
  creditNoteAmount: number;
  status: string;
  issuedBy: string;
  issuedAt: string;
  rowVersion: number;
  createdAt: string;
  updatedAt: string;
};
