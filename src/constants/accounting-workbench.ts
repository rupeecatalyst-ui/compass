/**
 * CO-SPRINT-097 — Accounting Workspace workbench navigation (architecture SSOT).
 *
 * Catalyst One Workspace Standard:
 *   Accounting Workspace (module)
 *     → Workbenches (operational surfaces)
 *       → Screens / lanes (e.g. Invoice Management inside Invoice Workbench)
 *
 * Invoice Management must never be the identity of the Accounting module.
 */

export type AccountingWorkbenchId =
  | "dashboard"
  | "invoices"
  | "receivables"
  | "payouts"
  | "collections"
  | "gst_tax"
  | "invoice_party_master"
  | "payee_master"
  | "notes";

export interface AccountingWorkbenchDef {
  id: AccountingWorkbenchId;
  /** Short label for the workbench navigation band. */
  label: string;
  description: string;
}

export const ACCOUNTING_WORKBENCHES: readonly AccountingWorkbenchDef[] = [
  {
    id: "dashboard",
    label: "Dashboard",
    description: "Executive financial KPIs and activity overview",
  },
  {
    id: "invoices",
    label: "Invoices",
    description: "Invoice Workbench — draft, generated, sent, paid, cancelled, credit notes",
  },
  {
    id: "receivables",
    label: "Receivables",
    description: "Receivables Workbench — outstanding, ageing, follow-ups, commitments",
  },
  {
    id: "payouts",
    label: "Payouts",
    description: "Inbound Commission Receipts — expected, received, pending (not RM / Wealth Partner payouts)",
  },
  {
    id: "collections",
    label: "Collections",
    description: "Collections Workbench — calendar, recovery, reminder queue",
  },
  {
    id: "gst_tax",
    label: "GST & Tax",
    description: "GST & Tax Workbench — GST summary, GSTR, TDS, tax exports",
  },
  {
    id: "invoice_party_master",
    label: "Invoice Party Master",
    description:
      "Accounting Invoice Party Master — curated commission invoice parties linked to Contact/Company Registry",
  },
  {
    id: "notes",
    label: "Notes",
    description: "Enterprise Business Notes for Accounting Workspace",
  },
] as const;

export const DEFAULT_ACCOUNTING_WORKBENCH: AccountingWorkbenchId = "dashboard";

/** Invoice Workbench lane filters — maps onto existing invoice/payment statuses. */
export type InvoiceWorkbenchLane =
  | "all"
  | "draft"
  | "generated"
  | "sent"
  | "paid"
  | "cancelled"
  | "credit_notes";

export const INVOICE_WORKBENCH_LANES: readonly {
  id: InvoiceWorkbenchLane;
  label: string;
}[] = [
  { id: "all", label: "All" },
  { id: "draft", label: "Draft Invoices" },
  { id: "generated", label: "Generated Invoices" },
  { id: "sent", label: "Sent" },
  { id: "paid", label: "Paid" },
  { id: "cancelled", label: "Cancelled" },
  { id: "credit_notes", label: "Credit Notes" },
] as const;
