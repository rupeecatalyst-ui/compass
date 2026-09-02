"use client";

/**
 * CO-MC-002 / CO-REFINEMENT-004 — Full-width Mission Control Enterprise Intelligence platform.
 * Renders precomputed snapshot sections only — never aggregates live.
 */

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  Treemap,
  XAxis,
  YAxis,
} from "recharts";
import type {
  McEiChartCard,
  McEiNamedValue,
  McEiSection,
  MissionControlEnterpriseIntelligencePack,
} from "@/types/mission-control-enterprise-intelligence";
import { McAnalyticsExpandCard } from "../shared/ui/McAnalyticsExpandCard";
import { EnterpriseChartTooltip } from "@/components/enterprise/charts/enterprise-chart-tooltip";
import { EnterpriseChartLegend } from "@/components/enterprise/charts/enterprise-chart-legend";
import { EnterpriseDoughnutChart } from "@/components/enterprise/charts/enterprise-doughnut-chart";
import { buildEnterpriseChartMeta, kindForMcChartKind, unitForMcChartKind } from "@/lib/enterprise-chart-readability";
import { ENTERPRISE_CHART_CATEGORY_COLORS } from "@/constants/enterprise-chart-readability";
import { cn } from "../shared/cn";

const CHART_COLORS = [...ENTERPRISE_CHART_CATEGORY_COLORS];

function hasSeries(series: McEiNamedValue[]): boolean {
  return series.some((s) => Number(s.value) > 0);
}

function FullWidthCard({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <article
      className={cn(
        "w-full rounded-2xl border border-zinc-800 bg-zinc-950/70 p-4 sm:p-5",
        className,
      )}
    >
      {children}
    </article>
  );
}


function EmptyChart({ label }: { label?: string }) {
  return (
    <div className="flex h-48 items-center justify-center text-xs text-zinc-500">
      {label || "No precomputed data for this view yet."}
    </div>
  );
}

function KpiStrip({ card }: { card: McEiChartCard }) {
  const kpis = card.kpis ?? [];
  if (kpis.length === 0) return <EmptyChart label={card.emptyLabel} />;
  return (
    <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
      {kpis.map((kpi) => (
        <li
          key={kpi.id}
          className={cn(
            "rounded-xl border px-3 py-3",
            kpi.tone === "positive"
              ? "border-teal-500/25 bg-teal-500/5"
              : kpi.tone === "attention"
                ? "border-amber-500/25 bg-amber-500/5"
                : "border-zinc-800 bg-zinc-900/40",
          )}
        >
          <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
            {kpi.label}
          </p>
          <p className="mt-1 text-xl font-semibold tabular-nums tracking-tight text-zinc-50">
            {kpi.value}
          </p>
          {kpi.hint ? (
            <p className="mt-0.5 text-[11px] text-zinc-500">{kpi.hint}</p>
          ) : null}
        </li>
      ))}
    </ul>
  );
}

function FunnelChart({ series }: { series: McEiNamedValue[] }) {
  const max = Math.max(...series.map((s) => s.value), 1);
  return (
    <ul className="mx-auto w-full max-w-3xl space-y-2 py-2">
      {series.map((row, i) => {
        const pct = Math.max(18, (row.value / max) * 100);
        return (
          <li key={row.name} className="flex flex-col items-center">
            <div
              className="flex h-9 items-center justify-between rounded-md px-3 text-[12px]"
              style={{
                width: `${pct}%`,
                background: `${CHART_COLORS[i % CHART_COLORS.length]}22`,
                border: `1px solid ${CHART_COLORS[i % CHART_COLORS.length]}55`,
              }}
            >
              <span className="truncate text-zinc-300">{row.name}</span>
              <span className="ml-3 tabular-nums font-semibold text-zinc-100">
                {row.value}
              </span>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function BarViz({ series, horizontal }: { series: McEiNamedValue[]; horizontal?: boolean }) {
  const data = series.map((s, i) => ({
    name: s.name,
    value: s.value,
    fill: CHART_COLORS[i % CHART_COLORS.length],
  }));
  const slices = data.map((s) => ({
    key: s.name,
    label: s.name,
    value: s.value,
    color: s.fill,
  }));
  return (
    <div className="flex flex-col gap-3 bg-zinc-950 md:flex-row md:items-start" data-enterprise-bar="true">
      <div className="h-64 min-w-0 flex-1 bg-zinc-950 sm:h-72">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            layout={horizontal ? "vertical" : "horizontal"}
            margin={{ top: 8, right: 12, left: 8, bottom: 48 }}
            style={{ background: "transparent" }}
          >
            <CartesianGrid stroke="#27272a" strokeDasharray="3 3" />
            {horizontal ? (
              <>
                <XAxis type="number" tick={{ fill: "#a1a1aa", fontSize: 10 }} label={{ value: "Value", position: "insideBottom", offset: -2, fill: "#71717a", fontSize: 10 }} />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={110}
                  tick={{ fill: "#a1a1aa", fontSize: 10 }}
                  interval={0}
                />
              </>
            ) : (
              <>
                <XAxis
                  dataKey="name"
                  tick={{ fill: "#a1a1aa", fontSize: 10 }}
                  interval={0}
                  angle={-25}
                  textAnchor="end"
                  height={60}
                />
                <YAxis tick={{ fill: "#a1a1aa", fontSize: 10 }} label={{ value: "Value", angle: -90, position: "insideLeft", fill: "#71717a", fontSize: 10 }} />
              </>
            )}
            <Tooltip content={<EnterpriseChartTooltip unit="count" period="Certified EI snapshot" unitLabel="Count" />} />
            <Bar dataKey="value" radius={[4, 4, 0, 0]}>
              {data.map((row) => (
                <Cell key={row.name} fill={row.fill} />
              ))}
              <LabelList dataKey="value" position={horizontal ? "right" : "top"} fill="#e4e4e7" fontSize={10} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <EnterpriseChartLegend slices={slices} unit="count" />
    </div>
  );
}

function DonutViz({ series }: { series: McEiNamedValue[] }) {
  const slices = series.map((s, i) => ({
    key: s.name,
    label: s.name,
    value: s.value,
    color: CHART_COLORS[i % CHART_COLORS.length],
  }));
  return (
    <EnterpriseDoughnutChart
      slices={slices}
      unit="count"
      period="Certified EI snapshot"
      unitLabel="Count"
      centerLabel="Total"
      height={260}
    />
  );
}

function LineOrAreaViz({
  series,
  kind,
}: {
  series: McEiNamedValue[];
  kind: "line" | "area";
}) {
  const data = series.map((s) => ({ name: s.name, value: s.value }));
  return (
    <div className="h-64 w-full sm:h-72">
      <ResponsiveContainer width="100%" height="100%">
        {kind === "area" ? (
          <AreaChart data={data} margin={{ top: 8, right: 12, left: 8, bottom: 48 }}>
            <CartesianGrid stroke="#27272a" strokeDasharray="3 3" />
            <XAxis
              dataKey="name"
              tick={{ fill: "#a1a1aa", fontSize: 10 }}
              interval={0}
              angle={-25}
              textAnchor="end"
              height={60}
            />
            <YAxis tick={{ fill: "#a1a1aa", fontSize: 10 }} />
            <Tooltip content={<EnterpriseChartTooltip unit="count" period="Certified EI snapshot" unitLabel="Count" />} />
            <Area
              type="monotone"
              dataKey="value"
              stroke="#0d9488"
              fill="#0d948833"
              strokeWidth={2}
            />
          </AreaChart>
        ) : (
          <LineChart data={data} margin={{ top: 8, right: 12, left: 8, bottom: 48 }}>
            <CartesianGrid stroke="#27272a" strokeDasharray="3 3" />
            <XAxis
              dataKey="name"
              tick={{ fill: "#a1a1aa", fontSize: 10 }}
              interval={0}
              angle={-25}
              textAnchor="end"
              height={60}
            />
            <YAxis tick={{ fill: "#a1a1aa", fontSize: 10 }} />
            <Tooltip content={<EnterpriseChartTooltip unit="count" period="Certified EI snapshot" unitLabel="Count" />} />
            <Line
              type="monotone"
              dataKey="value"
              stroke="#38bdf8"
              strokeWidth={2}
              dot={{ r: 3 }}
            />
          </LineChart>
        )}
      </ResponsiveContainer>
    </div>
  );
}

function TreemapViz({ series }: { series: McEiNamedValue[] }) {
  const data = series.map((s, i) => ({
    name: s.name,
    size: Math.max(s.value, 0.1),
    fill: CHART_COLORS[i % CHART_COLORS.length],
  }));
  return (
    <div className="h-72 w-full sm:h-80">
      <ResponsiveContainer width="100%" height="100%">
        <Treemap
          data={data}
          dataKey="size"
          nameKey="name"
          stroke="#18181b"
          content={<TreemapCell />}
        />
      </ResponsiveContainer>
    </div>
  );
}

function TreemapCell(props: {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  name?: string;
  fill?: string;
}) {
  const { x = 0, y = 0, width = 0, height = 0, name, fill } = props;
  if (width < 4 || height < 4) return null;
  return (
    <g>
      <rect x={x} y={y} width={width} height={height} fill={fill || "#0d9488"} rx={4} />
      {width > 56 && height > 28 ? (
        <text
          x={x + 8}
          y={y + 18}
          fill="#fafafa"
          fontSize={11}
          fontWeight={600}
        >
          {name}
        </text>
      ) : null}
    </g>
  );
}

function HeatmapViz({ series }: { series: McEiNamedValue[] }) {
  const max = Math.max(...series.map((s) => s.value), 1);
  return (
    <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
      {series.map((row) => {
        const intensity = Math.min(1, row.value / max);
        return (
          <div
            key={row.name}
            className="rounded-xl border border-zinc-800 px-3 py-3"
            style={{
              background: `rgba(13, 148, 136, ${0.08 + intensity * 0.45})`,
            }}
          >
            <p className="truncate text-[12px] font-medium text-zinc-200">{row.name}</p>
            <p className="mt-1 text-lg font-semibold tabular-nums text-zinc-50">
              {row.value}
            </p>
          </div>
        );
      })}
    </div>
  );
}

function WaterfallViz({ series }: { series: McEiNamedValue[] }) {
  return <BarViz series={series} />;
}

function NetworkViz({ series }: { series: McEiNamedValue[] }) {
  if (!hasSeries(series)) return <EmptyChart />;
  const max = Math.max(...series.map((s) => s.value), 1);
  return (
    <div className="flex flex-wrap items-center justify-center gap-4 py-6">
      <div className="flex h-20 w-20 items-center justify-center rounded-full border border-teal-500/40 bg-teal-500/10 text-center text-[10px] font-semibold uppercase tracking-wide text-teal-200">
        Enterprise
      </div>
      {series.slice(0, 10).map((node, i) => {
        const size = 48 + (node.value / max) * 36;
        return (
          <div
            key={node.name}
            className="flex flex-col items-center gap-1"
            style={{ width: size + 24 }}
          >
            <div
              className="flex items-center justify-center rounded-full border text-center text-[10px] font-medium text-zinc-100"
              style={{
                width: size,
                height: size,
                borderColor: `${CHART_COLORS[i % CHART_COLORS.length]}88`,
                background: `${CHART_COLORS[i % CHART_COLORS.length]}22`,
              }}
              title={node.name}
            >
              {node.value}
            </div>
            <p className="max-w-[7rem] truncate text-center text-[10px] text-zinc-400">
              {node.name}
            </p>
          </div>
        );
      })}
    </div>
  );
}

function InsightList({ card }: { card: McEiChartCard }) {
  const insights = card.insights ?? [];
  if (insights.length === 0) return <EmptyChart label={card.emptyLabel} />;
  return (
    <ul className="space-y-3">
      {insights.map((insight) => (
        <li
          key={insight.id}
          className={cn(
            "rounded-xl border px-4 py-3",
            insight.tone === "danger"
              ? "border-rose-500/30 bg-rose-500/5"
              : insight.tone === "warning"
                ? "border-amber-500/30 bg-amber-500/5"
                : insight.tone === "success"
                  ? "border-teal-500/30 bg-teal-500/5"
                  : "border-zinc-800 bg-zinc-900/40",
          )}
        >
          <p className="text-sm font-medium text-zinc-100">{insight.text}</p>
          <p className="mt-1 text-[12px] text-zinc-400">{insight.reason}</p>
          {insight.recommendedAction ? (
            <p className="mt-2 text-[11px] font-medium text-teal-300/90">
              → {insight.recommendedAction}
            </p>
          ) : null}
        </li>
      ))}
    </ul>
  );
}

function ChartBody({ card }: { card: McEiChartCard }) {
  if (card.kind === "kpi_strip") return <KpiStrip card={card} />;
  if (card.kind === "insight_list") return <InsightList card={card} />;
  if (!hasSeries(card.series) && !(card.kpis && card.kpis.length > 0)) {
    return <EmptyChart label={card.emptyLabel} />;
  }
  switch (card.kind) {
    case "funnel":
      return <FunnelChart series={card.series} />;
    case "bar":
      return <BarViz series={card.series} horizontal={card.series.length > 6} />;
    case "donut":
      return <DonutViz series={card.series} />;
    case "line":
      return <LineOrAreaViz series={card.series} kind="line" />;
    case "area":
      return <LineOrAreaViz series={card.series} kind="area" />;
    case "treemap":
      return <TreemapViz series={card.series} />;
    case "heatmap":
      return <HeatmapViz series={card.series} />;
    case "waterfall":
      return <WaterfallViz series={card.series} />;
    case "network":
      return <NetworkViz series={card.series} />;
    default:
      return <BarViz series={card.series} />;
  }
}

function SectionBlock({
  section,
  pack,
}: {
  section: McEiSection;
  pack: MissionControlEnterpriseIntelligencePack;
}) {
  return (
    <section className="space-y-3" id={`mc-ei-${section.id}`}>
      <header className="border-b border-zinc-800/80 pb-2">
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
          Section
        </p>
        <h3 className="mt-1 text-base font-semibold text-zinc-50">{section.title}</h3>
        <p className="mt-0.5 text-[12px] text-zinc-500">{section.subtitle}</p>
      </header>
      <div className="flex flex-col gap-4">
        {section.cards.map((card) => (
          <McAnalyticsExpandCard
            key={card.id}
            title={card.title}
            subtitle={card.subtitle}
            meta={buildEnterpriseChartMeta({
              id: card.id,
              title: card.title,
              measurementDefinition: card.subtitle || section.subtitle,
              reportingPeriod: pack.refreshScheduleLabel,
              unit: unitForMcChartKind(card.kind),
              lastUpdated: pack.generatedAt,
              dataSource: pack.sourceModules.join(" · ") || "Mission Control EI pack",
              kind: kindForMcChartKind(card.kind),
            })}
            empty={!hasSeries(card.series) && !(card.kpis && card.kpis.length > 0)}
            emptyMessage={card.emptyLabel}
          >
            <ChartBody card={card} />
          </McAnalyticsExpandCard>
        ))}
      </div>
    </section>
  );
}

export function EnterpriseIntelligencePlatform({
  pack,
}: {
  pack: MissionControlEnterpriseIntelligencePack | null;
}) {
  if (!pack || pack.sections.length === 0) {
    return (
      <FullWidthCard>
        <p className="text-sm font-medium text-zinc-200">
          Enterprise Intelligence Snapshot pending
        </p>
        <p className="mt-1 text-[12px] text-zinc-500">
          Analytics refresh daily at 02:00 AM (Asia/Kolkata). Ask an Administrator to
          Force Recalculate under Administration → Enterprise Metrics.
        </p>
      </FullWidthCard>
    );
  }

  return (
    <div className="space-y-10">
      <div className="flex flex-wrap items-end justify-between gap-2 border-b border-zinc-800 pb-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-teal-500/80">
            CO-MC-002 · Enterprise Intelligence
          </p>
          <h2 className="mt-1 text-lg font-semibold text-zinc-50">
            Executive Intelligence Report
          </h2>
          <p className="mt-0.5 text-[12px] text-zinc-500">
            Precomputed datasets · {pack.refreshScheduleLabel} · One card per row
          </p>
        </div>
        <p className="text-[11px] tabular-nums text-zinc-500">
          As of {new Date(pack.asOf).toLocaleString()}
        </p>
      </div>
      {pack.sections.map((section) => (
        <SectionBlock key={section.id} section={section} pack={pack} />
      ))}
    </div>
  );
}
