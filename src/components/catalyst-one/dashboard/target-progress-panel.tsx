"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { targetProgressByScope } from "@/data/catalyst-one/dashboard";
import { useDashboardFilter } from "@/hooks/use-dashboard-filter";
import { ROUTES } from "@/constants/routes";
import { cn } from "@/lib/utils";
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

const barColors = ["#14b8a6", "#f59e0b", "#3b82f6"];

export function TargetProgressPanel() {
  const { dateRange } = useDashboardFilter();
  const [scope, setScope] = useState<TargetScope>("ceo");

  const targets = useMemo(() => {
    return targetProgressByScope[scope].map((item, index) => {
      const achieved = item.achieved * dateRange.scaleFactor;
      const target = item.target * Math.max(dateRange.scaleFactor, 0.35);
      const projected = item.projected * dateRange.scaleFactor;
      const remaining = Math.max(0, target - achieved);
      const percent = Math.min(100, Math.round((achieved / target) * 100));
      const projectedPercent = Math.min(100, Math.round((projected / target) * 100));
      return { ...item, achieved, target, projected, remaining, percent, projectedPercent, color: barColors[index] };
    });
  }, [scope, dateRange.scaleFactor]);

  return (
    <DashboardCard>
      <DashboardCardHeader
        title="Target Achievement"
        description="Disbursal goals — achieved vs remaining"
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
      <DashboardCardContent className="pt-0 space-y-4">
        {targets.map((item) => (
          <Link
            key={item.id}
            href={`${ROUTES.REPORTS}?tab=targets&scope=${scope}&period=${item.id}`}
            className="block rounded-lg border border-slate-800/80 bg-slate-950/20 px-3 py-3 transition-colors hover:border-slate-700"
          >
            <div className="flex items-center justify-between gap-2 mb-2">
              <p className="text-xs font-medium text-slate-200">{item.label}</p>
              <p className="text-sm font-semibold text-slate-100 tabular-nums">{item.percent}%</p>
            </div>
            <div className="relative h-2 w-full rounded-full bg-slate-800 overflow-hidden">
              <div
                className="absolute inset-y-0 left-0 rounded-full transition-all"
                style={{ width: `${item.percent}%`, backgroundColor: item.color }}
              />
              <div
                className="absolute inset-y-0 left-0 rounded-full opacity-30 border-r border-dashed border-white/20"
                style={{ width: `${item.projectedPercent}%` }}
              />
            </div>
            <div className="mt-2 grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px]">
              <div>
                <p className="text-slate-500">Target</p>
                <p className="text-slate-300 tabular-nums font-medium">₹{item.target.toFixed(1)} Cr</p>
              </div>
              <div>
                <p className="text-slate-500">Achieved</p>
                <p className="text-teal-400 tabular-nums font-medium">₹{item.achieved.toFixed(1)} Cr</p>
              </div>
              <div>
                <p className="text-slate-500">Remaining</p>
                <p className="text-slate-300 tabular-nums font-medium">₹{item.remaining.toFixed(1)} Cr</p>
              </div>
              <div>
                <p className="text-slate-500">Projected</p>
                <p className={cn("tabular-nums font-medium", item.projectedPercent >= 90 ? "text-teal-400" : "text-amber-400")}>
                  ₹{item.projected.toFixed(1)} Cr
                </p>
              </div>
            </div>
          </Link>
        ))}
      </DashboardCardContent>
    </DashboardCard>
  );
}
