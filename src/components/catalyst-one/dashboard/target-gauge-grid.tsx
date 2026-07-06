"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Cell, Pie, PieChart } from "recharts";
import {
  TARGET_SCOPE_LABELS,
  targetGaugeByScope,
} from "@/data/catalyst-one/dashboard";
import { useDashboardFilter } from "@/hooks/use-dashboard-filter";
import { ROUTES } from "@/constants/routes";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer } from "@/components/ui/chart";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { TargetScope } from "@/types/catalyst-one";

const gaugeColors = ["hsl(var(--primary))", "hsl(var(--accent))", "hsl(var(--warning))"];

export function TargetGaugeGrid() {
  const { dateRange } = useDashboardFilter();
  const [scope, setScope] = useState<TargetScope>("ceo");

  const gauges = useMemo(() => {
    return targetGaugeByScope[scope].map((gauge) => {
      const achieved = gauge.achieved * dateRange.scaleFactor;
      const target = gauge.target * Math.max(dateRange.scaleFactor, 0.35);
      const percent = Math.min(100, Math.round((achieved / target) * 100));
      return { ...gauge, achieved, target, percent };
    });
  }, [scope, dateRange.scaleFactor]);

  return (
    <Card className="glass-card border-border/60">
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between pb-2">
        <div>
          <CardTitle>Target Achievement</CardTitle>
          <CardDescription>
            Disbursed amount vs target · {TARGET_SCOPE_LABELS[scope]}
          </CardDescription>
        </div>
        <Select value={scope} onValueChange={(value) => setScope(value as TargetScope)}>
          <SelectTrigger className="w-full sm:w-[240px] bg-background/80">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="relationship_manager">Relationship Manager</SelectItem>
            <SelectItem value="branch_head">Branch Head</SelectItem>
            <SelectItem value="ceo">CEO · Consolidated</SelectItem>
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 sm:grid-cols-3">
          {gauges.map((gauge, index) => {
            const chartData = [
              { name: "achieved", value: gauge.percent, fill: gaugeColors[index % gaugeColors.length] },
              { name: "remaining", value: 100 - gauge.percent, fill: "hsl(var(--muted))" },
            ];

            return (
              <Link
                key={gauge.id}
                href={`${ROUTES.REPORTS}?tab=targets&scope=${scope}&period=${gauge.id}`}
                className="group"
              >
                <div className="rounded-xl border border-border/60 bg-muted/10 p-4 transition-colors group-hover:border-primary/30">
                  <p className="text-sm font-medium mb-1">{gauge.label}</p>
                  <ChartContainer
                    config={{ achieved: { label: "Achieved", color: gaugeColors[index % gaugeColors.length] } }}
                    className="mx-auto aspect-square max-h-[140px]"
                  >
                    <PieChart>
                      <Pie
                        data={chartData}
                        dataKey="value"
                        nameKey="name"
                        innerRadius={42}
                        outerRadius={58}
                        startAngle={90}
                        endAngle={-270}
                        strokeWidth={0}
                      >
                        {chartData.map((entry) => (
                          <Cell key={entry.name} fill={entry.fill} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ChartContainer>
                  <div className="text-center space-y-1">
                    <p className={cn("text-2xl font-bold", gauge.percent >= 75 ? "text-accent" : "text-primary")}>
                      {gauge.percent}%
                    </p>
                    <p className="text-xs text-muted-foreground">
                      ₹{gauge.achieved.toFixed(1)} Cr / ₹{gauge.target.toFixed(1)} Cr
                    </p>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
