"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";
import { loginTrendData } from "@/data/catalyst-one/dashboard";
import { useDashboardFilter } from "@/hooks/use-dashboard-filter";
import { ROUTES } from "@/constants/routes";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { LoginTrendPeriod } from "@/types/catalyst-one";

const chartConfig = {
  logins: { label: "Daily Logins", color: "hsl(var(--primary))" },
};

export function LoginTrendChart() {
  const router = useRouter();
  const { dateRange } = useDashboardFilter();
  const [period, setPeriod] = useState<LoginTrendPeriod>("week");

  const data = useMemo(() => {
    const base = loginTrendData[period];
    const factor = dateRange.scaleFactor;
    return base.map((point) => ({
      ...point,
      logins: Math.max(1, Math.round(point.logins * factor)),
    }));
  }, [period, dateRange.scaleFactor]);

  return (
    <Card className="glass-card border-border/60">
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between pb-2">
        <div>
          <CardTitle>Login Trend</CardTitle>
          <CardDescription>Daily login count · {dateRange.label}</CardDescription>
        </div>
        <Tabs value={period} onValueChange={(v) => setPeriod(v as LoginTrendPeriod)}>
          <TabsList className="h-8">
            <TabsTrigger value="week" className="text-xs px-2.5">
              Week
            </TabsTrigger>
            <TabsTrigger value="month" className="text-xs px-2.5">
              Month
            </TabsTrigger>
            <TabsTrigger value="quarter" className="text-xs px-2.5">
              Quarter
            </TabsTrigger>
            <TabsTrigger value="year" className="text-xs px-2.5">
              Year
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </CardHeader>
      <CardContent
        className="cursor-pointer"
        onClick={() => router.push(`${ROUTES.REPORTS}?tab=logins&period=${period}`)}
      >
          <ChartContainer config={chartConfig} className="aspect-[16/7] w-full">
            <LineChart data={data} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} />
              <YAxis tickLine={false} axisLine={false} tickMargin={8} width={32} />
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    labelFormatter={(_, payload) => payload?.[0]?.payload?.label ?? ""}
                  />
                }
              />
              <Line
                type="monotone"
                dataKey="logins"
                stroke="var(--color-logins)"
                strokeWidth={2.5}
                dot={{ r: 3, fill: "var(--color-logins)" }}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ChartContainer>
      </CardContent>
    </Card>
  );
}
