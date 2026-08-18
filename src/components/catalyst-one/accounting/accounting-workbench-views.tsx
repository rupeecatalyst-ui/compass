"use client";

import { useEffect, useState } from "react";
import { formatINRCompact } from "@/lib/format-currency";
import type {
  AccountingFinancialSummary,
  FinancialActivityEvent,
} from "@/lib/accounting-workspace";
import { FinancialActivityTimeline } from "./financial-activity-timeline";
import { FinancialSummary } from "./financial-summary";
import { AccountingInvoiceRegister } from "./accounting-invoice-register";
import { AccountingCollectionsRegister } from "./accounting-collections-register";
import { AccountingInboundReceiptsRegister } from "./accounting-inbound-receipts-register";
import type { EnterpriseAccountingInvoiceDto } from "@/types/enterprise-accounting-invoice";
import type { DerivedAccountingPaymentSummary } from "@/types/enterprise-accounting-payment";
import {
  invoicePartyApiClient,
  type InvoicePartyRecord,
} from "@/lib/invoice-party/invoice-party-api-client";

function WorkbenchHeader({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <header className="mb-2">
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-teal-700 dark:text-teal-300">
        {eyebrow}
      </p>
      <h2 className="mt-0.5 text-sm font-semibold tracking-tight text-foreground">{title}</h2>
      <p className="mt-0.5 text-[11px] text-muted-foreground">{description}</p>
    </header>
  );
}

function CapabilityCard({
  title,
  items,
}: {
  title: string;
  items: string[];
}) {
  return (
    <article className="rounded-lg border border-border/70 bg-card p-3 shadow-sm">
      <h3 className="text-[12px] font-semibold text-foreground">{title}</h3>
      <ul className="mt-2 space-y-1">
        {items.map((item) => (
          <li
            key={item}
            className="flex items-start gap-2 text-[11px] text-muted-foreground"
          >
            <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-teal-600/70" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </article>
  );
}

function MetricTile({ label, value }: { label: string; value: string }) {
  return (
    <article className="rounded-lg border border-border/70 bg-card px-3 py-2.5 shadow-sm">
      <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 text-base font-semibold tabular-nums text-foreground">{value}</p>
    </article>
  );
}

/** Dashboard Workbench — landing view inside Accounting Workspace. */
export function AccountingDashboardWorkbench({
  summary,
  paymentSummary,
  activity,
  onOpenInvoices,
  onOpenReceivables,
  onOpenPayouts,
}: {
  summary: AccountingFinancialSummary;
  paymentSummary: DerivedAccountingPaymentSummary | null;
  activity: FinancialActivityEvent[];
  onOpenInvoices: () => void;
  onOpenReceivables: () => void;
  onOpenPayouts: () => void;
}) {
  const openInboundLines =
    (paymentSummary?.unpaidCount ?? 0) + (paymentSummary?.partiallyPaidCount ?? 0);

  return (
    <div className="space-y-3">
      <WorkbenchHeader
        eyebrow="Dashboard Workbench"
        title="Financial headquarters overview"
        description="Executive KPIs and operational shortcuts into Accounting workbenches."
      />
      <FinancialSummary summary={summary} />
      {paymentSummary ? (
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          <MetricTile label="Total invoiced" value={formatINRCompact(paymentSummary.totalInvoiced)} />
          <MetricTile label="Total received" value={formatINRCompact(paymentSummary.totalReceived)} />
          <MetricTile label="Credit notes" value={formatINRCompact(paymentSummary.creditNotesTotal)} />
          <MetricTile label="Outstanding" value={formatINRCompact(paymentSummary.outstanding)} />
          <MetricTile label="Paid invoices" value={String(paymentSummary.paidCount)} />
          <MetricTile label="Partially paid" value={String(paymentSummary.partiallyPaidCount)} />
          <MetricTile label="Unpaid invoices" value={String(paymentSummary.unpaidCount)} />
        </div>
      ) : null}
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <MetricTile
          label="Outstanding Receivables"
          value={formatINRCompact(summary.outstandingReceivables)}
        />
        <MetricTile
          label="Today's Collections"
          value={formatINRCompact(summary.todaysCollections)}
        />
        <MetricTile
          label="Expected inbound receipts"
          value={formatINRCompact(summary.expectedPayouts)}
        />
        <MetricTile label="Open inbound receipt lines" value={String(openInboundLines)} />
      </div>
      <div className="flex flex-wrap gap-1.5">
        <button
          type="button"
          onClick={onOpenInvoices}
          className="rounded-md border border-border/70 bg-muted/20 px-2.5 py-1 text-[11px] font-medium text-foreground hover:bg-muted/40"
        >
          Open Invoice Workbench →
        </button>
        <button
          type="button"
          onClick={onOpenReceivables}
          className="rounded-md border border-border/70 bg-muted/20 px-2.5 py-1 text-[11px] font-medium text-foreground hover:bg-muted/40"
        >
          Open Receivables Workbench →
        </button>
        <button
          type="button"
          onClick={onOpenPayouts}
          className="rounded-md border border-border/70 bg-muted/20 px-2.5 py-1 text-[11px] font-medium text-foreground hover:bg-muted/40"
        >
          Open Inbound Receipts →
        </button>
      </div>
      <FinancialActivityTimeline events={activity} />
    </div>
  );
}

/** Invoice Workbench — bound to durable EnterpriseAccountingInvoice (Phase 1). */
export function AccountingInvoiceWorkbench({
  invoices,
  loading,
  error,
  canPostPayment,
  onReload,
}: {
  invoices: EnterpriseAccountingInvoiceDto[];
  loading: boolean;
  error: string | null;
  canPostPayment?: boolean;
  onReload?: () => Promise<void> | void;
}) {
  return (
    <div className="space-y-2">
      <WorkbenchHeader
        eyebrow="Invoice Workbench"
        title="Invoice Management"
        description="Durable raised invoices. Post Payment records received money. Issue Credit Note reduces derived outstanding without changing billed invoice values. Mark Paid, Cancel, PDF, and Share are unavailable."
      />
      <AccountingInvoiceRegister
        invoices={invoices}
        loading={loading}
        error={error}
        canPostPayment={canPostPayment}
        onReload={onReload}
      />
    </div>
  );
}

export function AccountingReceivablesWorkbench({
  invoices,
  loading,
  error,
}: {
  invoices: EnterpriseAccountingInvoiceDto[];
  loading: boolean;
  error: string | null;
}) {
  const open = invoices.filter(
    (i) => i.documentStatus !== "cancelled" && i.paymentStatus !== "PAID",
  );
  const partial = open.filter((i) => i.paymentStatus === "PARTIALLY_PAID");
  const outstanding = open.reduce((sum, i) => sum + i.outstanding, 0);

  return (
    <div className="space-y-3">
      <WorkbenchHeader
        eyebrow="Receivables Workbench"
        title="Derived outstanding receivables"
        description="Outstanding is Invoice net receivable minus posted payments minus posted credit notes. Ageing is not implemented."
      />
      <div className="grid gap-2 sm:grid-cols-3">
        <MetricTile label="Outstanding Receivables" value={formatINRCompact(outstanding)} />
        <MetricTile label="Open invoices" value={String(open.length)} />
        <MetricTile label="Partial Payments" value={String(partial.length)} />
      </div>
      <AccountingCollectionsRegister invoices={invoices} loading={loading} error={error} />
    </div>
  );
}

export function AccountingPayoutWorkbench({
  invoices,
  loading,
  error,
  summary,
}: {
  invoices: EnterpriseAccountingInvoiceDto[];
  loading: boolean;
  error: string | null;
  summary: DerivedAccountingPaymentSummary | null;
}) {
  return (
    <div className="space-y-3">
      <WorkbenchHeader
        eyebrow="Payout Workbench"
        title="Inbound Commission Receipts"
        description="This is inbound commission receipt tracking from the invoice party / commission payer. It is not RM / Wealth Partner payouts, and it cannot create payout amounts."
      />
      <div className="grid gap-2 sm:grid-cols-3">
        <MetricTile label="Expected" value={formatINRCompact(summary?.totalInvoiced ?? 0)} />
        <MetricTile label="Received" value={formatINRCompact(summary?.totalReceived ?? 0)} />
        <MetricTile label="Pending" value={formatINRCompact(summary?.outstanding ?? 0)} />
      </div>
      <AccountingInboundReceiptsRegister invoices={invoices} loading={loading} error={error} />
    </div>
  );
}

export function AccountingCollectionsWorkbench({
  invoices,
  loading,
  error,
  summary,
}: {
  invoices: EnterpriseAccountingInvoiceDto[];
  loading: boolean;
  error: string | null;
  summary: DerivedAccountingPaymentSummary | null;
}) {
  return (
    <div className="space-y-3">
      <WorkbenchHeader
        eyebrow="Collections Workbench"
        title="Invoice collections"
        description="Invoice + posted payments + posted credit notes. Outstanding is derived. Ageing, reminders, and recovery workflows are not implemented."
      />
      <div className="grid gap-2 sm:grid-cols-2">
        <MetricTile
          label="Today's Collections"
          value={formatINRCompact(summary?.todaysCollections ?? 0)}
        />
        <MetricTile
          label="Outstanding Receivables"
          value={formatINRCompact(summary?.outstanding ?? 0)}
        />
      </div>
      <AccountingCollectionsRegister invoices={invoices} loading={loading} error={error} />
    </div>
  );
}

export function AccountingGstTaxWorkbench({
  summary,
}: {
  summary: AccountingFinancialSummary;
}) {
  const [parties, setParties] = useState<InvoicePartyRecord[]>([]);
  const [partiesError, setPartiesError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void invoicePartyApiClient
      .list()
      .then((items) => {
        if (!cancelled) {
          setParties(items);
          setPartiesError(null);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setParties([]);
          setPartiesError(
            err instanceof Error ? err.message : "Failed to load Invoice Party tax attributes",
          );
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="space-y-3">
      <WorkbenchHeader
        eyebrow="GST & Tax Workbench"
        title="Tax operations desk"
        description="Invoice Party GSTIN / TDS attributes are live. GST collected, GSTR filing, and invoice tax presentation remain unbound."
      />
      <div className="grid gap-2 sm:grid-cols-2">
        <MetricTile
          label="GST Collected"
          value={formatINRCompact(summary.gstCollected)}
        />
        <MetricTile
          label="MTD Revenue (taxable base proxy)"
          value={formatINRCompact(summary.mtdRevenue)}
        />
      </div>
      <section className="rounded-xl border border-border/70 bg-card p-3 shadow-sm">
        <h3 className="text-[12px] font-semibold text-foreground">
          Invoice Party tax attributes
        </h3>
        <p className="mt-0.5 text-[11px] text-muted-foreground">
          GSTIN, GST status, and TDS flags from Accounting Invoice Party Master. Not GST collected from invoices.
        </p>
        {partiesError ? (
          <p className="mt-3 text-[11px] text-destructive">{partiesError}</p>
        ) : parties.length === 0 ? (
          <p className="mt-3 text-[11px] text-muted-foreground">
            No Invoice Parties yet. Tax attributes appear after Invoice Party Master create.
          </p>
        ) : (
          <div className="mt-2 overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-xs">
              <thead className="text-[10px] uppercase text-muted-foreground">
                <tr>
                  <th className="py-1.5 pr-2">Invoice Party</th>
                  <th className="py-1.5 pr-2">GSTIN</th>
                  <th className="py-1.5 pr-2">GST status</th>
                  <th className="py-1.5 pr-2">TDS</th>
                  <th className="py-1.5">Status</th>
                </tr>
              </thead>
              <tbody>
                {parties.map((party) => (
                  <tr key={party.id} className="border-t border-border/50">
                    <td className="py-2 pr-2 font-medium">{party.displayName}</td>
                    <td className="py-2 pr-2">{party.gstin || "—"}</td>
                    <td className="py-2 pr-2 capitalize">{party.gstStatus || "unknown"}</td>
                    <td className="py-2 pr-2">
                      {party.tdsApplicable
                        ? `Yes${party.tdsRatePercent != null ? ` · ${party.tdsRatePercent}%` : ""}`
                        : "No"}
                    </td>
                    <td className="py-2">{party.enabled ? "Active" : "Inactive"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <CapabilityCard
          title="GST Summary"
          items={["Output GST", "Input credit (future)", "Net payable"]}
        />
        <CapabilityCard
          title="GSTR Reports"
          items={["GSTR-1", "GSTR-3B", "Period selection"]}
        />
        <CapabilityCard
          title="TDS"
          items={["TDS receivable", "Certificates", "Reconciliation"]}
        />
        <CapabilityCard
          title="Tax Exports"
          items={["CSV / Excel export", "Period pack", "Audit bundle"]}
        />
      </div>
    </div>
  );
}

export function AccountingReportsWorkbench({
  summary,
}: {
  summary: AccountingFinancialSummary;
}) {
  return (
    <div className="space-y-3">
      <WorkbenchHeader
        eyebrow="Reports Workbench"
        title="Financial MIS & analytics"
        description="Revenue, profitability, and dimensional performance"
      />
      <div className="grid gap-2 sm:grid-cols-3">
        <MetricTile label="MTD Revenue" value={formatINRCompact(summary.mtdRevenue)} />
        <MetricTile label="YTD Revenue" value={formatINRCompact(summary.ytdRevenue)} />
        <MetricTile
          label="Total Revenue"
          value={formatINRCompact(summary.totalRevenue)}
        />
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <CapabilityCard
          title="Revenue Reports"
          items={["Daily collections", "Invoice register", "Cash vs accrued"]}
        />
        <CapabilityCard
          title="Profitability"
          items={["Gross margin proxy", "Cost of acquisition (future)", "Contribution"]}
        />
        <CapabilityCard
          title="Product-wise Revenue"
          items={["Home Loan", "LAP", "Business Loan", "Other products"]}
        />
        <CapabilityCard
          title="Lender-wise Revenue"
          items={["Bank book", "NBFC book", "Co-lending (future)"]}
        />
        <CapabilityCard
          title="Partner-wise Revenue"
          items={["Partner contribution", "Channel mix", "Incentive impact"]}
        />
        <CapabilityCard
          title="Monthly MIS"
          items={["Board pack", "Ops MIS", "Exception appendix"]}
        />
      </div>
    </div>
  );
}
