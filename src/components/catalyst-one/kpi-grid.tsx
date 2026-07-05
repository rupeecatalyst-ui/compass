"use client";

import { motion } from "framer-motion";
import {
  ArrowDownRight,
  ArrowUpRight,
  Banknote,
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  FileStack,
  IndianRupee,
  Minus,
  TrendingUp,
} from "lucide-react";
import { executiveKpis } from "@/data/catalyst-one/dashboard";
import { Card, CardContent } from "@/components/ui/card";
import { staggerContainer, staggerItem } from "@/lib/animations";
import { cn } from "@/lib/utils";

const iconMap = {
  pipeline: TrendingUp,
  files: FileStack,
  sanctioned: CheckCircle2,
  disbursed: Banknote,
  revenue: IndianRupee,
  received: IndianRupee,
  followups: CalendarClock,
  tasks: ClipboardList,
} as const;

const accentMap = {
  primary: "from-primary/15 to-primary/5 text-primary border-primary/20",
  accent: "from-accent/15 to-accent/5 text-accent border-accent/20",
  warning: "from-warning/15 to-warning/5 text-warning border-warning/20",
  info: "from-info/15 to-info/5 text-info border-info/20",
};

export function KpiGrid() {
  return (
    <motion.div
      variants={staggerContainer}
      initial="initial"
      animate="animate"
      className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"
    >
      {executiveKpis.map((kpi) => {
        const Icon = iconMap[kpi.icon as keyof typeof iconMap] ?? TrendingUp;
        const accent = accentMap[kpi.accent ?? "primary"];

        return (
          <motion.div key={kpi.id} variants={staggerItem} whileHover={{ scale: 1.01, y: -2 }}>
            <Card className="glass-card overflow-hidden border-border/60">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-2 min-w-0 flex-1">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide truncate">
                      {kpi.label}
                    </p>
                    <p className="text-2xl font-bold tracking-tight">{kpi.value}</p>
                    {kpi.subValue && (
                      <p className="text-xs text-muted-foreground">{kpi.subValue}</p>
                    )}
                  </div>
                  <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border bg-gradient-to-br", accent)}>
                    <Icon className="h-5 w-5" />
                  </div>
                </div>
                {kpi.trend && (
                  <div className="mt-3 flex items-center gap-1.5 text-xs">
                    {kpi.trend.direction === "up" && <ArrowUpRight className="h-3.5 w-3.5 text-accent" />}
                    {kpi.trend.direction === "down" && <ArrowDownRight className="h-3.5 w-3.5 text-warning" />}
                    {kpi.trend.direction === "neutral" && <Minus className="h-3.5 w-3.5 text-muted-foreground" />}
                    <span className={cn(
                      kpi.trend.direction === "up" && "text-accent",
                      kpi.trend.direction === "down" && "text-warning",
                      kpi.trend.direction === "neutral" && "text-muted-foreground",
                    )}>
                      {kpi.trend.label}
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        );
      })}
    </motion.div>
  );
}
