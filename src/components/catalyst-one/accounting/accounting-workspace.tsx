"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
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
  getAccountingWorkspaceModel,
  resolveAccountingWorkbenchFromSearchParams,
  type AccountingInvoice,
} from "@/lib/accounting-workspace";
import {
  enterpriseAccountingCaseClient,
  type EnterpriseAccountingCaseDto,
} from "@/lib/enterprise-accounting-case/client";
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
import { formatINR } from "@/lib/format-currency";
import { ROUTES } from "@/constants/routes";

/** Org-scoped accounting desk entity id for Business Notes (module-level). */
const ACCOUNTING_NOTES_ENTITY_ID = "accounting-workspace";

/**
 * CO-SPRINT-097 / Post-Disbursement Accounting Registry binding.
 * Invoice entity creation remains a later Accounting action — cases only here.
 */
export function AccountingWorkspace() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const seed = useMemo(() => getAccountingWorkspaceModel(), []);
  const [cases, setCases] = useState<EnterpriseAccountingCaseDto[]>([]);
  const [casesLoading, setCasesLoading] = useState(true);
  const [casesError, setCasesError] = useState<string | null>(null);
  const invoices = seed.invoices;
  const [selected, setSelected] = useState<AccountingInvoice | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  const workbench = useMemo(
    () => resolveAccountingWorkbenchFromSearchParams(searchParams),
    [searchParams],
  );

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

  useEffect(() => {
    void reloadCases();
  }, [reloadCases]);

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

  const openInvoice = (invoice: AccountingInvoice) => {
    setSelected(invoice);
    setSheetOpen(true);
  };

  const markPaid = () => {
    toast.message("Invoice payment requires the later Accounting invoice workflow.");
  };

  const cancelInvoice = () => {
    toast.message("Invoice cancellation requires the later Accounting invoice workflow.");
  };

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
                    Durable Accounting Cases after Confirmation Received · Invoice raise is a separate later action
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
                <section className="rounded-xl border border-border/70 bg-card p-3 shadow-sm">
                  <h2 className="text-sm font-semibold text-foreground">
                    Accounting Cases
                  </h2>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    Created only when Confirmation Pending → Confirmation Received.
                  </p>
                  {casesLoading ? (
                    <p className="mt-3 text-[11px] text-muted-foreground">Loading…</p>
                  ) : casesError ? (
                    <p className="mt-3 text-[11px] text-destructive">{casesError}</p>
                  ) : cases.length === 0 ? (
                    <p className="mt-3 text-[11px] text-muted-foreground">
                      No durable Accounting Cases yet.
                    </p>
                  ) : (
                    <ul className="mt-2 divide-y divide-border/50">
                      {cases.map((item) => {
                        const dealId = String(item.dealId ?? "");
                        const status = String(item.status ?? "open");
                        const amount =
                          typeof item.confirmedInvoiceAmount === "number"
                            ? item.confirmedInvoiceAmount
                            : typeof item.disbursedAmount === "number"
                              ? item.disbursedAmount
                              : typeof item.finalAmount === "number"
                                ? item.finalAmount
                                : null;
                        return (
                          <li
                            key={item.id}
                            className="flex items-center justify-between gap-3 py-2"
                          >
                            <div className="min-w-0">
                              <p className="truncate text-[12px] font-medium text-foreground">
                                Case {item.id.slice(0, 10)}… · {status}
                              </p>
                              <p className="text-[10px] text-muted-foreground">
                                Deal {dealId.slice(0, 12)}
                                {amount != null ? ` · ${formatINR(amount)}` : ""}
                              </p>
                            </div>
                            {dealId ? (
                              <Link
                                href={`${ROUTES.DEALS}/${encodeURIComponent(dealId)}`}
                                className="shrink-0 text-[11px] font-medium text-teal-700 hover:underline dark:text-teal-300"
                              >
                                Open Deal →
                              </Link>
                            ) : null}
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </section>
                <AccountingDashboardWorkbench
                  summary={{
                    ...seed.summary,
                    invoicesRaised: 0,
                    expectedPayouts: cases.reduce((sum, c) => {
                      const v =
                        typeof c.payoutAmount === "number"
                          ? c.payoutAmount
                          : typeof c.expectedCommission === "number"
                            ? c.expectedCommission
                            : 0;
                      return sum + v;
                    }, 0),
                  }}
                  activity={seed.activity}
                  payouts={seed.payouts}
                  onOpenInvoices={() => setWorkbench("invoices")}
                  onOpenReceivables={() => setWorkbench("receivables")}
                  onOpenPayouts={() => setWorkbench("payouts")}
                />
              </div>
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
            <ChanakyaFinancialInsights insights={insights} />
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
