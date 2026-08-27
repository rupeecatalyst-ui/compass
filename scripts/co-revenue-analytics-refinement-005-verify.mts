/**
 * CO-REFINEMENT-005 — Revenue Analytics move verify.
 */
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { deriveRevenueAnalytics } from "../src/lib/revenue-analytics/derive-revenue-analytics.ts";
import type { EbiSnapshot } from "../src/types/enterprise-business-intelligence.ts";
import type { EnterpriseAccountingInvoiceDto } from "../src/types/enterprise-accounting-invoice.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function read(rel: string): string {
  const abs = join(root, rel);
  assert.ok(existsSync(abs), `Missing: ${rel}`);
  return readFileSync(abs, "utf8");
}

function mustContain(rel: string, needle: string, label?: string) {
  assert.ok(read(rel).includes(needle), `${label ?? rel}: expected "${needle}"`);
}

mustContain(
  "src/mission-control/feature-registry/registry.ts",
  "Revenue Analytics",
  "MC registry",
);
mustContain(
  "src/mission-control/feature-registry/registry.ts",
  'route: "/mission-control/revenue-analytics"',
);
mustContain(
  "src/app/(mission-control)/mission-control/revenue-analytics/page.tsx",
  "RevenueAnalyticsWorkspace",
);
mustContain(
  "src/constants/routes.ts",
  "MISSION_CONTROL_REVENUE_ANALYTICS",
);
assert.ok(
  !read("src/constants/accounting-workbench.ts").includes('"reports"'),
  "reports workbench removed from accounting",
);
mustContain(
  "src/components/catalyst-one/accounting/accounting-workspace.tsx",
  "MISSION_CONTROL_REVENUE_ANALYTICS",
  "legacy redirect",
);
mustContain(
  "src/mission-control/revenue-analytics/RevenueAnalyticsWorkspace.tsx",
  "McAnalyticsExpandCard",
);
mustContain(
  "src/mission-control/revenue-analytics/RevenueAnalyticsWorkspace.tsx",
  "deriveRevenueAnalytics",
);
assert.ok(
  !read("src/components/catalyst-one/accounting/accounting-workbench-views.tsx").includes(
    "AccountingReportsWorkbench",
  ),
  "AccountingReportsWorkbench removed",
);

const sampleInvoice: EnterpriseAccountingInvoiceDto = {
  id: "inv-1",
  organizationId: "org",
  accountingCaseId: "case-1",
  dealId: "deal-1",
  opportunityId: null,
  invoicePartyId: "party-1",
  gstRateId: "gst-1",
  productId: null,
  productCode: "HL",
  productLabel: "Home Loan",
  productFamily: "retail",
  invoiceProductPrefix: "HL",
  financialYearKey: "2025-26",
  sequenceNumber: 1,
  invoiceNumber: "HL/001",
  invoiceDate: "2026-08-01",
  dueDate: null,
  confirmationReference: "ref",
  partyBillingName: "Bank A",
  partyGstin: null,
  partyPan: null,
  partyBillingAddress: null,
  partyStateLabel: null,
  partyGstStatus: null,
  partyTdsApplicable: false,
  partyTdsRatePercent: null,
  partyDisplayName: "Bank A",
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
  amountReceived: 50000,
  creditNoteAmount: 0,
  outstanding: 68000,
  paymentStatus: "PARTIALLY_PAID",
  documentStatus: "raised",
  raisedBy: "admin",
  raisedAt: "2026-08-01T00:00:00.000Z",
  cancelledAt: null,
  cancelledBy: null,
  cancellationReason: null,
  rowVersion: 1,
  createdAt: "2026-08-01T00:00:00.000Z",
  updatedAt: "2026-08-01T00:00:00.000Z",
  payments: [
    {
      id: "pay-1",
      organizationId: "org",
      invoiceId: "inv-1",
      accountingCaseId: "case-1",
      dealId: "deal-1",
      opportunityId: null,
      paymentDate: "2026-08-15",
      amount: 50000,
      paymentReference: "NEFT-1",
      paymentMode: "NEFT",
      status: "POSTED",
      receivedBy: "admin",
      receivedAt: "2026-08-15T00:00:00.000Z",
      notes: null,
      reconciliation: null,
      voidedAt: null,
      voidedBy: null,
      voidReason: null,
      rowVersion: 1,
      createdAt: "2026-08-15T00:00:00.000Z",
      updatedAt: "2026-08-15T00:00:00.000Z",
    },
  ],
  creditNotes: [],
};

const ebi: EbiSnapshot = {
  asOf: new Date().toISOString(),
  executive: {
    asOf: new Date().toISOString(),
    activeOpportunities: 1,
    activeDeals: 1,
    dealsByStage: [],
    dealsByProduct: [{ name: "Home Loan", count: 1, value: 200000 }],
    dealsByBranch: [],
    dealsByRm: [{ name: "Amit Sharma", count: 1, value: 200000 }],
    averageDealSize: 100000,
    averageProcessingDays: 10,
    pipelineValue: 5000000,
    conversionRatioPct: 50,
    expectedRevenue: 200000,
    sourceModules: ["test"],
  },
  operational: {
    asOf: new Date().toISOString(),
    tasksDueToday: 0,
    overdueTasks: 0,
    averageTaskCompletionHours: null,
    inactiveOpportunities: 0,
    dealsAwaitingDocuments: 0,
    dealsAwaitingLenderAction: 0,
    documentCollectionProgressPct: 0,
    completedTasksToday: 0,
    sourceModules: ["test"],
  },
  team: { asOf: new Date().toISOString(), members: [], sourceModules: ["test"] },
  health: {
    asOf: new Date().toISOString(),
    overallScore: 80,
    status: "healthy",
    dimensions: [],
    summary: "ok",
    sourceModules: ["test"],
  },
  insights: [],
};

const model = deriveRevenueAnalytics({
  invoices: [sampleInvoice],
  summary: {
    totalInvoiced: 118000,
    totalReceived: 50000,
    creditNotesTotal: 0,
    outstanding: 68000,
    invoicesRaised: 1,
    paidCount: 0,
    partiallyPaidCount: 1,
    unpaidCount: 0,
    todaysCollections: 0,
  },
  ebi,
  cases: [{ id: "case-1", dealId: "deal-1", rowVersion: 1, disbursedAmount: 5000000 }],
});

assert.equal(model.hasAccountingData, true);
assert.equal(model.hasPipelineData, true);
assert.equal(model.waterfall.find((s) => s.state === "invoiced")?.value, 118000);
assert.equal(model.waterfall.find((s) => s.state === "received")?.value, 50000);
assert.equal(model.byProduct[0]?.name, "Home Loan");
assert.equal(model.byLenderParty[0]?.name, "Bank A");
assert.ok(model.disbursementVsRevenue?.totalDisbursed === 5000000);

console.log("CO-REFINEMENT-005 verify OK — Revenue Analytics in MC · accounting ops preserved.");
