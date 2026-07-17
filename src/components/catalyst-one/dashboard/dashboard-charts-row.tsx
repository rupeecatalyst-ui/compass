"use client";

import { useRouter } from "next/navigation";
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";
import { revenueTrendData, disbursementTrendData } from "@/data/catalyst-one/dashboard";
import { useDashboardFilter } from "@/hooks/use-dashboard-filter";
import { useDashboardPersona } from "@/hooks/use-dashboard-persona";
import { ROUTES } from "@/constants/routes";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import {
  DashboardCard,
  DashboardCardContent,
  DashboardCardHeader,
} from "@/components/catalyst-one/dashboard/dashboard-card";

const chartConfig = {
  value: { label: "Value", color: "hsl(166 76% 42%)" },
};

export function DashboardChartsRow() {
  const router = useRouter();
  const { dateRange } = useDashboardFilter();
  const { config } = useDashboardPersona();
  const factor = dateRange.scaleFactor;

  if (!config.showPerformanceChart) return null;

  const isRevenue = config.showPerformanceChart === "revenue";
  const data = (isRevenue ? revenueTrendData : disbursementTrendData).map((p) => ({
    ...p,
    value: Math.round(p.value * factor * 10) / 10,
  }));

  const title = isRevenue ? "Revenue trajectory" : "Disbursement trajectory";
  const description = isRevenue
    ? "Commission trend — helps you judge collection health"
    : "Disbursal trend — helps you judge delivery momentum";
  const href = isRevenue ? `${ROUTES.ACCOUNTING}?tab=revenue` : ROUTES.MY_DEALS;

  return (
    <DashboardCard
      className="cursor-pointer transition-colors hover:border-slate-700"
      onClick={() => router.push(href)}
    >
      <DashboardCardHeader title={title} description={description} />
      <DashboardCardContent className="pt-0">
        <ChartContainer config={chartConfig} className="h-[160px] w-full aspect-auto">
          <LineChart data={data} margin={{ top: 4, right: 8, left: -12, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" />
            <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fill: "#64748b", fontSize: 10 }} interval="preserveStartEnd" />
            <YAxis tickLine={false} axisLine={false} tick={{ fill: "#64748b", fontSize: 10 }} width={32} />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Line
              type="monotone"
              dataKey="value"
              stroke="var(--color-value)"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4 }}
            />
          </LineChart>
        </ChartContainer>
      </DashboardCardContent>
    </DashboardCard>
  );
}
