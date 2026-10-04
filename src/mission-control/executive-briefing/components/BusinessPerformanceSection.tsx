"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { BusinessPerformanceModel } from "../types";
import { EnterpriseChartTooltip } from "@/components/enterprise/charts/enterprise-chart-tooltip";
import { EnterpriseChartMetaStrip } from "@/components/enterprise/charts/enterprise-chart-frame";

function ChartShell({
  title,
  definition,
  unitLabel,
  children,
}: {
  title: string;
  definition: string;
  unitLabel: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-4">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">{title}</p>
      <EnterpriseChartMetaStrip
        meta={{
          measurementDefinition: definition,
          reportingPeriod: "Current briefing snapshot",
          unitLabel,
          lastUpdated: null,
          activeFilters: [],
        }}
        className="text-zinc-500"
      />
      <div className="mt-3 h-44 w-full">{children}</div>
    </div>
  );
}

export function BusinessPerformanceSection({
  model,
}: {
  model: BusinessPerformanceModel;
}) {
  const maxFunnel = Math.max(...model.funnel.map((f) => f.value), 1);

  return (
    <section className="space-y-3">
      <header>
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
          Business Performance
        </p>
        <h3 className="mt-1 text-sm font-semibold text-zinc-100">
          Pipeline, products, lenders, conversion and revenue
        </h3>
      </header>

      <div className="flex flex-col gap-3">
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-4 xl:col-span-1">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
            Pipeline Funnel
          </p>
          <ul className="mt-3 space-y-2">
            {model.funnel.map((row) => (
              <li key={row.stage}>
                <div className="mb-1 flex justify-between text-[11px]">
                  <span className="text-zinc-400">{row.stage}</span>
                  <span className="tabular-nums text-zinc-200">{row.value}</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-zinc-900">
                  <div
                    className="h-full rounded-full bg-zinc-500/80"
                    style={{ width: `${Math.max(8, (row.value / maxFunnel) * 100)}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
        </div>

        <ChartShell
          title="Loan Products"
          definition="Deal or opportunity count by product in the briefing snapshot."
          unitLabel="Count"
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={model.products} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
              <CartesianGrid stroke="#27272a" vertical={false} />
              <XAxis dataKey="name" tick={{ fill: "#71717a", fontSize: 10 }} axisLine={false} tickLine={false} interval={0} />
              <YAxis tick={{ fill: "#71717a", fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip content={<EnterpriseChartTooltip unit="count" period="Current briefing snapshot" unitLabel="Count" />} />
              <Bar dataKey="value" fill="#52525b" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartShell>

        <ChartShell
          title="Top Lenders"
          definition="Count by lender in the briefing snapshot."
          unitLabel="Count"
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={model.lenders}
              layout="vertical"
              margin={{ top: 4, right: 12, left: 8, bottom: 0 }}
            >
              <CartesianGrid stroke="#27272a" horizontal={false} />
              <XAxis type="number" tick={{ fill: "#71717a", fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis
                type="category"
                dataKey="name"
                width={88}
                tick={{ fill: "#a1a1aa", fontSize: 10 }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip content={<EnterpriseChartTooltip unit="count" period="Current briefing snapshot" unitLabel="Count" />} />
              <Bar dataKey="value" fill="#3f3f46" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartShell>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-4">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
            Conversion
          </p>
          <ul className="mt-4 space-y-3">
            {model.conversion.map((row) => (
              <li key={row.label}>
                <div className="mb-1 flex justify-between text-[11px]">
                  <span className="text-zinc-400">{row.label}</span>
                  <span className="tabular-nums font-semibold text-zinc-100">{row.rate}%</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-zinc-900">
                  <div
                    className="h-full rounded-full bg-zinc-400/70"
                    style={{ width: `${row.rate}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
        </div>

        <ChartShell
          title="Revenue Trend (Cr)"
          definition="Briefing revenue trend in crore. Compact INR display in tooltips."
          unitLabel="₹ Cr"
        >
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={model.revenueTrend} margin={{ top: 4, right: 8, left: 8, bottom: 0 }}>
              <defs>
                <linearGradient id="execRevenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#71717a" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="#71717a" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="#27272a" vertical={false} />
              <XAxis dataKey="month" tick={{ fill: "#71717a", fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#71717a", fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip content={<EnterpriseChartTooltip unit="inr" period="Current briefing snapshot" unitLabel="₹ value" />} />
              <Area
                type="monotone"
                dataKey="revenue"
                stroke="#a1a1aa"
                fill="url(#execRevenue)"
                strokeWidth={1.5}
              />
            </AreaChart>
          </ResponsiveContainer>
        </ChartShell>
      </div>
    </section>
  );
}
