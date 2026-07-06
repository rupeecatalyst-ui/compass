"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  Building2,
  Clock,
  FileCheck2,
  FilePen,
  GitBranch,
  Library,
  ShieldCheck,
} from "lucide-react";
import { ROUTES } from "@/constants/routes";
import { getCreditRiskDashboardMetrics } from "@/lib/credit-risk-engine/policy-store";
import { Card, CardContent } from "@/components/ui/card";
import { staggerContainer, staggerItem } from "@/lib/animations";
import { cn } from "@/lib/utils";

const accentMap = {
  primary: "from-primary/15 to-primary/5 text-primary border-primary/20",
  accent: "from-accent/15 to-accent/5 text-accent border-accent/20",
  warning: "from-warning/15 to-warning/5 text-warning border-warning/20",
  info: "from-info/15 to-info/5 text-info border-info/20",
  success: "from-success/15 to-success/5 text-success border-success/20",
} as const;

export function CreditRiskOverviewKpiGrid() {
  const metrics = getCreditRiskDashboardMetrics();

  const stats = [
    {
      id: "active-lenders",
      label: "Active Lenders",
      value: String(metrics.activeLenders),
      icon: Building2,
      accent: "primary" as const,
      href: ROUTES.ADMIN_CREDIT_RISK_LENDERS,
    },
    {
      id: "active-policies",
      label: "Active Policies",
      value: String(metrics.activePolicies),
      subValue: "Published only",
      icon: ShieldCheck,
      accent: "success" as const,
      href: ROUTES.ADMIN_CREDIT_RISK_POLICY_LIBRARY,
    },
    {
      id: "draft-policies",
      label: "Draft Policies",
      value: String(metrics.draftPolicies),
      icon: FilePen,
      accent: "muted" as const,
      href: ROUTES.ADMIN_CREDIT_RISK_POLICY_LIBRARY,
    },
    {
      id: "published-policies",
      label: "Published Policies",
      value: String(metrics.publishedPolicies),
      icon: FileCheck2,
      accent: "success" as const,
      href: ROUTES.ADMIN_CREDIT_RISK_POLICY_LIBRARY,
    },
    {
      id: "pending-approval",
      label: "Policies Pending Approval",
      value: String(metrics.pendingApprovalPolicies),
      icon: Library,
      accent: "warning" as const,
      href: ROUTES.ADMIN_CREDIT_RISK_POLICY_LIBRARY,
    },
    {
      id: "latest-version",
      label: "Latest Published Version",
      value: metrics.latestPublishedVersion.split(" · ")[1] ?? "—",
      subValue: metrics.latestPublishedVersion.split(" · ")[0],
      icon: GitBranch,
      accent: "info" as const,
      href: ROUTES.ADMIN_CREDIT_RISK_VERSION_HISTORY,
    },
    {
      id: "recently-modified",
      label: "Recently Modified",
      value: String(metrics.recentlyModifiedCount),
      subValue: "Last 7 days",
      icon: Clock,
      accent: "accent" as const,
      href: ROUTES.ADMIN_CREDIT_RISK_AUDIT_TRAIL,
    },
  ];

  return (
    <motion.div
      variants={staggerContainer}
      initial="initial"
      animate="animate"
      className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4"
    >
      {stats.map((stat) => {
        const Icon = stat.icon;
        const accent =
          stat.accent === "muted"
            ? "from-muted/40 to-muted/10 text-muted-foreground border-border/40"
            : accentMap[stat.accent as keyof typeof accentMap] ?? accentMap.primary;

        return (
          <motion.div key={stat.id} variants={staggerItem} whileHover={{ scale: 1.01, y: -2 }}>
            <Link href={stat.href} className="block">
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
            </Link>
          </motion.div>
        );
      })}
    </motion.div>
  );
}
