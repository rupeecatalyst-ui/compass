/**
 * CO-REFINEMENT-005 — Derive Revenue Analytics from canonical Accounting + EBI SSOT.
 * Never invents revenue figures.
 */

import { formatINRCompact } from "@/lib/format-currency";
import type { EnterpriseAccountingCaseDto } from "@/lib/enterprise-accounting-case/client";
import type { EnterpriseAccountingInvoiceDto } from "@/types/enterprise-accounting-invoice";
import type { DerivedAccountingPaymentSummary } from "@/types/enterprise-accounting-payment";
import type { EbiSnapshot } from "@/types/enterprise-business-intelligence";
import type {
  RevenueAnalyticsKpi,
  RevenueAnalyticsModel,
  RevenueNamedAmount,
  RevenuePeriodPoint,
  RevenueWaterfallStep,
} from "@/types/revenue-analytics";

const POSTED = "POSTED";

function monthKey(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "Unknown";
  return d.toLocaleDateString("en-IN", { month: "short", year: "2-digit" });
}

function inMonth(iso: string, ref: Date): boolean {
  const d = new Date(iso);
  return (
    !Number.isNaN(d.getTime()) &&
    d.getFullYear() === ref.getFullYear() &&
    d.getMonth() === ref.getMonth()
  );
}

function inYear(iso: string, ref: Date): boolean {
  const d = new Date(iso);
  return !Number.isNaN(d.getTime()) && d.getFullYear() === ref.getFullYear();
}

function sumPostedPaymentsInRange(
  invoices: EnterpriseAccountingInvoiceDto[],
  predicate: (isoDate: string) => boolean,
): number {
  let total = 0;
  for (const inv of invoices) {
    if (inv.documentStatus === "cancelled") continue;
    for (const p of inv.payments) {
      if (p.status?.toUpperCase() === POSTED && predicate(p.paymentDate)) {
        total += p.amount;
      }
    }
  }
  return total;
}

function sumInvoicedInRange(
  invoices: EnterpriseAccountingInvoiceDto[],
  predicate: (isoDate: string) => boolean,
): number {
  let total = 0;
  for (const inv of invoices) {
    if (inv.documentStatus === "cancelled") continue;
    if (predicate(inv.invoiceDate)) total += inv.netReceivable;
  }
  return total;
}

function buildPeriodTrend(
  invoices: EnterpriseAccountingInvoiceDto[],
  months = 6,
): RevenuePeriodPoint[] {
  const now = new Date();
  const buckets = new Map<string, RevenuePeriodPoint>();
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = monthKey(d.toISOString());
    buckets.set(key, { period: key, invoiced: 0, received: 0 });
  }
  for (const inv of invoices) {
    if (inv.documentStatus === "cancelled") continue;
    const invKey = monthKey(inv.invoiceDate);
    if (buckets.has(invKey)) {
      buckets.get(invKey)!.invoiced += inv.netReceivable;
    }
    for (const p of inv.payments) {
      if (p.status?.toUpperCase() !== POSTED) continue;
      const payKey = monthKey(p.paymentDate);
      if (buckets.has(payKey)) {
        buckets.get(payKey)!.received += p.amount;
      }
    }
  }
  return [...buckets.values()];
}

function groupByProduct(
  invoices: EnterpriseAccountingInvoiceDto[],
  ebi: EbiSnapshot | null,
): RevenueNamedAmount[] {
  const map = new Map<string, RevenueNamedAmount>();
  for (const inv of invoices) {
    if (inv.documentStatus === "cancelled") continue;
    const name = inv.productLabel?.trim() || inv.productCode?.trim() || "Unspecified Product";
    const row = map.get(name) ?? { name, invoiced: 0, received: 0, expected: 0 };
    row.invoiced += inv.netReceivable;
    row.received += inv.amountReceived;
    map.set(name, row);
  }
  for (const p of ebi?.executive.dealsByProduct ?? []) {
    const name = p.name?.trim() || "Unspecified Product";
    const row = map.get(name) ?? { name, invoiced: 0, received: 0, expected: 0 };
    row.expected += p.value ?? 0;
    map.set(name, row);
  }
  return [...map.values()]
    .filter((r) => r.invoiced > 0 || r.received > 0 || r.expected > 0)
    .sort((a, b) => b.invoiced + b.expected - (a.invoiced + a.expected));
}

function groupByLenderParty(
  invoices: EnterpriseAccountingInvoiceDto[],
): Array<{ name: string; invoiced: number; received: number }> {
  const map = new Map<string, { name: string; invoiced: number; received: number }>();
  for (const inv of invoices) {
    if (inv.documentStatus === "cancelled") continue;
    const name = inv.partyDisplayName?.trim() || inv.partyBillingName?.trim() || "Unspecified Party";
    const row = map.get(name) ?? { name, invoiced: 0, received: 0 };
    row.invoiced += inv.netReceivable;
    row.received += inv.amountReceived;
    map.set(name, row);
  }
  return [...map.values()].sort((a, b) => b.invoiced - a.invoiced);
}

export function deriveRevenueAnalytics(input: {
  invoices: EnterpriseAccountingInvoiceDto[];
  summary: DerivedAccountingPaymentSummary | null;
  ebi: EbiSnapshot | null;
  cases?: EnterpriseAccountingCaseDto[];
  asOf?: string;
}): RevenueAnalyticsModel {
  const now = new Date();
  const asOf = input.asOf ?? now.toISOString();
  const { invoices, summary, ebi } = input;
  const activeInvoices = invoices.filter((i) => i.documentStatus !== "cancelled");

  const mtdReceived = sumPostedPaymentsInRange(activeInvoices, (d) => inMonth(d, now));
  const ytdReceived = sumPostedPaymentsInRange(activeInvoices, (d) => inYear(d, now));
  const mtdInvoiced = sumInvoicedInRange(activeInvoices, (d) => inMonth(d, now));
  const ytdInvoiced = sumInvoicedInRange(activeInvoices, (d) => inYear(d, now));

  const totalInvoiced = summary?.totalInvoiced ?? 0;
  const totalReceived = summary?.totalReceived ?? 0;
  const outstanding = summary?.outstanding ?? 0;
  const todaysCollections = summary?.todaysCollections ?? 0;

  const expectedRevenue = ebi?.executive.expectedRevenue ?? 0;
  const pipelineValue = ebi?.executive.pipelineValue ?? 0;

  const byProduct = groupByProduct(activeInvoices, ebi);
  const byLenderParty = groupByLenderParty(activeInvoices);
  const byRm = (ebi?.executive.dealsByRm ?? []).map((r) => ({
    name: r.name,
    expected: r.value ?? 0,
    dealCount: r.count,
  }));

  const periodTrend = buildPeriodTrend(activeInvoices);

  const waterfall: RevenueWaterfallStep[] = [
    { name: "Pipeline Value", value: pipelineValue, state: "pipeline" },
    { name: "Expected Revenue", value: expectedRevenue, state: "expected" },
    { name: "Invoiced (Net Receivable)", value: totalInvoiced, state: "invoiced" },
    { name: "Received (Posted)", value: totalReceived, state: "received" },
    { name: "Outstanding", value: outstanding, state: "outstanding" },
  ];

  const gstBreakdown = activeInvoices.reduce(
    (acc, inv) => {
      acc.taxableRevenue += inv.taxableValue ?? 0;
      const tax = inv.taxDetermination;
      if (tax) {
        acc.totalGst += tax.gstAmount ?? inv.gstAmount ?? 0;
        acc.cgst += tax.cgstAmount ?? 0;
        acc.sgst += tax.sgstAmount ?? 0;
        acc.igst += tax.igstAmount ?? 0;
      } else {
        acc.totalGst += inv.gstAmount ?? 0;
      }
      return acc;
    },
    { taxableRevenue: 0, totalGst: 0, cgst: 0, sgst: 0, igst: 0 },
  );

  const kpis: RevenueAnalyticsKpi[] = [
    {
      id: "expected",
      label: "Expected Revenue",
      value: formatINRCompact(expectedRevenue),
      hint: "Deal registry · forecast",
      state: "expected",
    },
    {
      id: "invoiced",
      label: "Total Invoiced",
      value: formatINRCompact(totalInvoiced),
      hint: "Net receivable on raised invoices",
      state: "invoiced",
    },
    {
      id: "received",
      label: "Total Received",
      value: formatINRCompact(totalReceived),
      hint: "Posted payments · realised",
      state: "received",
    },
    {
      id: "outstanding",
      label: "Outstanding",
      value: formatINRCompact(outstanding),
      hint: "Invoiced minus received & credits",
      state: "outstanding",
    },
    {
      id: "taxable",
      label: "Taxable Revenue",
      value: formatINRCompact(gstBreakdown.taxableRevenue),
      hint: "Invoice taxable value",
      state: "invoiced",
    },
    {
      id: "gst-total",
      label: "Total GST",
      value: formatINRCompact(gstBreakdown.totalGst),
      hint: "CGST + SGST/UTGST + IGST",
      state: "invoiced",
    },
    {
      id: "mtd-received",
      label: "MTD Received",
      value: formatINRCompact(mtdReceived),
      hint: "This calendar month",
      state: "received",
    },
    {
      id: "ytd-received",
      label: "YTD Received",
      value: formatINRCompact(ytdReceived),
      hint: "This calendar year",
      state: "received",
    },
    {
      id: "mtd-invoiced",
      label: "MTD Invoiced",
      value: formatINRCompact(mtdInvoiced),
      hint: "Invoice date · this month",
      state: "invoiced",
    },
    {
      id: "today",
      label: "Today's Collections",
      value: formatINRCompact(todaysCollections),
      hint: "Posted today",
      state: "received",
    },
  ];

  let disbursementVsRevenue: RevenueAnalyticsModel["disbursementVsRevenue"] = null;
  const cases = input.cases ?? [];
  if (cases.length > 0) {
    let totalDisbursed = 0;
    for (const c of cases) {
      const amt = Number(c.disbursedAmount ?? 0);
      if (amt > 0) totalDisbursed += amt;
    }
    disbursementVsRevenue = {
      totalDisbursed,
      totalInvoiced,
      totalReceived,
      caseCount: cases.length,
    };
  }

  const hasAccountingData =
    activeInvoices.length > 0 ||
    totalInvoiced > 0 ||
    totalReceived > 0 ||
    mtdReceived > 0;
  const hasPipelineData = expectedRevenue > 0 || pipelineValue > 0 || byRm.length > 0;

  return {
    asOf,
    hasAccountingData,
    hasPipelineData,
    kpis,
    gstBreakdown,
    waterfall,
    byProduct,
    byLenderParty,
    byRm,
    periodTrend,
    disbursementVsRevenue,
    sources: [
      "Enterprise Accounting Invoice Registry",
      "Enterprise Accounting Payment (posted)",
      ...(ebi ? ["Enterprise Business Intelligence snapshot"] : []),
      ...(cases.length ? ["Enterprise Accounting Case Registry"] : []),
    ],
  };
}
