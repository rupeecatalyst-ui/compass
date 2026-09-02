"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { EnterpriseChartTooltip } from "@/components/enterprise/charts/enterprise-chart-tooltip";
import { formatINRCompact } from "@/lib/format-currency";
import type {
  DashboardAgeBucket,
  DashboardDisbursementPeriod,
  DashboardNamedSlice,
  DashboardTrendPoint,
} from "@/types/dashboard-visual-analytics";

export function DashboardHorizontalBarChart({
  slices,
  onBarClick,
}: {
  slices: DashboardNamedSlice[];
  onBarClick?: (slice: DashboardNamedSlice) => void;
}) {
  if (slices.length === 0) {
    return (
      <div className="flex h-[220px] items-center justify-center text-xs text-muted-foreground">
        No lender assignments
      </div>
    );
  }

  return (
    <div className="h-[220px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          layout="vertical"
          data={slices}
          margin={{ top: 4, right: 12, left: 4, bottom: 4 }}
        >
          <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="rgb(148 163 184 / 0.25)" />
          <XAxis type="number" allowDecimals={false} tick={{ fontSize: 10 }} label={{ value: "Opportunities (count)", position: "insideBottom", offset: -2, fontSize: 10 }} />
          <YAxis
            type="category"
            dataKey="label"
            width={96}
            tick={{ fontSize: 10 }}
            interval={0}
          />
          <Tooltip
            content={
              <EnterpriseChartTooltip
                unit="opportunities"
                unitLabel="Opportunities"
                period="Current operational view"
              />
            }
          />
          <Bar
            dataKey="count"
            radius={[0, 6, 6, 0]}
            fill="#0f766e"
            cursor={onBarClick ? "pointer" : "default"}
            onClick={(data) => {
              const slice = data as unknown as DashboardNamedSlice;
              if (slice?.key) onBarClick?.(slice);
            }}
          >
            <LabelList dataKey="count" position="right" fontSize={10} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function DashboardAgeingStackedBar({
  buckets,
  onBucketClick,
}: {
  buckets: DashboardAgeBucket[];
  onBucketClick?: (bucket: DashboardAgeBucket) => void;
}) {
  const data = [
    Object.fromEntries([
      ["name", "Ageing"],
      ...buckets.map((b) => [b.id, b.count]),
    ]),
  ];
  const colors: Record<string, string> = {
    "0_7": "#059669",
    "8_15": "#0f766e",
    "16_30": "#c4a35a",
    "31_60": "#ea580c",
    "60_plus": "#e11d48",
  };

  return (
    <div className="h-[200px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgb(148 163 184 / 0.25)" />
          <XAxis dataKey="name" tick={{ fontSize: 10 }} />
          <YAxis allowDecimals={false} tick={{ fontSize: 10 }} />
          <Tooltip
            content={
              <EnterpriseChartTooltip
                unit="count"
                unitLabel="Opportunities"
                period="Current operational view"
              />
            }
          />
          <Legend
            wrapperStyle={{ fontSize: 10 }}
            formatter={(value) => buckets.find((b) => b.id === value)?.label ?? value}
          />
          {buckets.map((b) => (
            <Bar
              key={b.id}
              dataKey={b.id}
              stackId="age"
              fill={colors[b.id] || "#0f766e"}
              cursor={onBucketClick ? "pointer" : "default"}
              onClick={() => onBucketClick?.(b)}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function DashboardTrendLineChart({ series }: { series: DashboardTrendPoint[] }) {
  if (series.length === 0) {
    return (
      <div className="flex h-[220px] items-center justify-center text-xs text-muted-foreground">
        No trend data
      </div>
    );
  }

  return (
    <div className="h-[220px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={series} margin={{ top: 8, right: 12, left: 8, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgb(148 163 184 / 0.25)" />
          <XAxis dataKey="period" tick={{ fontSize: 10 }} interval={0} />
          <YAxis
            allowDecimals={false}
            tick={{ fontSize: 10 }}
            label={{ value: "Count", angle: -90, position: "insideLeft", fontSize: 10 }}
          />
          <Tooltip
            content={
              <EnterpriseChartTooltip
                unit="count"
                unitLabel="Count"
                period="Selected trend range"
              />
            }
          />
          <Legend wrapperStyle={{ fontSize: 10 }} />
          <Line
            type="monotone"
            dataKey="opportunitiesCreated"
            name="Created"
            stroke="#0f766e"
            strokeWidth={2.2}
            dot={{ r: 3 }}
            activeDot={{ r: 5 }}
          />
          <Line
            type="monotone"
            dataKey="logins"
            name="Logins"
            stroke="#0284c7"
            strokeWidth={2.2}
            dot={{ r: 3 }}
          />
          <Line
            type="monotone"
            dataKey="disbursements"
            name="Disbursements"
            stroke="#c4a35a"
            strokeWidth={2.2}
            dot={{ r: 3 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function DashboardDisbursementBarChart({
  periods,
}: {
  periods: DashboardDisbursementPeriod[];
}) {
  return (
    <div className="h-[220px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={periods} margin={{ top: 8, right: 8, left: 0, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgb(148 163 184 / 0.25)" />
          <XAxis dataKey="label" tick={{ fontSize: 10 }} />
          <YAxis yAxisId="left" allowDecimals={false} tick={{ fontSize: 10 }} label={{ value: "Cases", angle: -90, position: "insideLeft", fontSize: 10 }} />
          <YAxis
            yAxisId="right"
            orientation="right"
            tick={{ fontSize: 10 }}
            tickFormatter={(v) => formatINRCompact(Number(v))}
            label={{ value: "₹ value", angle: 90, position: "insideRight", fontSize: 10 }}
          />
          <Tooltip
            content={
              <EnterpriseChartTooltip
                unit="count"
                unitLabel="Cases / ₹ value"
                period="Current operational view"
              />
            }
          />
          <Legend wrapperStyle={{ fontSize: 10 }} />
          <Bar yAxisId="left" dataKey="count" name="Cases" fill="#0f766e" radius={[6, 6, 0, 0]}>
            <LabelList dataKey="count" position="top" fontSize={10} />
          </Bar>
          <Bar
            yAxisId="right"
            dataKey="value"
            name="Opportunity Value"
            fill="#c4a35a"
            radius={[6, 6, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
