"use client";

import { motion } from "framer-motion";
import {
  BookMarked,
  CheckCircle2,
  Clock,
  FilePen,
  FolderTree,
  Layers,
  ShieldCheck,
} from "lucide-react";
import { getPolicyLibraryDashboardMetrics } from "@/lib/credit-risk-engine/policy-store";
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

export function PolicyLibraryKpiGrid() {
  const metrics = getPolicyLibraryDashboardMetrics();

  const stats = [
    { id: "total", label: "Total Policies", value: String(metrics.totalPolicies), icon: Layers, accent: "primary" as const },
    { id: "active", label: "Active Policies", value: String(metrics.activePolicies), subValue: "Published only", icon: CheckCircle2, accent: "success" as const },
    { id: "draft", label: "Draft Policies", value: String(metrics.draftPolicies), icon: FilePen, accent: "muted" as const },
    { id: "published", label: "Published Policies", value: String(metrics.publishedPolicies), icon: BookMarked, accent: "success" as const },
    { id: "pending", label: "Pending Approval", value: String(metrics.pendingApprovalPolicies), subValue: "Approved, not published", icon: ShieldCheck, accent: "warning" as const },
    { id: "recent", label: "Recently Modified", value: String(metrics.recentlyModified), subValue: "Last 7 days", icon: Clock, accent: "accent" as const },
    { id: "categories", label: "Policy Categories", value: String(metrics.policyCategories), subValue: "Distinct products", icon: FolderTree, accent: "info" as const },
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
