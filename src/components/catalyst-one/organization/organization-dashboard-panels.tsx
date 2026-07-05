"use client";

import { motion } from "framer-motion";
import {
  Bot,
  ClipboardCheck,
  FileText,
  Landmark,
  PenLine,
  Users,
} from "lucide-react";
import {
  organizationDocumentCategories,
  organizationRecentActivity,
  organizationStorageUsage,
} from "@/data/catalyst-one/organization/dashboard";
import { formatRelativeTime } from "@/lib/utils";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { OrganizationActivity } from "@/types/organization";

const activityConfig: Record<
  OrganizationActivity["type"],
  { icon: React.ComponentType<{ className?: string }>; color: string }
> = {
  document: { icon: FileText, color: "bg-primary/10 text-primary border-primary/20" },
  director: { icon: Users, color: "bg-info/10 text-info border-info/20" },
  bank: { icon: Landmark, color: "bg-accent/10 text-accent border-accent/20" },
  signature: { icon: PenLine, color: "bg-warning/10 text-warning border-warning/20" },
  compliance: { icon: ClipboardCheck, color: "bg-info/10 text-info border-info/20" },
  system: { icon: Bot, color: "bg-muted text-muted-foreground border-border" },
};

const categoryColorMap = {
  primary: "bg-primary",
  accent: "bg-accent",
  info: "bg-info",
  warning: "bg-warning",
};

export function OrganizationDashboardPanels() {
  const usagePercent = Math.round(
    (organizationStorageUsage.usedGb / organizationStorageUsage.totalGb) * 100,
  );

  return (
    <div className="grid gap-6 lg:grid-cols-5">
      <Card className="glass-card border-border/60 lg:col-span-3">
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>Latest updates across organization records</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="relative space-y-0">
            {organizationRecentActivity.map((event, index) => {
              const config = activityConfig[event.type];
              const Icon = config.icon;
              const isLast = index === organizationRecentActivity.length - 1;

              return (
                <motion.div
                  key={event.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="relative flex gap-4 pb-8 last:pb-0"
                >
                  {!isLast && (
                    <div className="absolute left-[19px] top-10 bottom-0 w-px bg-border" />
                  )}
                  <div
                    className={cn(
                      "relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border",
                      config.color,
                    )}
                  >
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1 pt-1">
                    <p className="text-sm font-medium">{event.title}</p>
                    <p className="text-sm text-muted-foreground">{event.description}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {formatRelativeTime(event.timestamp)}
                    </p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <div className="space-y-6 lg:col-span-2">
        <Card className="glass-card border-border/60">
          <CardHeader>
            <CardTitle>Storage Usage</CardTitle>
            <CardDescription>{organizationStorageUsage.label}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-end justify-between">
              <div>
                <p className="text-3xl font-bold tracking-tight">
                  {organizationStorageUsage.usedGb} GB
                </p>
                <p className="text-sm text-muted-foreground">
                  of {organizationStorageUsage.totalGb} GB used
                </p>
              </div>
              <span className="text-sm font-medium text-primary">{usagePercent}%</span>
            </div>
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-gradient-to-r from-primary to-accent transition-all"
                style={{ width: `${usagePercent}%` }}
              />
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card border-border/60">
          <CardHeader>
            <CardTitle>Document Categories</CardTitle>
            <CardDescription>Distribution across corporate repository</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {organizationDocumentCategories.map((category) => (
              <div key={category.id} className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">{category.label}</span>
                  <span className="text-muted-foreground">{category.count} docs</span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className={cn("h-full rounded-full", categoryColorMap[category.color])}
                    style={{
                      width: `${Math.min(100, (category.count / 12) * 100)}%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
