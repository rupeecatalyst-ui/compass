"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  EnterpriseWorkspaceHeaderBand,
} from "@/components/enterprise/workspace-layout";
import { EnterpriseWorkspaceShell } from "@/components/catalyst-one/shared/enterprise-workspace-shell";
import { WorkspaceExitNav } from "@/components/enterprise/navigation";
import {
  BusinessNotesActionButton,
  EnterpriseBusinessNotesPanel,
} from "@/components/catalyst-one/enterprise-business-notes";
import { buildSimpleWorkspaceBreadcrumbs } from "@/constants/enterprise-exit-navigation";
import {
  DEFAULT_ACCOUNTING_WORKBENCH,
  type AccountingWorkbenchId,
} from "@/constants/accounting-workbench";
import {
  ACCOUNTING_SSOT_PENDING_MESSAGE,
  getAccountingWorkspaceModel,
  type AccountingInvoice,
} from "@/lib/accounting-workspace";
import { AccountingWorkbenchNav } from "./accounting-workbench-nav";
import {
  AccountingCollectionsWorkbench,
  AccountingDashboardWorkbench,
  AccountingGstTaxWorkbench,
  AccountingInvoiceWorkbench,
  AccountingPayoutWorkbench,
  AccountingReceivablesWorkbench,
  AccountingReportsWorkbench,
} from "./accounting-workbench-views";
import { InvoicePartyMasterWorkbench } from "./invoice-party-master-workbench";
import { ChanakyaFinancialInsights } from "./chanakya-financial-insights";
import { InvoiceWorkspaceSheet } from "./invoice-workspace-sheet";

/** Org-scoped accounting desk entity id for Business Notes (module-level). */
const ACCOUNTING_NOTES_ENTITY_ID = "accounting-workspace";

/**
 * CO-SPRINT-097 — Accounting Workspace
 *
 * Catalyst One Workspace Standard:
 *   Workspace (this shell)
 *     → Workbench navigation band
 *       → Workbench content (Invoice Management is one workbench screen, not the module)
 *
 * Pattern peers: Opportunity Workspace tabs, Loan Workspace tabs,
 * Mission Control sections, Admin Console category workspaces.
 */
export function AccountingWorkspace() {
  const seed = useMemo(() => getAccountingWorkspaceModel(), []);
  const [invoices, setInvoices] = useState(seed.invoices);
  const [selected, setSelected] = useState<AccountingInvoice | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [workbench, setWorkbench] = useState<AccountingWorkbenchId>(
    DEFAULT_ACCOUNTING_WORKBENCH,
  );

  const openInvoice = (invoice: AccountingInvoice) => {
    setSelected(invoice);
    setSheetOpen(true);
  };

  const markPaid = (id: string) => {
    setInvoices((prev) =>
      prev.map((inv) =>
        inv.id === id
          ? {
              ...inv,
              paymentStatus: "paid",
              paymentHistory: [
                ...inv.paymentHistory,
                {
                  id: `pay-${Date.now()}`,
                  date: new Date().toISOString().slice(0, 10),
                  amount: inv.invoiceAmount,
                  mode: "Manual",
                },
              ],
              auditTrail: [
                ...inv.auditTrail,
                {
                  id: `aud-${Date.now()}`,
                  at: new Date().toISOString(),
                  actor: "Finance",
                  action: "Marked paid (mock)",
                },
              ],
            }
          : inv,
      ),
    );
    toast.success("Invoice marked paid (mock)");
  };

  const cancelInvoice = (id: string) => {
    setInvoices((prev) =>
      prev.map((inv) =>
        inv.id === id
          ? {
              ...inv,
              invoiceStatus: "cancelled",
              auditTrail: [
                ...inv.auditTrail,
                {
                  id: `aud-${Date.now()}`,
                  at: new Date().toISOString(),
                  actor: "Finance",
                  action: "Invoice cancelled (mock)",
                },
              ],
            }
          : inv,
      ),
    );
    toast.message("Invoice cancelled (mock)");
  };

  return (
    <div className="-mx-4 md:-mx-6 lg:-mx-8">
      <EnterpriseWorkspaceShell
        scrollMode="document"
        className="min-h-[calc(100dvh-5rem)]"
        chrome={
          <>
            <WorkspaceExitNav
              breadcrumbs={buildSimpleWorkspaceBreadcrumbs("Accounting Workspace")}
            />
            <EnterpriseWorkspaceHeaderBand
              identity={
                <div className="min-w-0 space-y-0.5">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-teal-700 dark:text-teal-300">
                    Financial Workspace
                  </p>
                  <h1 className="truncate text-base font-semibold tracking-tight text-foreground sm:text-lg">
                    Accounting Workspace
                  </h1>
                  <p className="text-[11px] text-muted-foreground sm:text-xs">
                    {ACCOUNTING_SSOT_PENDING_MESSAGE}
                  </p>
                </div>
              }
              actions={
                <BusinessNotesActionButton
                  context={{
                    workspaceKind: "accounting",
                    entityKind: "organization",
                    entityId: ACCOUNTING_NOTES_ENTITY_ID,
                  }}
                />
              }
            />
            <div data-layer="workspace_navigation">
              <AccountingWorkbenchNav active={workbench} onChange={setWorkbench} />
            </div>
          </>
        }
        bodyClassName="px-3 pb-4 pt-3 sm:px-4 lg:px-6"
      >
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_17.5rem] xl:grid-cols-[minmax(0,1fr)_18.5rem]">
          <div className="min-w-0" data-accounting-workbench={workbench}>
            {workbench === "dashboard" ? (
              <AccountingDashboardWorkbench
                summary={seed.summary}
                activity={seed.activity}
                payouts={seed.payouts}
                onOpenInvoices={() => setWorkbench("invoices")}
                onOpenReceivables={() => setWorkbench("receivables")}
                onOpenPayouts={() => setWorkbench("payouts")}
              />
            ) : null}
            {workbench === "invoices" ? (
              <AccountingInvoiceWorkbench
                invoices={invoices}
                onOpen={openInvoice}
                onMarkPaid={markPaid}
                onCancel={cancelInvoice}
              />
            ) : null}
            {workbench === "receivables" ? (
              <AccountingReceivablesWorkbench
                summary={seed.summary}
                invoices={invoices}
                onOpenInvoice={openInvoice}
              />
            ) : null}
            {workbench === "payouts" ? (
              <AccountingPayoutWorkbench payouts={seed.payouts} />
            ) : null}
            {workbench === "collections" ? (
              <AccountingCollectionsWorkbench
                summary={seed.summary}
                activity={seed.activity}
              />
            ) : null}
            {workbench === "gst_tax" ? (
              <AccountingGstTaxWorkbench summary={seed.summary} />
            ) : null}
            {workbench === "invoice_party_master" || workbench === "payee_master" ? (
              <InvoicePartyMasterWorkbench />
            ) : null}
            {workbench === "reports" ? (
              <AccountingReportsWorkbench summary={seed.summary} />
            ) : null}
            {workbench === "notes" ? (
              <div className="rounded-xl border border-border bg-card p-4">
                <h2 className="mb-1 text-sm font-semibold text-foreground">
                  Business Notes
                </h2>
                <p className="mb-3 text-xs text-muted-foreground">
                  Official accounting desk notes — Enterprise Activity Registry chronology.
                </p>
                <EnterpriseBusinessNotesPanel
                  context={{
                    workspaceKind: "accounting",
                    entityKind: "organization",
                    entityId: ACCOUNTING_NOTES_ENTITY_ID,
                  }}
                />
              </div>
            ) : null}
          </div>
          <aside className="lg:sticky lg:top-[4.5rem] lg:self-start">
            <ChanakyaFinancialInsights insights={seed.insights} />
          </aside>
        </div>
      </EnterpriseWorkspaceShell>

      <InvoiceWorkspaceSheet
        invoice={selected}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
      />
    </div>
  );
}
