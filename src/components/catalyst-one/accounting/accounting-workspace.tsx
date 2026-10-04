"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
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
  getAccountingWorkspaceModel,
  isLegacyAccountingRevenueAnalyticsDeepLink,
  resolveAccountingWorkbenchFromSearchParams,
} from "@/lib/accounting-workspace";
import { ROUTES } from "@/constants/routes";
import {
  enterpriseAccountingCaseClient,
  type EnterpriseAccountingCaseDto,
} from "@/lib/enterprise-accounting-case/client";
import { enterpriseAccountingInvoiceClient } from "@/lib/enterprise-accounting-invoice/client";
import type { EnterpriseAccountingInvoiceDto } from "@/types/enterprise-accounting-invoice";
import type { DerivedAccountingPaymentSummary } from "@/types/enterprise-accounting-payment";
import { isAccountingInvoiceRaiseRole } from "@/constants/enterprise-accounting-invoice";
import { useAuth } from "@/hooks/use-auth";
import { AccountingWorkbenchNav } from "./accounting-workbench-nav";
import { AccountingCasesPanel } from "./accounting-cases-panel";
import {
  AccountingCollectionsWorkbench,
  AccountingDashboardWorkbench,
  AccountingGstTaxWorkbench,
  AccountingInvoiceWorkbench,
  AccountingPayoutWorkbench,
  AccountingReceivablesWorkbench,
} from "./accounting-workbench-views";
import { InvoicePartyMasterWorkbench } from "./invoice-party-master-workbench";
import { ChanakyaFinancialInsights } from "./chanakya-financial-insights";

/** Org-scoped accounting desk entity id for Business Notes (module-level). */
const ACCOUNTING_NOTES_ENTITY_ID = "accounting-workspace";

/**
 * CO-SPRINT-097 / Post-Disbursement Accounting Registry binding.
 * Invoice entity creation remains a later Accounting action — cases only here.
 */
export function AccountingWorkspace() {
  const { user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const seed = useMemo(() => getAccountingWorkspaceModel(), []);
  const [cases, setCases] = useState<EnterpriseAccountingCaseDto[]>([]);
  const [casesLoading, setCasesLoading] = useState(true);
  const [casesError, setCasesError] = useState<string | null>(null);
  const [durableInvoices, setDurableInvoices] = useState<EnterpriseAccountingInvoiceDto[]>([]);
  const [paymentSummary, setPaymentSummary] = useState<DerivedAccountingPaymentSummary | null>(null);
  const [invoicesLoading, setInvoicesLoading] = useState(true);
  const [invoicesError, setInvoicesError] = useState<string | null>(null);

  const workbench = useMemo(
    () => resolveAccountingWorkbenchFromSearchParams(searchParams),
    [searchParams],
  );
  const focusCaseId = searchParams.get("case")?.trim() || null;

  const reloadCases = useCallback(async () => {
    setCasesLoading(true);
    setCasesError(null);
    try {
      const result = await enterpriseAccountingCaseClient.list({ pageSize: 50 });
      setCases(result.items ?? []);
    } catch (err) {
      setCasesError(
        err instanceof Error ? err.message : "Failed to load Accounting Cases",
      );
    } finally {
      setCasesLoading(false);
    }
  }, []);

  const reloadInvoices = useCallback(async () => {
    setInvoicesLoading(true);
    setInvoicesError(null);
    try {
      const result = await enterpriseAccountingInvoiceClient.list();
      setDurableInvoices(result.items);
      setPaymentSummary(result.summary ?? null);
    } catch (err) {
      setInvoicesError(err instanceof Error ? err.message : "Failed to load invoices");
    } finally {
      setInvoicesLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isLegacyAccountingRevenueAnalyticsDeepLink(searchParams)) {
      router.replace(ROUTES.MISSION_CONTROL_REVENUE_ANALYTICS);
    }
  }, [router, searchParams]);

  useEffect(() => {
    void reloadCases();
    void reloadInvoices();
  }, [reloadCases, reloadInvoices]);

  const setWorkbench = useCallback(
    (id: AccountingWorkbenchId) => {
      const next = new URLSearchParams(searchParams.toString());
      next.delete("tab");
      next.delete("action");
      if (id === DEFAULT_ACCOUNTING_WORKBENCH) {
        next.delete("workbench");
      } else {
        next.set(
          "workbench",
          id === "payee_master" ? "invoice_party_master" : id,
        );
      }
      const qs = next.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  const currentInvoiceByCaseId = useMemo(() => {
    const map: Record<string, string> = {};
    for (const inv of durableInvoices) {
      if (inv.documentStatus !== "cancelled") map[inv.accountingCaseId] = inv.invoiceNumber;
    }
    return map;
  }, [durableInvoices]);

  const currentInvoiceIdByCaseId = useMemo(() => {
    const map: Record<string, string> = {};
    for (const inv of durableInvoices) {
      if (inv.documentStatus !== "cancelled") map[inv.accountingCaseId] = inv.id;
    }
    return map;
  }, [durableInvoices]);

  const canRaiseInvoice = isAccountingInvoiceRaiseRole(user?.role);

  const insights = useMemo(() => {
    if (casesLoading) {
      return [
        {
          id: "acct-loading",
          tone: "info" as const,
          title: "Loading Accounting Cases",
          message: "Reading durable Accounting Registry…",
        },
      ];
    }
    if (casesError) {
      return [
        {
          id: "acct-error",
          tone: "attention" as const,
          title: "Accounting Registry unavailable",
          message: casesError,
        },
      ];
    }
    if (cases.length === 0) {
      return [
        {
          id: "acct-empty",
          tone: "info" as const,
          title: "No Accounting Cases yet",
          message:
            "Cases appear after Confirmation Received on Post-Disbursement Confirmation. Invoice raise remains a later action.",
        },
      ];
    }
    return [
      {
        id: "acct-live",
        tone: "positive" as const,
        title: `${cases.length} Accounting Case${cases.length === 1 ? "" : "s"}`,
        message:
          "Durable Deal-linked cases ready for commercial capture. Invoice creation is not automatic.",
      },
    ];
  }, [cases.length, casesError, casesLoading]);

  return (
    <div className="w-full min-w-0">
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
                    Durable Accounting Cases after Confirmation Received · Raise Invoice is an explicit ADMIN action
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
              <div className="space-y-3">
                <AccountingCasesPanel
                  cases={cases}
                  loading={casesLoading}
                  error={casesError}
                  onReload={reloadCases}
                  focusCaseId={focusCaseId}
                  caption="Created only when Confirmation Pending → Confirmation Received. Commercial capture only — this is not an invoice ledger."
                />
                <AccountingDashboardWorkbench
                  summary={{
                    ...seed.summary,
                    invoicesRaised: paymentSummary?.invoicesRaised ?? 0,
                    outstandingReceivables: paymentSummary?.outstanding ?? 0,
                    todaysCollections: paymentSummary?.todaysCollections ?? 0,
                    expectedPayouts: paymentSummary?.totalInvoiced ?? 0,
                    gstCollected: 0,
                  }}
                  paymentSummary={paymentSummary}
                  activity={seed.activity}
                  onOpenInvoices={() => setWorkbench("invoices")}
                  onOpenReceivables={() => setWorkbench("receivables")}
                  onOpenPayouts={() => setWorkbench("payouts")}
                />
              </div>
            ) : null}
            {workbench === "invoices" ? (
              <div className="space-y-3">
                <AccountingCasesPanel
                  cases={cases}
                  loading={casesLoading}
                  error={casesError}
                  onReload={reloadCases}
                  canRaiseInvoice={canRaiseInvoice}
                  currentInvoiceByCaseId={currentInvoiceByCaseId}
                  currentInvoiceIdByCaseId={currentInvoiceIdByCaseId}
                  onInvoiceRaised={reloadInvoices}
                  caption="Cases after Confirmation Received. Raise Invoice is an explicit ADMIN action and does not send the invoice."
                />
                <AccountingInvoiceWorkbench
                  invoices={durableInvoices}
                  loading={invoicesLoading}
                  error={invoicesError}
                  canPostPayment={canRaiseInvoice}
                  onReload={reloadInvoices}
                />
              </div>
            ) : null}
            {workbench === "receivables" ? (
              <div className="space-y-3">
                <AccountingCasesPanel
                  cases={cases}
                  loading={casesLoading}
                  error={casesError}
                  onReload={reloadCases}
                  canRaiseInvoice={canRaiseInvoice}
                  currentInvoiceByCaseId={currentInvoiceByCaseId}
                  currentInvoiceIdByCaseId={currentInvoiceIdByCaseId}
                  onInvoiceRaised={reloadInvoices}
                  caption="Derived outstanding uses Invoice + posted payments + posted credit notes. Case amounts are not a receivable ledger."
                />
                <AccountingReceivablesWorkbench
                  invoices={durableInvoices}
                  loading={invoicesLoading}
                  error={invoicesError}
                />
              </div>
            ) : null}
            {workbench === "payouts" ? (
              <div className="space-y-3">
                <AccountingCasesPanel
                  cases={cases}
                  loading={casesLoading}
                  error={casesError}
                  onReload={reloadCases}
                  caption="Case payoutAmount / expectedCommission are commercial capture only. Payout Workbench is inbound commission receipts — not RM / Wealth Partner payouts, and not a writable payout ledger."
                />
                <AccountingPayoutWorkbench
                  invoices={durableInvoices}
                  loading={invoicesLoading}
                  error={invoicesError}
                  summary={paymentSummary}
                />
              </div>
            ) : null}
            {workbench === "collections" ? (
              <div className="space-y-3">
                <AccountingCasesPanel
                  cases={cases}
                  loading={casesLoading}
                  error={casesError}
                  onReload={reloadCases}
                  caption="Collections are derived from raised invoices, posted payments, and posted credit notes. Accounting Cases do not create payments."
                />
                <AccountingCollectionsWorkbench
                  invoices={durableInvoices}
                  loading={invoicesLoading}
                  error={invoicesError}
                  summary={paymentSummary}
                />
              </div>
            ) : null}
            {workbench === "gst_tax" ? (
              <div className="space-y-3">
                <AccountingCasesPanel
                  cases={cases}
                  loading={casesLoading}
                  error={casesError}
                  onReload={reloadCases}
                  caption="Case tdsAmount is commercial capture. GST collected, GSTR filing, and invoice tax presentation are unbound until an invoice ledger exists."
                />
                <AccountingGstTaxWorkbench summary={seed.summary} />
              </div>
            ) : null}
            {workbench === "invoice_party_master" || workbench === "payee_master" ? (
              <InvoicePartyMasterWorkbench />
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
            <ChanakyaFinancialInsights insights={insights} />
          </aside>
        </div>
      </EnterpriseWorkspaceShell>
    </div>
  );
}
