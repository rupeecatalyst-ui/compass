"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatINRCompact } from "@/lib/format-currency";
import { deriveRevenueAnalytics } from "@/lib/revenue-analytics";
import {
  enterpriseAccountingCaseClient,
  type EnterpriseAccountingCaseDto,
} from "@/lib/enterprise-accounting-case/client";
import { enterpriseAccountingInvoiceClient } from "@/lib/enterprise-accounting-invoice/client";
import { loadMissionControlCertifiedSnapshot } from "@/mission-control/shared/load-mission-control-snapshot";
import { McAnalyticsExpandCard } from "@/mission-control/shared/ui/McAnalyticsExpandCard";
import { WorkspaceLoadingState } from "@/mission-control/shared/ui";
import type { RevenueAnalyticsModel } from "@/types/revenue-analytics";
import type { EnterpriseAccountingInvoiceDto } from "@/types/enterprise-accounting-invoice";
import type { DerivedAccountingPaymentSummary } from "@/types/enterprise-accounting-payment";
import type { EbiSnapshot } from "@/types/enterprise-business-intelligence";
import { cn } from "../shared/cn";

const CHART_COLORS = ["#0d9488", "#38bdf8", "#a78bfa", "#fbbf24", "#f472b6", "#34d399"];

const tooltipStyle = {
  background: "#09090b",
  border: "1px solid #27272a",
  borderRadius: 8,
  fontSize: 11,
  color: "#e4e4e7",
};

const STATE_LABEL: Record<string, string> = {
  expected: "Expected / accrued (Deal registry)",
  invoiced: "Invoiced (net receivable)",
  received: "Received / realised (posted payments)",
  outstanding: "Outstanding receivable",
  pipeline: "Pipeline value (Deals)",
};

function RevenueStateLegend() {
  return (
    <ul className="flex flex-wrap gap-2 text-[10px] text-zinc-500">
      {Object.entries(STATE_LABEL).map(([key, label]) => (
        <li
          key={key}
          className="rounded-full border border-zinc-800 bg-zinc-900/60 px-2.5 py-1"
        >
          <span className="font-semibold uppercase tracking-wide text-zinc-400">{key}</span>
          <span className="text-zinc-600"> · </span>
          {label}
        </li>
      ))}
    </ul>
  );
}

function KpiStrip({ model }: { model: RevenueAnalyticsModel }) {
  return (
    <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {model.kpis.map((kpi) => (
        <li
          key={kpi.id}
          className={cn(
            "rounded-xl border px-3 py-3",
            kpi.state === "received"
              ? "border-teal-500/25 bg-teal-500/5"
              : kpi.state === "invoiced"
                ? "border-sky-500/25 bg-sky-500/5"
                : kpi.state === "expected"
                  ? "border-violet-500/25 bg-violet-500/5"
                  : "border-zinc-800 bg-zinc-900/40",
          )}
        >
          <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
            {kpi.label}
          </p>
          <p className="mt-1 text-xl font-semibold tabular-nums text-zinc-50">{kpi.value}</p>
          {kpi.hint ? <p className="mt-0.5 text-[11px] text-zinc-500">{kpi.hint}</p> : null}
        </li>
      ))}
    </ul>
  );
}

function WaterfallChart({ model }: { model: RevenueAnalyticsModel }) {
  const data = model.waterfall.filter((s) => s.value > 0);
  if (data.length === 0) {
    return (
      <p className="py-12 text-center text-xs text-zinc-500">
        No revenue waterfall data yet — raise invoices or refresh the EBI snapshot.
      </p>
    );
  }
  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 12, left: 8, bottom: 48 }}>
          <CartesianGrid stroke="#27272a" strokeDasharray="3 3" />
          <XAxis
            dataKey="name"
            tick={{ fill: "#a1a1aa", fontSize: 10 }}
            interval={0}
            angle={-20}
            textAnchor="end"
            height={70}
          />
          <YAxis tick={{ fill: "#a1a1aa", fontSize: 10 }} tickFormatter={(v) => formatINRCompact(v)} />
          <Tooltip
            contentStyle={tooltipStyle}
            formatter={(value: number) => [formatINRCompact(value), "Amount"]}
          />
          <Bar dataKey="value" radius={[4, 4, 0, 0]}>
            {data.map((entry, i) => (
              <Cell key={entry.name} fill={CHART_COLORS[i % CHART_COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function ProductMixChart({ model }: { model: RevenueAnalyticsModel }) {
  const data = model.byProduct.slice(0, 10);
  if (data.length === 0) {
    return <EmptyChart message="No product-level revenue yet." />;
  }
  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 12, left: 8, bottom: 48 }}>
          <CartesianGrid stroke="#27272a" strokeDasharray="3 3" />
          <XAxis
            dataKey="name"
            tick={{ fill: "#a1a1aa", fontSize: 10 }}
            interval={0}
            angle={-25}
            textAnchor="end"
            height={60}
          />
          <YAxis tick={{ fill: "#a1a1aa", fontSize: 10 }} tickFormatter={(v) => formatINRCompact(v)} />
          <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => formatINRCompact(v)} />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          <Bar dataKey="expected" name="Expected" fill="#a78bfa" radius={[4, 4, 0, 0]} />
          <Bar dataKey="invoiced" name="Invoiced" fill="#38bdf8" radius={[4, 4, 0, 0]} />
          <Bar dataKey="received" name="Received" fill="#0d9488" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function LenderContributionChart({ model }: { model: RevenueAnalyticsModel }) {
  const data = model.byLenderParty.slice(0, 10);
  if (data.length === 0) {
    return <EmptyChart message="No invoice party / lender revenue yet." />;
  }
  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 8, right: 12, left: 8, bottom: 8 }}
        >
          <CartesianGrid stroke="#27272a" horizontal={false} strokeDasharray="3 3" />
          <XAxis type="number" tick={{ fill: "#a1a1aa", fontSize: 10 }} tickFormatter={(v) => formatINRCompact(v)} />
          <YAxis
            type="category"
            dataKey="name"
            width={120}
            tick={{ fill: "#a1a1aa", fontSize: 10 }}
          />
          <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => formatINRCompact(v)} />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          <Bar dataKey="invoiced" name="Invoiced" fill="#38bdf8" radius={[0, 4, 4, 0]} />
          <Bar dataKey="received" name="Received" fill="#0d9488" radius={[0, 4, 4, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function RmContributionChart({ model }: { model: RevenueAnalyticsModel }) {
  const data = model.byRm.slice(0, 10);
  if (data.length === 0) {
    return <EmptyChart message="RM contribution requires an EBI snapshot with Deal ownership data." />;
  }
  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 12, left: 8, bottom: 48 }}>
          <CartesianGrid stroke="#27272a" strokeDasharray="3 3" />
          <XAxis
            dataKey="name"
            tick={{ fill: "#a1a1aa", fontSize: 10 }}
            interval={0}
            angle={-25}
            textAnchor="end"
            height={60}
          />
          <YAxis tick={{ fill: "#a1a1aa", fontSize: 10 }} tickFormatter={(v) => formatINRCompact(v)} />
          <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => formatINRCompact(v)} />
          <Bar dataKey="expected" name="Expected pipeline" fill="#a78bfa" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function TrendChart({ model }: { model: RevenueAnalyticsModel }) {
  const data = model.periodTrend;
  const hasValues = data.some((d) => d.invoiced > 0 || d.received > 0);
  if (!hasValues) {
    return <EmptyChart message="Trend appears once invoices or posted payments exist." />;
  }
  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 12, left: 8, bottom: 8 }}>
          <CartesianGrid stroke="#27272a" strokeDasharray="3 3" />
          <XAxis dataKey="period" tick={{ fill: "#a1a1aa", fontSize: 10 }} />
          <YAxis tick={{ fill: "#a1a1aa", fontSize: 10 }} tickFormatter={(v) => formatINRCompact(v)} />
          <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => formatINRCompact(v)} />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          <Line type="monotone" dataKey="invoiced" name="Invoiced" stroke="#38bdf8" strokeWidth={2} dot={{ r: 3 }} />
          <Line type="monotone" dataKey="received" name="Received" stroke="#0d9488" strokeWidth={2} dot={{ r: 3 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

function RealisationDonut({ model }: { model: RevenueAnalyticsModel }) {
  const invoiced = model.waterfall.find((s) => s.state === "invoiced")?.value ?? 0;
  const received = model.waterfall.find((s) => s.state === "received")?.value ?? 0;
  const outstanding = model.waterfall.find((s) => s.state === "outstanding")?.value ?? 0;
  const data = [
    { name: "Received", value: received, fill: "#0d9488" },
    { name: "Outstanding", value: outstanding, fill: "#fbbf24" },
  ].filter((d) => d.value > 0);
  if (invoiced <= 0 || data.length === 0) {
    return <EmptyChart message="Realisation mix requires invoiced revenue." />;
  }
  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="name" innerRadius={64} outerRadius={96} paddingAngle={2}>
            {data.map((d) => (
              <Cell key={d.name} fill={d.fill} stroke="transparent" />
            ))}
          </Pie>
          <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => formatINRCompact(v)} />
          <Legend wrapperStyle={{ fontSize: 11 }} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

function DisbursementCompare({ model }: { model: RevenueAnalyticsModel }) {
  const d = model.disbursementVsRevenue;
  if (!d || d.totalDisbursed <= 0) {
    return (
      <EmptyChart message="Disbursement comparison appears when Accounting Cases capture disbursed amounts." />
    );
  }
  const rows = [
    { label: "Total Disbursed (cases)", value: d.totalDisbursed },
    { label: "Total Invoiced", value: d.totalInvoiced },
    { label: "Total Received", value: d.totalReceived },
  ];
  const max = Math.max(...rows.map((r) => r.value), 1);
  return (
    <ul className="space-y-3 py-2">
      {rows.map((row) => (
        <li key={row.label}>
          <div className="mb-1 flex justify-between text-[11px]">
            <span className="text-zinc-400">{row.label}</span>
            <span className="tabular-nums font-semibold text-zinc-100">
              {formatINRCompact(row.value)}
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-zinc-900">
            <div
              className="h-full rounded-full bg-teal-500/70"
              style={{ width: `${Math.max(8, (row.value / max) * 100)}%` }}
            />
          </div>
        </li>
      ))}
      <p className="text-[11px] text-zinc-500">{d.caseCount} Accounting Cases in scope</p>
    </ul>
  );
}

function EmptyChart({ message }: { message: string }) {
  return (
    <div className="flex h-48 items-center justify-center px-4 text-center text-xs text-zinc-500">
      {message}
    </div>
  );
}

function RevenueAnalyticsBody({ model }: { model: RevenueAnalyticsModel }) {
  if (!model.hasAccountingData && !model.hasPipelineData) {
    return (
      <div className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-8 text-center">
        <p className="text-sm font-medium text-zinc-200">No revenue analytics yet</p>
        <p className="mt-2 text-[12px] text-zinc-500">
          Accounting invoices and/or an Enterprise Metrics snapshot are required. Operational Accounting
          continues independently — this view analyses revenue when data exists.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <RevenueStateLegend />
      <McAnalyticsExpandCard title="Revenue KPIs" subtitle="Expected · Invoiced · Received · Outstanding · GST">
        <KpiStrip model={model} />
      </McAnalyticsExpandCard>

      <McAnalyticsExpandCard
        title="GST Breakup"
        subtitle="Taxable revenue and CGST / SGST / IGST from generated invoice determinations"
      >
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {(
            [
              ["Taxable", model.gstBreakdown.taxableRevenue],
              ["Total GST", model.gstBreakdown.totalGst],
              ["CGST", model.gstBreakdown.cgst],
              ["SGST / UTGST", model.gstBreakdown.sgst],
              ["IGST", model.gstBreakdown.igst],
            ] as const
          ).map(([label, value]) => (
            <li key={label} className="rounded-xl border border-zinc-800 bg-zinc-950/70 px-3 py-3">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">{label}</p>
              <p className="mt-1 text-lg font-semibold tabular-nums text-zinc-100">
                {formatINRCompact(value)}
              </p>
            </li>
          ))}
        </ul>
      </McAnalyticsExpandCard>

      <McAnalyticsExpandCard
        title="Revenue Realisation Waterfall"
        subtitle="Pipeline → Expected → Invoiced → Received → Outstanding"
      >
        <WaterfallChart model={model} />
      </McAnalyticsExpandCard>

      <McAnalyticsExpandCard
        title="Revenue Trend by Period"
        subtitle="Monthly invoiced vs posted collections (last 6 months)"
      >
        <TrendChart model={model} />
      </McAnalyticsExpandCard>

      <McAnalyticsExpandCard
        title="Product Contribution"
        subtitle="Expected (EBI) vs Invoiced vs Received by product"
      >
        <ProductMixChart model={model} />
      </McAnalyticsExpandCard>

      <McAnalyticsExpandCard
        title="Lender / Invoice Party Contribution"
        subtitle="Invoiced and received by commission invoice party"
      >
        <LenderContributionChart model={model} />
      </McAnalyticsExpandCard>

      <McAnalyticsExpandCard
        title="RM Pipeline Contribution"
        subtitle="Expected revenue by relationship manager (EBI snapshot)"
      >
        <RmContributionChart model={model} />
      </McAnalyticsExpandCard>

      <McAnalyticsExpandCard
        title="Invoiced Revenue Realisation"
        subtitle="Share of invoiced amount received vs outstanding"
      >
        <RealisationDonut model={model} />
      </McAnalyticsExpandCard>

      <McAnalyticsExpandCard
        title="Disbursement vs Revenue"
        subtitle="Accounting Case disbursed amounts compared to invoiced and received"
      >
        <DisbursementCompare model={model} />
      </McAnalyticsExpandCard>
    </div>
  );
}

/**
 * CO-REFINEMENT-005 — Revenue Analytics within Mission Control shell.
 */
export function RevenueAnalyticsWorkspace() {
  const [loading, setLoading] = useState(true);
  const [model, setModel] = useState<RevenueAnalyticsModel | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const [invoiceResult, snapshot, caseResult] = await Promise.all([
          enterpriseAccountingInvoiceClient.list().catch(() => ({
            items: [] as EnterpriseAccountingInvoiceDto[],
            summary: null as DerivedAccountingPaymentSummary | null,
          })),
          loadMissionControlCertifiedSnapshot().catch(() => null),
          enterpriseAccountingCaseClient.list({ pageSize: 200 }).catch(() => ({
            items: [] as EnterpriseAccountingCaseDto[],
          })),
        ]);
        if (cancelled) return;
        const derived = deriveRevenueAnalytics({
          invoices: invoiceResult.items,
          summary: invoiceResult.summary,
          ebi: snapshot?.ebi ?? null,
          cases: caseResult.items,
        });
        setModel(derived);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const header = useMemo(
    () => (
      <div className="border-b border-zinc-800 pb-4">
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-teal-500/80">
          Mission Control · Revenue Analytics
        </p>
        <h1 className="mt-1 text-xl font-semibold tracking-tight text-zinc-50">Revenue Analytics</h1>
        <p className="mt-1 max-w-2xl text-[12px] text-zinc-500">
          Accounting records and processes revenue. Mission Control analyses it. Expected, invoiced, and
          received figures are kept distinct.
        </p>
        {model ? (
          <p className="mt-2 text-[11px] tabular-nums text-zinc-600">
            As of {new Date(model.asOf).toLocaleString()} · Sources: {model.sources.join(" · ")}
          </p>
        ) : null}
      </div>
    ),
    [model],
  );

  if (loading) {
    return <WorkspaceLoadingState label="Loading Revenue Analytics…" />;
  }

  if (!model) {
    return (
      <div className="mx-auto w-full max-w-6xl space-y-6 pb-10">
        {header}
        <EmptyChart message="Unable to load revenue analytics." />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 pb-10">
      {header}
      <RevenueAnalyticsBody model={model} />
    </div>
  );
}
