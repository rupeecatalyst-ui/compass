/**
 * CO-ORG-004 — Accounting Workspace empty enterprise model.
 * Mock ₹ KPIs / invoices removed. Ledger SSOT (Deal-keyed) not yet bound —
 * surfaces must show empty / awaiting Accounting Registry, never invented numbers.
 *
 * CO-ARCH-007 — When Accounting is SSOT-backed, every commission / invoice / payout
 * must key by enterpriseDealId; Opportunity totals = SUM(child Deals).
 */

import type { AccountingWorkspaceModel } from "./types";

export const ACCOUNTING_SSOT_PENDING_MESSAGE =
  "Accounting Registry is not yet bound. No live invoices, GST, or payout figures are available.";

/** Empty financial model — production-safe default. */
export function getAccountingWorkspaceModel(): AccountingWorkspaceModel {
  return {
    summary: {
      totalRevenue: 0,
      invoicesRaised: 0,
      outstandingReceivables: 0,
      expectedPayouts: 0,
      gstCollected: 0,
      todaysCollections: 0,
      mtdRevenue: 0,
      ytdRevenue: 0,
    },
    invoices: [],
    payouts: [],
    activity: [],
    insights: [
      {
        id: "acct-ssot-pending",
        tone: "info",
        title: "Accounting SSOT pending",
        message: ACCOUNTING_SSOT_PENDING_MESSAGE,
      },
    ],
  };
}

/** @deprecated CO-ORG-004 — mock ledger removed; use getAccountingWorkspaceModel. */
export const getAccountingMockWorkspaceModel = getAccountingWorkspaceModel;
