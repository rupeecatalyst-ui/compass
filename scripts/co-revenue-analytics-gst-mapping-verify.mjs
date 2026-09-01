/**
 * Revenue Analytics GST mapping — synthetic invoices only. Does not write production data.
 */
import assert from "node:assert/strict";
import { deriveRevenueAnalytics } from "../src/lib/revenue-analytics/derive-revenue-analytics.ts";
import type { EnterpriseAccountingInvoiceDto } from "../src/types/enterprise-accounting-invoice.ts";

function baseInvoice(partial) {
  return {
    id: "inv-syn-1",
    organizationId: "org-isolated",
    accountingCaseId: "case-1",
    dealId: "deal-1",
    opportunityId: null,
    invoicePartyId: "party-1",
    gstRateId: "gst-18",
    productId: null,
    productCode: "HL",
    productLabel: "Home Loan",
    productFamily: "retail",
    invoiceProductPrefix: "HL",
    financialYearKey: "2026-27",
    sequenceNumber: 1,
    invoiceNumber: "HL/001",
    invoiceDate: "2026-08-15T00:00:00.000Z",
    dueDate: null,
    confirmationReference: "conf-1",
    partyBillingName: "Synthetic Lender",
    partyGstin: "27AAAAA0000A1Z5",
    partyPan: null,
    partyBillingAddress: null,
    partyStateLabel: "Maharashtra",
    partyGstStatus: "registered",
    partyTdsApplicable: false,
    partyTdsRatePercent: null,
    partyDisplayName: "Synthetic Lender",
    partyInvoiceEmail: null,
    taxableValue: 100000,
    gstRatePercent: 18,
    gstAmount: 18000,
    invoiceTotal: 118000,
    tdsRatePercent: null,
    tdsAmount: 0,
    netReceivable: 118000,
    taxDetermination: null,
    signatureAppliedAt: null,
    signatureAuthorityId: null,
    signatureAuthorityName: null,
    signatureDesignation: null,
    hasSignedPdf: false,
    lastSendAudit: null,
    amountReceived: 0,
    creditNoteAmount: 0,
    outstanding: 118000,
    paymentStatus: "UNPAID",
    documentStatus: "raised",
    raisedBy: "verify",
    raisedAt: "2026-08-15T00:00:00.000Z",
    cancelledAt: null,
    cancelledBy: null,
    cancellationReason: null,
    rowVersion: 1,
    createdAt: "2026-08-15T00:00:00.000Z",
    updatedAt: "2026-08-15T00:00:00.000Z",
    payments: [],
    creditNotes: [],
    ...partial,
  };
}

const empty = deriveRevenueAnalytics({ invoices: [], summary: null, ebi: null });
assert.equal(empty.gstBreakdown.taxableRevenue, 0);
assert.equal(empty.hasAccountingData, false);

const intra = baseInvoice({
  taxDetermination: {
    version: "CO-ACCOUNTING-INVOICE-OPERATIONS-015-V1",
    determinedAt: "2026-08-15T00:00:00.000Z",
    placeOfSupplyStateCode: "27",
    placeOfSupplyStateLabel: "Maharashtra",
    supplierStateCode: "27",
    supplierStateLabel: "Maharashtra",
    supplierGstin: "27BBBBB0000B1Z5",
    recipientStateCode: "27",
    recipientStateLabel: "Maharashtra",
    recipientGstin: "27AAAAA0000A1Z5",
    taxTreatment: "intra_state",
    gstRatePercent: 18,
    cgstRatePercent: 9,
    sgstRatePercent: 9,
    igstRatePercent: 0,
    cgstAmount: 9000,
    sgstAmount: 9000,
    igstAmount: 0,
    gstAmount: 18000,
    taxableValue: 100000,
    invoiceTotal: 118000,
    stateTaxLabel: "SGST",
    rulesUsed: [],
    determinationNotes: [],
  },
});

const inter = baseInvoice({
  id: "inv-syn-2",
  invoiceNumber: "HL/002",
  taxableValue: 50000,
  gstAmount: 9000,
  invoiceTotal: 59000,
  netReceivable: 59000,
  outstanding: 59000,
  taxDetermination: {
    version: "CO-ACCOUNTING-INVOICE-OPERATIONS-015-V1",
    determinedAt: "2026-08-15T00:00:00.000Z",
    placeOfSupplyStateCode: "24",
    placeOfSupplyStateLabel: "Gujarat",
    supplierStateCode: "27",
    supplierStateLabel: "Maharashtra",
    supplierGstin: "27BBBBB0000B1Z5",
    recipientStateCode: "24",
    recipientStateLabel: "Gujarat",
    recipientGstin: "24CCCCC0000C1Z5",
    taxTreatment: "inter_state",
    gstRatePercent: 18,
    cgstRatePercent: 0,
    sgstRatePercent: 0,
    igstRatePercent: 18,
    cgstAmount: 0,
    sgstAmount: 0,
    igstAmount: 9000,
    gstAmount: 9000,
    taxableValue: 50000,
    invoiceTotal: 59000,
    stateTaxLabel: "SGST",
    rulesUsed: [],
    determinationNotes: [],
  },
});

const derived = deriveRevenueAnalytics({
  invoices: [intra, inter],
  summary: {
    totalInvoiced: 177000,
    totalReceived: 0,
    creditNotesTotal: 0,
    outstanding: 177000,
    invoicesRaised: 2,
    paidCount: 0,
    partiallyPaidCount: 0,
    unpaidCount: 2,
    todaysCollections: 0,
  },
  ebi: null,
});

assert.equal(derived.gstBreakdown.taxableRevenue, 150000);
assert.equal(derived.gstBreakdown.totalGst, 27000);
assert.equal(derived.gstBreakdown.cgst, 9000);
assert.equal(derived.gstBreakdown.sgst, 9000);
assert.equal(derived.gstBreakdown.igst, 9000);
assert.equal(derived.hasAccountingData, true);
assert.ok(derived.kpis.some((k) => k.id === "taxable"));
assert.ok(derived.kpis.some((k) => k.id === "gst-total"));
console.log("OK: Revenue Analytics GST mapping from synthetic invoices");
