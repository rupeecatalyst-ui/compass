"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowDownRight,
  ArrowUpRight,
  Banknote,
  ClipboardCheck,
  ClipboardList,
  FileStack,
  IndianRupee,
  Minus,
  TrendingUp,
} from "lucide-react";
import { executiveKpis } from "@/data/catalyst-one/dashboard";
import { useDashboardFilter } from "@/hooks/use-dashboard-filter";
import { scaleCount, scaleCurrency, scaleLakhs } from "@/lib/dashboard-metrics";
import { Card, CardContent } from "@/components/ui/card";
import { staggerContainer, staggerItem } from "@/lib/animations";
import { cn } from "@/lib/utils";
import type { ExecutiveKpi } from "@/types/catalyst-one";

const iconMap = {
  pipeline: TrendingUp,
  files: FileStack,
  disbursed: Banknote,
  revenue: IndianRupee,
  tasks: ClipboardList,
  compliance: ClipboardCheck,
} as const;

const accentMap = {
  primary: "from-primary/15 to-primary/5 text-primary border-primary/20",
  accent: "from-accent/15 to-accent/5 text-accent border-accent/20",
  warning: "from-warning/15 to-warning/5 text-warning border-warning/20",
  info: "from-info/15 to-info/5 text-info border-info/20",
};

function resolveKpiValue(kpi: ExecutiveKpi, scaleFactor: number): string {
  if (kpi.placeholder || kpi.baseValue === undefined) return kpi.value;
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

export function KpiGrid() {
  const { dateRange } = useDashboardFilter();

  return (
    <motion.div
      variants={staggerContainer}
      initial="initial"
      animate="animate"
      className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6"
    >
      {executiveKpis.map((kpi) => {
        const Icon = iconMap[kpi.icon as keyof typeof iconMap] ?? TrendingUp;
        const accent = accentMap[kpi.accent ?? "primary"];
        const displayValue = resolveKpiValue(kpi, dateRange.scaleFactor);
        const clickable = Boolean(kpi.href) && !kpi.placeholder;

        const card = (
          <Card
            className={cn(
              "glass-card overflow-hidden border-border/60 transition-all",
              clickable && "cursor-pointer hover:border-primary/40 hover:shadow-md",
              kpi.placeholder && "opacity-90",
            )}
          >
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="space-y-2 min-w-0 flex-1">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide truncate">
                    {kpi.label}
                  </p>
                  <p className="text-2xl font-bold tracking-tight">{displayValue}</p>
                  {kpi.subValue && (
                    <p className="text-xs text-muted-foreground">{kpi.subValue}</p>
                  )}
                </div>
                <div
                  className={cn(
                    "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border bg-gradient-to-br",
                    accent,
                  )}
                >
                  <Icon className="h-5 w-5" />
                </div>
              </div>
              {kpi.trend && (
                <div className="mt-3 flex items-center gap-1.5 text-xs">
                  {kpi.trend.direction === "up" && (
                    <ArrowUpRight className="h-3.5 w-3.5 text-accent" />
                  )}
                  {kpi.trend.direction === "down" && (
                    <ArrowDownRight className="h-3.5 w-3.5 text-warning" />
                  )}
                  {kpi.trend.direction === "neutral" && (
                    <Minus className="h-3.5 w-3.5 text-muted-foreground" />
                  )}
                  <span
                    className={cn(
                      kpi.trend.direction === "up" && "text-accent",
                      kpi.trend.direction === "down" && "text-warning",
                      kpi.trend.direction === "neutral" && "text-muted-foreground",
                    )}
                  >
                    {kpi.trend.label}
                  </span>
                </div>
              )}
            </CardContent>
          </Card>
        );

        return (
          <motion.div
            key={kpi.id}
            variants={staggerItem}
            whileHover={clickable ? { scale: 1.01, y: -2 } : undefined}
          >
            {clickable && kpi.href ? (
              <Link href={kpi.href} className="block">
                {card}
              </Link>
            ) : (
              card
            )}
          </motion.div>
        );
      })}
    </motion.div>
  );
}
