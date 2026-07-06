"use client";

import { motion } from "framer-motion";
import { AlertTriangle, CheckCircle2, GitBranch, Layers, Scale, Shield } from "lucide-react";
import { getProductLibraryDashboardMetrics } from "@/lib/product-library/product-store";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { staggerContainer, staggerItem } from "@/lib/animations";
import { cn } from "@/lib/utils";

const accentMap = {
  success: "from-success/15 to-success/5 text-success border-success/20",
  warning: "from-warning/15 to-warning/5 text-warning border-warning/20",
  info: "from-info/15 to-info/5 text-info border-info/20",
  muted: "from-muted/40 to-muted/10 text-muted-foreground border-border/40",
} as const;

export function ProductCompositionSummary() {
  const { composition } = getProductLibraryDashboardMetrics();
  const stats = [
    { id: "complete", label: "Complete Composition", value: String(composition.productsWithCompleteComposition), icon: CheckCircle2, accent: "success" as const },
    { id: "workflow", label: "Missing Workflows", value: String(composition.productsMissingWorkflows), icon: GitBranch, accent: "muted" as const },
    { id: "policy", label: "Missing Policies", value: String(composition.productsMissingPolicies), icon: Scale, accent: "warning" as const },
    { id: "rules", label: "Missing Rules", value: String(composition.productsMissingRules), icon: AlertTriangle, accent: "warning" as const },
    { id: "assets", label: "Missing Enterprise Assets", value: String(composition.productsMissingEnterpriseAssets), icon: Shield, accent: "muted" as const },
    { id: "ready", label: "Ready for Publishing", value: String(composition.productsReadyForPublishing), icon: Layers, accent: "info" as const },
  ];

  return (
    <Card className="glass-card border-border/60">
      <CardHeader>
        <CardTitle className="text-base">Enterprise Composition Summary</CardTitle>
        <CardDescription>Read-only composition health across latest product versions. Prepared for Enterprise Asset Library (Sprint 16).</CardDescription>
      </CardHeader>
      <CardContent>
        <motion.div variants={staggerContainer} initial="initial" animate="animate" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {stats.map((stat) => {
            const Icon = stat.icon;
            const accent = accentMap[stat.accent];
            return (
              <motion.div key={stat.id} variants={staggerItem}>
                <div className="flex items-start justify-between gap-2 rounded-lg border border-border/60 p-3">
                  <div className="min-w-0 space-y-1">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{stat.label}</p>
                    <p className="text-xl font-bold tracking-tight">{stat.value}</p>
                  </div>
                  <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border bg-gradient-to-br", accent)}>
                    <Icon className="h-4 w-4" />
                  </div>
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      </CardContent>
    </Card>
  );
}
