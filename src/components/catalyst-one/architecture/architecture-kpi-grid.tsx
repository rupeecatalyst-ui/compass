"use client";

import { motion } from "framer-motion";
import {
  Activity,
  AlertTriangle,
  BookOpen,
  CheckCircle2,
  ClipboardCheck,
  Database,
  Gauge,
  Layers,
} from "lucide-react";
import { getArchitectureDashboardMetrics } from "@/lib/enterprise-architecture/registry-store";
import { Card, CardContent } from "@/components/ui/card";
import { staggerContainer, staggerItem } from "@/lib/animations";
import { cn } from "@/lib/utils";

const accentMap = {
  primary: "from-primary/15 to-primary/5 text-primary border-primary/20",
  success: "from-success/15 to-success/5 text-success border-success/20",
  warning: "from-warning/15 to-warning/5 text-warning border-warning/20",
  error: "from-destructive/15 to-destructive/5 text-destructive border-destructive/20",
  info: "from-info/15 to-info/5 text-info border-info/20",
  accent: "from-accent/15 to-accent/5 text-accent border-accent/20",
  muted: "from-muted/40 to-muted/10 text-muted-foreground border-border/40",
} as const;

export function ArchitectureKpiGrid() {
  const metrics = getArchitectureDashboardMetrics();

  const stats = [
    { id: "total", label: "Total Artifacts", value: String(metrics.totalArtifacts), icon: Layers, accent: "primary" as const },
    { id: "active", label: "Active Artifacts", value: String(metrics.activeArtifacts), icon: CheckCircle2, accent: "success" as const },
    { id: "compliance", label: "Avg Compliance", value: `${metrics.averageComplianceScore}%`, subValue: "Design-time score", icon: ClipboardCheck, accent: "info" as const },
    { id: "docs", label: "Docs Published", value: String(metrics.documentationPublished), icon: BookOpen, accent: "success" as const },
    { id: "budgets", label: "Perf Budgets", value: String(metrics.performanceBudgetsDefined), subValue: "Stored only", icon: Gauge, accent: "accent" as const },
    { id: "fails", label: "Compliance Fails", value: String(metrics.complianceFailures), icon: AlertTriangle, accent: "error" as const },
    { id: "warns", label: "Compliance Warnings", value: String(metrics.complianceWarnings), icon: AlertTriangle, accent: "warning" as const },
    { id: "health", label: "Health Score", value: `${metrics.healthScore}%`, subValue: "CARB composite", icon: Activity, accent: "primary" as const },
    { id: "registry", label: "Registry Entries", value: String(metrics.totalArtifacts), subValue: "Catalog only", icon: Database, accent: "muted" as const },
  ];

  return (
    <motion.div
      variants={staggerContainer}
      initial="initial"
      animate="animate"
      className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3"
    >
      {stats.map((stat) => {
        const Icon = stat.icon;
        const accent =
          stat.accent === "muted"
            ? accentMap.muted
            : accentMap[stat.accent as keyof typeof accentMap] ?? accentMap.primary;

        return (
          <motion.div key={stat.id} variants={staggerItem} whileHover={{ scale: 1.01, y: -2 }}>
            <Card className="glass-card overflow-hidden border-border/60 transition-all hover:border-primary/30 hover:shadow-md">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1 space-y-2">
                    <p className="truncate text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      {stat.label}
                    </p>
                    <p className="text-2xl font-bold tracking-tight">{stat.value}</p>
                    {stat.subValue && (
                      <p className="truncate text-xs text-muted-foreground">{stat.subValue}</p>
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
              </CardContent>
            </Card>
          </motion.div>
        );
      })}
    </motion.div>
  );
}
