"use client";

import { motion } from "framer-motion";
import {
  Archive,
  BookOpen,
  CheckCircle2,
  FilePen,
  Gauge,
  Layers,
  ShieldCheck,
} from "lucide-react";
import { getArchitectureMetrics } from "@/lib/atlas/atlas-store";
import { ENTERPRISE_ASSET_TYPE_LABELS } from "@/constants/atlas";
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

export function AtlasKpiGrid() {
  const metrics = getArchitectureMetrics();
  const typeCount = Object.keys(metrics.assetsByType).length;

  const stats = [
    { id: "total", label: "Total Assets", value: String(metrics.totalAssets), icon: Layers, accent: "primary" as const },
    { id: "types", label: "Assets by Type", value: String(typeCount), subValue: Object.entries(metrics.assetsByType).map(([k, v]) => `${ENTERPRISE_ASSET_TYPE_LABELS[k as keyof typeof ENTERPRISE_ASSET_TYPE_LABELS]}: ${v}`).join(" · ") || "—", icon: Layers, accent: "info" as const },
    { id: "published", label: "Published Assets", value: String(metrics.publishedAssets), subValue: "Documentation published", icon: CheckCircle2, accent: "success" as const },
    { id: "draft", label: "Draft Assets", value: String(metrics.draftAssets), icon: FilePen, accent: "muted" as const },
    { id: "deprecated", label: "Deprecated Assets", value: String(metrics.deprecatedAssets), icon: Archive, accent: "warning" as const },
    { id: "compliance", label: "Avg Compliance", value: `${metrics.averageComplianceScore}%`, icon: ShieldCheck, accent: "info" as const },
    { id: "docs", label: "Documentation Coverage", value: `${metrics.documentationCoverage}%`, icon: BookOpen, accent: "success" as const },
    { id: "perf", label: "Perf Budget Coverage", value: `${metrics.performanceBudgetCoverage}%`, subValue: "Stored only", icon: Gauge, accent: "accent" as const },
  ];

  return (
    <motion.div
      variants={staggerContainer}
      initial="initial"
      animate="animate"
      className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"
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
                      <p className="line-clamp-2 text-xs text-muted-foreground">{stat.subValue}</p>
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
