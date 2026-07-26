"use client";

import { useMemo, useState } from "react";
import { formatINR, formatINRCompact } from "@/lib/format-currency";
import { cn } from "@/lib/utils";
import {
  INVOICE_WORKBENCH_LANES,
  type InvoiceWorkbenchLane,
} from "@/constants/accounting-workbench";
import type {
  AccountingFinancialSummary,
  AccountingInvoice,
  AccountingPayout,
  FinancialActivityEvent,
} from "@/lib/accounting-workspace";
import { FinancialActivityTimeline } from "./financial-activity-timeline";
import { FinancialSummary } from "./financial-summary";
import { InvoiceManagementGrid } from "./invoice-management-grid";
import { PayoutManagement } from "./payout-management";

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

function filterInvoicesByLane(
  invoices: AccountingInvoice[],
  lane: InvoiceWorkbenchLane,
): AccountingInvoice[] {
  switch (lane) {
    case "draft":
      return invoices.filter((i) => i.invoiceStatus === "draft");
    case "generated":
      return invoices.filter((i) => i.invoiceStatus === "raised");
    case "sent":
      return invoices.filter((i) => i.invoiceStatus === "shared");
    case "paid":
      return invoices.filter((i) => i.paymentStatus === "paid");
    case "cancelled":
      return invoices.filter((i) => i.invoiceStatus === "cancelled");
    case "credit_notes":
      return invoices.filter(
        (i) =>
          i.auditTrail.some((a) => /credit note/i.test(a.action)) ||
          i.notes?.toLowerCase().includes("credit note"),
      );
    default:
      return invoices;
  }
}

/** Dashboard Workbench — landing view inside Accounting Workspace. */
export function AccountingDashboardWorkbench({
  summary,
  activity,
  payouts,
  onOpenInvoices,
  onOpenReceivables,
  onOpenPayouts,
}: {
  summary: AccountingFinancialSummary;
  activity: FinancialActivityEvent[];
  payouts: AccountingPayout[];
  onOpenInvoices: () => void;
  onOpenReceivables: () => void;
  onOpenPayouts: () => void;
}) {
  const pendingPayouts = payouts.filter(
    (p) => p.status === "pending" || p.status === "expected" || p.status === "overdue",
  ).length;

  return (
    <div className="space-y-3">
      <WorkbenchHeader
        eyebrow="Dashboard Workbench"
        title="Financial headquarters overview"
        description="Executive KPIs and operational shortcuts into Accounting workbenches."
      />
      <FinancialSummary summary={summary} />
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
          label="Expected Payouts"
          value={formatINRCompact(summary.expectedPayouts)}
        />
        <MetricTile label="Open Payout Lines" value={String(pendingPayouts)} />
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
          Open Payout Workbench →
        </button>
      </div>
      <div className="grid gap-3 xl:grid-cols-2">
        <PayoutManagement payouts={payouts} />
        <FinancialActivityTimeline events={activity} />
      </div>
    </div>
  );
}

/** Invoice Workbench — Invoice Management screen lives here (not the module identity). */
export function AccountingInvoiceWorkbench({
  invoices,
  onOpen,
  onMarkPaid,
  onCancel,
}: {
  invoices: AccountingInvoice[];
  onOpen: (invoice: AccountingInvoice) => void;
  onMarkPaid: (id: string) => void;
  onCancel: (id: string) => void;
}) {
  const [lane, setLane] = useState<InvoiceWorkbenchLane>("all");
  const laneInvoices = useMemo(
    () => filterInvoicesByLane(invoices, lane),
    [invoices, lane],
  );

  return (
    <div className="space-y-2">
      <WorkbenchHeader
        eyebrow="Invoice Workbench"
        title="Invoice Management"
        description="Operational invoice screen inside Accounting Workspace — Draft · Generated · Sent · Paid · Cancelled · Credit Notes"
      />
      <div
        className="flex gap-1 overflow-x-auto rounded-lg border border-border/60 bg-muted/15 p-1"
        role="tablist"
        aria-label="Invoice lanes"
      >
        {INVOICE_WORKBENCH_LANES.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={lane === item.id}
            onClick={() => setLane(item.id)}
            className={cn(
              "shrink-0 rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors",
              lane === item.id
                ? "bg-teal-600 text-white shadow-sm"
                : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
            )}
          >
            {item.label}
          </button>
        ))}
      </div>
      <InvoiceManagementGrid
        invoices={laneInvoices}
        onOpen={onOpen}
        onMarkPaid={onMarkPaid}
        onCancel={onCancel}
      />
    </div>
  );
}

export function AccountingReceivablesWorkbench({
  summary,
  invoices,
  onOpenInvoice,
}: {
  summary: AccountingFinancialSummary;
  invoices: AccountingInvoice[];
  onOpenInvoice: (invoice: AccountingInvoice) => void;
}) {
  const outstanding = invoices.filter(
    (i) =>
      i.invoiceStatus !== "cancelled" &&
      (i.paymentStatus === "unpaid" ||
        i.paymentStatus === "partial" ||
        i.paymentStatus === "overdue"),
  );
  const overdue = outstanding.filter((i) => i.paymentStatus === "overdue");
  const partial = outstanding.filter((i) => i.paymentStatus === "partial");

  return (
    <div className="space-y-3">
      <WorkbenchHeader
        eyebrow="Receivables Workbench"
        title="Outstanding receivables & follow-up"
        description="Ageing, follow-up queue, and payment commitments"
      />
      <div className="grid gap-2 sm:grid-cols-3">
        <MetricTile
          label="Outstanding Receivables"
          value={formatINRCompact(summary.outstandingReceivables)}
        />
        <MetricTile label="Overdue Invoices" value={String(overdue.length)} />
        <MetricTile label="Partial Payments" value={String(partial.length)} />
      </div>
      <div className="grid gap-3 lg:grid-cols-2">
        <CapabilityCard
          title="Ageing Analysis"
          items={[
            "0–30 days",
            "31–60 days",
            "61–90 days",
            "90+ days (escalation)",
          ]}
        />
        <CapabilityCard
          title="Payment Commitments"
          items={[
            "Promised payment dates",
            "Commitment owner",
            "Breach alerts",
            "CHANAKYA follow-up prompts",
          ]}
        />
      </div>
      <section className="rounded-xl border border-border/70 bg-card p-3 shadow-sm">
        <h3 className="text-[12px] font-semibold text-foreground">Follow-up Queue</h3>
        <p className="mt-0.5 text-[11px] text-muted-foreground">
          Open receivables requiring collection attention
        </p>
        <ul className="mt-2 divide-y divide-border/50">
          {outstanding.length === 0 ? (
            <li className="py-4 text-center text-[11px] text-muted-foreground">
              No outstanding receivables in the current book.
            </li>
          ) : (
            outstanding.map((inv) => (
              <li key={inv.id}>
                <button
                  type="button"
                  onClick={() => onOpenInvoice(inv)}
                  className="flex w-full items-center justify-between gap-3 px-1 py-2 text-left hover:bg-muted/20"
                >
                  <div className="min-w-0">
                    <p className="truncate text-[12px] font-medium text-foreground">
                      {inv.invoiceNumber} · {inv.customer}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      {inv.lender} · {inv.paymentStatus}
                    </p>
                  </div>
                  <span className="shrink-0 text-[12px] font-semibold tabular-nums text-foreground">
                    {formatINR(inv.invoiceAmount)}
                  </span>
                </button>
              </li>
            ))
          )}
        </ul>
      </section>
    </div>
  );
}

export function AccountingPayoutWorkbench({
  payouts,
}: {
  payouts: AccountingPayout[];
}) {
  const expected = payouts.filter((p) => p.status === "expected" || p.status === "pending");
  const received = payouts.filter((p) => p.status === "received");
  const overdue = payouts.filter((p) => p.status === "overdue");

  return (
    <div className="space-y-3">
      <WorkbenchHeader
        eyebrow="Payout Workbench"
        title="Lender payout operations"
        description="Expected · received · pending claims · commission reconciliation"
      />
      <div className="grid gap-2 sm:grid-cols-3">
        <MetricTile label="Expected / Pending Lines" value={String(expected.length)} />
        <MetricTile label="Received Lines" value={String(received.length)} />
        <MetricTile label="Overdue Lines" value={String(overdue.length)} />
      </div>
      <div className="grid gap-3 lg:grid-cols-2">
        <CapabilityCard
          title="Pending Claims"
          items={[
            "Claims awaiting lender confirmation",
            "Supporting document checklist",
            "Escalation after SLA breach",
          ]}
        />
        <CapabilityCard
          title="Commission Reconciliation"
          items={[
            "Expected vs received variance",
            "Product-wise commission match",
            "Period close reconciliation",
          ]}
        />
      </div>
      <PayoutManagement payouts={payouts} />
    </div>
  );
}

export function AccountingCollectionsWorkbench({
  summary,
  activity,
}: {
  summary: AccountingFinancialSummary;
  activity: FinancialActivityEvent[];
}) {
  const collectionEvents = activity.filter(
    (e) => e.kind === "payment_received" || e.kind === "invoice_shared",
  );

  return (
    <div className="space-y-3">
      <WorkbenchHeader
        eyebrow="Collections Workbench"
        title="Collection calendar & recovery"
        description="Follow-up activities, recovery status, and reminder queue"
      />
      <div className="grid gap-2 sm:grid-cols-2">
        <MetricTile
          label="Today's Collections"
          value={formatINRCompact(summary.todaysCollections)}
        />
        <MetricTile
          label="Outstanding Receivables"
          value={formatINRCompact(summary.outstandingReceivables)}
        />
      </div>
      <div className="grid gap-3 lg:grid-cols-2">
        <CapabilityCard
          title="Collection Calendar"
          items={[
            "Scheduled follow-ups",
            "Promised payment dates",
            "RM ownership",
          ]}
        />
        <CapabilityCard
          title="Reminder Queue"
          items={[
            "Automated payment reminders",
            "Escalation reminders",
            "Outbox-ready communications",
          ]}
        />
        <CapabilityCard
          title="Recovery Status"
          items={[
            "Soft recovery",
            "Formal notice",
            "Legal referral (policy-gated)",
          ]}
        />
        <CapabilityCard
          title="Follow-up Activities"
          items={
            collectionEvents.length > 0
              ? collectionEvents.slice(0, 4).map((e) => e.detail)
              : ["No recent collection activities in mock book"]
          }
        />
      </div>
      <FinancialActivityTimeline events={activity} />
    </div>
  );
}

export function AccountingGstTaxWorkbench({
  summary,
}: {
  summary: AccountingFinancialSummary;
}) {
  return (
    <div className="space-y-3">
      <WorkbenchHeader
        eyebrow="GST & Tax Workbench"
        title="Tax operations desk"
        description="GST summary, GSTR reports, TDS, and tax exports"
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
