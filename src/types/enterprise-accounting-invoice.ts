import type { EnterpriseAccountingCreditNoteDto } from "@/types/enterprise-accounting-credit-note";
import type { EnterpriseAccountingPaymentDto } from "@/types/enterprise-accounting-payment";
import type { AccountingTaxDeterminationSnapshot } from "@/lib/enterprise-accounting-regulatory-tax/determine-gst";

export type RaiseEnterpriseAccountingInvoiceInput = {
  accountingCaseId: string;
  rowVersion: number;
  gstRateId: string;
  invoiceDate?: string;
  dueDate?: string | null;
  /** Explicit Place of Supply state code (GSTIN prefix). Preferred when set. */
  placeOfSupplyStateCode?: string | null;
  /**
   * @deprecated Prefer omit. Payer TDS is never assumed at raise (015).
   * If provided, must be 0.
   */
  tdsAmount?: number | null;
};

export type SendEnterpriseAccountingInvoiceInput = {
  invoiceId: string;
  invoiceRowVersion: number;
  to?: string[];
  cc?: string[];
  subject?: string;
};

export type ApplyInvoiceSignatureInput = {
  invoiceId: string;
  invoiceRowVersion: number;
  signatureAuthorityId?: string | null;
};

export type EnterpriseAccountingInvoiceSendAudit = {
  invoiceId: string;
  accountingCaseId: string;
  dealId: string;
  opportunityId: string | null;
  from: string;
  to: string[];
  cc: string[];
  subject: string;
  sentAt: string;
  messageId: string | null;
  attachmentPresent: boolean;
  sendStatus: "sent" | "failed";
  initiatedBy: string;
  smtpResponse?: string | null;
  failureMessage?: string | null;
};

export type EnterpriseAccountingInvoiceDto = {
  id: string;
  organizationId: string;
  accountingCaseId: string;
  dealId: string;
  opportunityId: string | null;
  invoicePartyId: string;
  gstRateId: string;
  productId: string | null;
  productCode: string | null;
  productLabel: string | null;
  productFamily: string;
  invoiceProductPrefix: string;
  financialYearKey: string;
  sequenceNumber: number;
  invoiceNumber: string;
  invoiceDate: string;
  dueDate: string | null;
  confirmationReference: string;
  partyBillingName: string;
  partyGstin: string | null;
  partyPan: string | null;
  partyBillingAddress: string | null;
  partyStateLabel: string | null;
  partyGstStatus: string | null;
  partyTdsApplicable: boolean;
  partyTdsRatePercent: number | null;
  partyDisplayName: string;
  partyInvoiceEmail: string | null;
  taxableValue: number;
  gstRatePercent: number;
  gstAmount: number;
  invoiceTotal: number;
  tdsRatePercent: number | null;
  tdsAmount: number;
  netReceivable: number;
  taxDetermination: AccountingTaxDeterminationSnapshot | null;
  signatureAppliedAt: string | null;
  signatureAuthorityId: string | null;
  signatureAuthorityName: string | null;
  signatureDesignation: string | null;
  hasSignedPdf: boolean;
  lastSendAudit: EnterpriseAccountingInvoiceSendAudit | null;
  amountReceived: number;
  creditNoteAmount: number;
  outstanding: number;
  paymentStatus: string;
  documentStatus: string;
  raisedBy: string;
  raisedAt: string;
  cancelledAt: string | null;
  cancelledBy: string | null;
  cancellationReason: string | null;
  rowVersion: number;
  createdAt: string;
  updatedAt: string;
  dealNumber?: string | null;
  customerName?: string | null;
  payments: EnterpriseAccountingPaymentDto[];
  creditNotes: EnterpriseAccountingCreditNoteDto[];
};
