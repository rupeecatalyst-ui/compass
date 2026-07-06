"use client";

import Link from "next/link";
import {
  ArrowDownRight,
  ArrowUpRight,
  BadgeCheck,
  Banknote,
  ClipboardList,
  FileStack,
  IndianRupee,
  Minus,
  TrendingUp,
} from "lucide-react";
import { executiveKpis } from "@/data/catalyst-one/dashboard";
import { useDashboardFilter } from "@/hooks/use-dashboard-filter";
import { useDashboardPersona } from "@/hooks/use-dashboard-persona";
import { scaleCount, scaleCurrency, scaleLakhs } from "@/lib/dashboard-metrics";
import { cn } from "@/lib/utils";
import type { ExecutiveKpi } from "@/types/catalyst-one";

const iconMap = {
  pipeline: TrendingUp,
  files: FileStack,
  disbursed: Banknote,
  revenue: IndianRupee,
  tasks: ClipboardList,
  sanctioned: BadgeCheck,
} as const;

function resolveKpiValue(kpi: ExecutiveKpi, scaleFactor: number): string {
  if (kpi.baseValue === undefined) return kpi.value;
  switch (kpi.valueType) {
    case "currency_cr":
      return scaleCurrency(kpi.baseValue, scaleFactor);
    case "currency_l":
      return scaleLakhs(kpi.baseValue, scaleFactor);
    case "count":
      return String(scaleCount(kpi.baseValue, scaleFactor));
    default:
      return kpi.value;
  }
}

export function ExecutiveKpiGrid() {
  const { dateRange } = useDashboardFilter();
  const { config } = useDashboardPersona();

  const kpis = config.kpiIds
    .map((id) => executiveKpis.find((k) => k.id === id))
    .filter(Boolean) as ExecutiveKpi[];

  return (
    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
      {kpis.map((kpi) => {
        const Icon = iconMap[kpi.icon as keyof typeof iconMap] ?? TrendingUp;
        const displayValue = resolveKpiValue(kpi, dateRange.scaleFactor);
        const trend = kpi.trend;

        const inner = (
          <div className="rounded-xl border border-slate-800/80 bg-slate-900/50 backdrop-blur-sm px-3 py-2.5 shadow-sm transition-colors hover:border-teal-500/20 hover:bg-slate-900/70">
            <div className="flex items-center justify-between gap-2 mb-1">
              <p className="text-[10px] font-medium uppercase tracking-wide text-slate-500 truncate">
                {kpi.label}
              </p>
              <Icon className="h-3.5 w-3.5 shrink-0 text-teal-500/60" />
            </div>
            <p className="text-xl font-semibold text-slate-50 tabular-nums leading-tight">{displayValue}</p>
            {kpi.subValue && (
              <p className="text-[10px] text-slate-500 mt-0.5 truncate">{kpi.subValue}</p>
            )}
            {trend && (
              <div className="mt-1 flex items-center gap-1 text-[10px]">
                {trend.direction === "up" && <ArrowUpRight className="h-2.5 w-2.5 text-teal-500" />}
                {trend.direction === "down" && <ArrowDownRight className="h-2.5 w-2.5 text-slate-500" />}
                {trend.direction === "neutral" && <Minus className="h-2.5 w-2.5 text-slate-500" />}
                <span
                  className={cn(
                    trend.direction === "up" && "text-teal-400/90",
                    trend.direction === "down" && "text-slate-500",
                    trend.direction === "neutral" && "text-slate-500",
                  )}
                >
                  {trend.label}
                </span>
              </div>
            )}
          </div>
        );

        return kpi.href ? (
          <Link key={kpi.id} href={kpi.href} className="block">
            {inner}
          </Link>
        ) : (
          <div key={kpi.id}>{inner}</div>
        );
      })}
    </div>
  );
}
