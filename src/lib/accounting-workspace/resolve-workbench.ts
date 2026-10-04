/**
 * CO-C1-ACCOUNTING-ACTIVATION-001 — Resolve Accounting workbench from URL.
 * Activation only: honor existing dashboard deep-links; no new business rules.
 */

import {
  DEFAULT_ACCOUNTING_WORKBENCH,
  type AccountingWorkbenchId,
} from "@/constants/accounting-workbench";
import { ROUTES } from "@/constants/routes";

const WORKBENCH_IDS = new Set<AccountingWorkbenchId>([
  "dashboard",
  "invoices",
  "receivables",
  "payouts",
  "collections",
  "gst_tax",
  "invoice_party_master",
  "payee_master",
  "notes",
]);

/** Legacy dashboard / EI aliases → workbench id. Revenue analytics moved to Mission Control. */
const TAB_ALIASES: Record<string, AccountingWorkbenchId> = {
  invoice: "invoices",
  invoices: "invoices",
  receivable: "receivables",
  receivables: "receivables",
  payout: "payouts",
  payouts: "payouts",
  collection: "collections",
  collections: "collections",
  gst: "gst_tax",
  tax: "gst_tax",
  gst_tax: "gst_tax",
  tds: "gst_tax",
  party: "invoice_party_master",
  payee: "invoice_party_master",
  invoice_party: "invoice_party_master",
  invoice_party_master: "invoice_party_master",
  payee_master: "invoice_party_master",
  notes: "notes",
  dashboard: "dashboard",
};

const ACTION_ALIASES: Record<string, AccountingWorkbenchId> = {
  invoice: "invoices",
  create_invoice: "invoices",
  "create-invoice": "invoices",
};

function normalizeWorkbench(raw: string | null | undefined): AccountingWorkbenchId | null {
  if (!raw) return null;
  const key = raw.trim().toLowerCase().replace(/-/g, "_");
  if (WORKBENCH_IDS.has(key as AccountingWorkbenchId)) {
    return key === "payee_master" ? "invoice_party_master" : (key as AccountingWorkbenchId);
  }
  return TAB_ALIASES[key] ?? null;
}

/**
 * Resolve initial / deep-linked workbench from URL search params.
 * Precedence: workbench → tab → action → default.
 */
export function resolveAccountingWorkbenchFromSearchParams(
  params: URLSearchParams | { get: (name: string) => string | null },
): AccountingWorkbenchId {
  const fromWorkbench = normalizeWorkbench(params.get("workbench"));
  if (fromWorkbench) return fromWorkbench;

  const fromTab = normalizeWorkbench(params.get("tab"));
  if (fromTab) return fromTab;

  const action = params.get("action")?.trim().toLowerCase() ?? "";
  if (action && ACTION_ALIASES[action]) return ACTION_ALIASES[action];

  return DEFAULT_ACCOUNTING_WORKBENCH;
}

/** Legacy revenue analytics deep-links → Mission Control Revenue Analytics. */
export function isLegacyAccountingRevenueAnalyticsDeepLink(
  params: URLSearchParams | { get: (name: string) => string | null },
): boolean {
  const tab = params.get("tab")?.trim().toLowerCase() ?? "";
  const wb = params.get("workbench")?.trim().toLowerCase() ?? "";
  return (
    tab === "revenue" ||
    tab === "reports" ||
    tab === "profitability" ||
    wb === "reports"
  );
}

/** Canonical certification / deep-link href for a workbench. */
export function buildAccountingWorkbenchHref(
  workbench: AccountingWorkbenchId = DEFAULT_ACCOUNTING_WORKBENCH,
): string {
  const id = workbench === "payee_master" ? "invoice_party_master" : workbench;
  if (id === DEFAULT_ACCOUNTING_WORKBENCH) return ROUTES.ACCOUNTING;
  return `${ROUTES.ACCOUNTING}?workbench=${encodeURIComponent(id)}`;
}

/** Navigation-only deep-link to an existing Accounting Case (no Accounting engine change). */
export function buildAccountingCaseHref(caseId: string): string {
  const id = caseId.trim();
  if (!id) return ROUTES.ACCOUNTING;
  return `${ROUTES.ACCOUNTING}?case=${encodeURIComponent(id)}`;
}
