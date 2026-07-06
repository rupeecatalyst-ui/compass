"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";
import { leadArrivalTrendData } from "@/data/catalyst-one/dashboard";
import { useDashboardFilter } from "@/hooks/use-dashboard-filter";
import { ROUTES } from "@/constants/routes";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DashboardCard,
  DashboardCardContent,
  DashboardCardHeader,
} from "@/components/catalyst-one/dashboard/dashboard-card";

type LeadPeriod = "week" | "month" | "quarter";

const chartConfig = {
  leads: { label: "Leads", color: "#14b8a6" },
};

export function LeadArrivalChart() {
  const router = useRouter();
  const { dateRange } = useDashboardFilter();
  const [period, setPeriod] = useState<LeadPeriod>("month");

  const data = useMemo(() => {
    const slice = period === "week" ? 7 : period === "month" ? 30 : leadArrivalTrendData.length;
    const factor = dateRange.scaleFactor;
    return leadArrivalTrendData.slice(-slice).map((point) => ({
      ...point,
      leads: Math.max(1, Math.round(point.leads * factor)),
    }));
  }, [period, dateRange.scaleFactor]);

  return (
    <DashboardCard className="h-full">
      <DashboardCardHeader
        title="Lead Arrival Trend"
        description={`Daily lead inflow · ${dateRange.label}`}
        action={
          <Tabs value={period} onValueChange={(v) => setPeriod(v as LeadPeriod)}>
            <TabsList className="h-7 bg-slate-950/60 border border-slate-800">
              <TabsTrigger value="week" className="text-[10px] px-2 h-5">
                Week
              </TabsTrigger>
              <TabsTrigger value="month" className="text-[10px] px-2 h-5">
                Month
              </TabsTrigger>
              <TabsTrigger value="quarter" className="text-[10px] px-2 h-5">
                Quarter
              </TabsTrigger>
            </TabsList>
          </Tabs>
        }
      />
      <DashboardCardContent
        className="pt-0 cursor-pointer"
        onClick={() => router.push(`${ROUTES.REPORTS}?tab=leads&period=${period}`)}
      >
        <ChartContainer config={chartConfig} className="aspect-[16/5.5] w-full min-h-[150px] max-h-[170px]">
          <LineChart data={data} margin={{ top: 8, right: 12, left: -8, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1e293b" />
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tick={{ fill: "#64748b", fontSize: 10 }}
              interval="preserveStartEnd"
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              width={28}
              tick={{ fill: "#64748b", fontSize: 10 }}
            />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  labelFormatter={(_, payload) => payload?.[0]?.payload?.label ?? ""}
                />
              }
            />
            <Line
              type="monotone"
              dataKey="leads"
              stroke="#14b8a6"
              strokeWidth={2}
              dot={{ r: 2.5, fill: "#14b8a6", strokeWidth: 0 }}
              activeDot={{ r: 4, fill: "#2dd4bf" }}
            />
          </LineChart>
        </ChartContainer>
      </DashboardCardContent>
    </DashboardCard>
  );
}
