"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Cell, Pie, PieChart } from "recharts";
import { targetGaugeByScope, targetProgressByScope } from "@/data/catalyst-one/dashboard";
import { useDashboardFilter } from "@/hooks/use-dashboard-filter";
import { ROUTES } from "@/constants/routes";
import { ChartContainer } from "@/components/ui/chart";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DashboardCard,
  DashboardCardContent,
  DashboardCardHeader,
} from "@/components/catalyst-one/dashboard/dashboard-card";
import type { TargetScope } from "@/types/catalyst-one";

const gaugeColors = ["#14b8a6", "#f59e0b", "#3b82f6"];

export function TargetAchievementPanel() {
  const { dateRange } = useDashboardFilter();
  const [scope, setScope] = useState<TargetScope>("ceo");

  const gauges = useMemo(() => {
    return targetGaugeByScope[scope].map((gauge, index) => {
      const progress = targetProgressByScope[scope].find((p) => p.id === gauge.id);
      const achieved = gauge.achieved * dateRange.scaleFactor;
      const target = gauge.target * Math.max(dateRange.scaleFactor, 0.35);
      const projected = (progress?.projected ?? gauge.achieved) * dateRange.scaleFactor;
      const remaining = Math.max(0, target - achieved);
      const percent = Math.min(100, Math.round((achieved / target) * 100));
      return { ...gauge, achieved, target, projected, remaining, percent, color: gaugeColors[index] };
    });
  }, [scope, dateRange.scaleFactor]);

  return (
    <DashboardCard>
      <DashboardCardHeader
        title="Target Achievement"
        description="Monthly · Quarterly · Yearly disbursal goals"
        action={
          <Select value={scope} onValueChange={(v) => setScope(v as TargetScope)}>
            <SelectTrigger className="h-7 w-[120px] text-[10px] bg-slate-950 border-slate-700">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="relationship_manager">RM</SelectItem>
              <SelectItem value="branch_head">Branch</SelectItem>
              <SelectItem value="ceo">Company</SelectItem>
            </SelectContent>
          </Select>
        }
      />
      <DashboardCardContent className="pt-0">
        <div className="grid gap-2 sm:grid-cols-3">
          {gauges.map((gauge, index) => {
            const chartData = [
              { name: "achieved", value: gauge.percent, fill: gauge.color },
              { name: "remaining", value: 100 - gauge.percent, fill: "#1e293b" },
            ];

            return (
              <Link
                key={gauge.id}
                href={`${ROUTES.REPORTS}?tab=targets&scope=${scope}&period=${gauge.id}`}
                className="rounded-lg border border-slate-800/80 bg-slate-950/20 px-3 py-2 transition-colors hover:border-slate-700"
              >
                <p className="text-[10px] text-slate-400 mb-1">{gauge.label}</p>
                <ChartContainer
                  config={{ achieved: { label: "Achieved", color: gauge.color } }}
                  className="mx-auto h-[88px] w-full aspect-auto"
                >
                  <PieChart>
                    <Pie
                      data={chartData}
                      dataKey="value"
                      innerRadius={28}
                      outerRadius={40}
                      startAngle={90}
                      endAngle={-270}
                      strokeWidth={0}
                      animationDuration={500}
                      animationBegin={index * 100}
                    >
                      {chartData.map((entry) => (
                        <Cell key={entry.name} fill={entry.fill} />
                      ))}
                    </Pie>
                  </PieChart>
                </ChartContainer>
                <div className="text-center mt-0.5">
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-lg font-semibold text-slate-100 tabular-nums"
                  >
                    {gauge.percent}%
                  </motion.p>
                  <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 mt-1.5 text-[9px] text-left">
                    <div>
                      <p className="text-slate-600">Target</p>
                      <p className="text-slate-400 tabular-nums">₹{gauge.target.toFixed(1)} Cr</p>
                    </div>
                    <div>
                      <p className="text-slate-600">Achieved</p>
                      <p className="text-teal-400 tabular-nums">₹{gauge.achieved.toFixed(1)} Cr</p>
                    </div>
                    <div>
                      <p className="text-slate-600">Remaining</p>
                      <p className="text-slate-400 tabular-nums">₹{gauge.remaining.toFixed(1)} Cr</p>
                    </div>
                    <div>
                      <p className="text-slate-600">Projected</p>
                      <p className="text-amber-400/90 tabular-nums">₹{gauge.projected.toFixed(1)} Cr</p>
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </DashboardCardContent>
    </DashboardCard>
  );
}
