"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Bot,
  ClipboardCheck,
  FileStack,
  Landmark,
  Loader2,
  PenLine,
  Users,
} from "lucide-react";
import { ORG_DOC_CATEGORIES } from "@/constants/organization-documents";
import {
  organizationDocumentCategories as seedCategories,
  organizationStorageUsage,
} from "@/data/catalyst-one/organization/dashboard";
import { listEnterpriseActivity } from "@/lib/enterprise-activity-registry";
import { organizationWorkspaceApi } from "@/lib/enterprise-organization-workspace";
import { ORG_DOCUMENTS_PERSISTENCE_REQUIRED_MESSAGE } from "@/lib/organization-documents";
import { formatRelativeTime } from "@/lib/utils";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { DocumentCategoryStat, OrganizationActivity } from "@/types/organization";

const activityConfig: Record<
  OrganizationActivity["type"],
  { icon: React.ComponentType<{ className?: string }>; color: string }
> = {
  document: { icon: FileStack, color: "bg-primary/10 text-primary border-primary/20" },
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

function mapEventType(eventType: string): OrganizationActivity["type"] {
  const t = eventType.toLowerCase();
  if (t.includes("document")) return "document";
  if (t.includes("director")) return "director";
  if (t.includes("bank")) return "bank";
  if (t.includes("signature")) return "signature";
  if (t.includes("compliance")) return "compliance";
  return "system";
}

export function OrganizationDashboardPanels() {
  const [activity, setActivity] = useState<OrganizationActivity[]>([]);
  const [categories, setCategories] = useState<DocumentCategoryStat[]>(seedCategories);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        // CO-ORG-003 — Org dashboard Recent Activity reads EAR (not org MDM fragment alone).
        const [earEvents, documents] = await Promise.all([
          listEnterpriseActivity({ limit: 20 }),
          organizationWorkspaceApi.listDocuments("active"),
        ]);
        if (cancelled) return;

        setActivity(
          earEvents.map((e) => ({
            id: e.id,
            title: e.title,
            description: e.summary ?? "",
            timestamp: e.occurredAt,
            type: mapEventType(
              typeof e.payload?.orgEventType === "string"
                ? e.payload.orgEventType
                : e.eventKind,
            ),
          })),
        );

        const counts = new Map<string, number>();
        for (const doc of documents) {
          counts.set(doc.categoryId, (counts.get(doc.categoryId) ?? 0) + 1);
        }
        const palette: DocumentCategoryStat["color"][] = [
          "primary",
          "info",
          "accent",
          "warning",
          "primary",
          "info",
        ];
        setCategories(
          ORG_DOC_CATEGORIES.map((cat, i) => ({
            id: cat.id,
            label: cat.label,
            count: counts.get(cat.id) ?? 0,
            color: palette[i % palette.length],
          })),
        );
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : ORG_DOCUMENTS_PERSISTENCE_REQUIRED_MESSAGE);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const usagePercent = Math.round(
    (organizationStorageUsage.usedGb / organizationStorageUsage.totalGb) * 100,
  );

  const maxCategoryCount = useMemo(
    () => Math.max(1, ...categories.map((c) => c.count)),
    [categories],
  );

  return (
    <div className="grid gap-6 lg:grid-cols-5">
      <Card className="glass-card border-border/60 lg:col-span-3">
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>Latest updates across organization records</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center gap-2 py-8 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading activity…
            </div>
          ) : error ? (
            <p className="text-sm text-destructive">{error}</p>
          ) : activity.length === 0 ? (
            <p className="py-8 text-sm text-muted-foreground">No recent activity recorded yet.</p>
          ) : (
            <div className="relative space-y-0">
              {activity.map((event, index) => {
                const config = activityConfig[event.type];
                const Icon = config.icon;
                const isLast = index === activity.length - 1;

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
          )}
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
            <CardDescription>Distribution across organization documents</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {categories.map((category) => (
              <div key={category.id} className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">{category.label}</span>
                  <span className="text-muted-foreground">{category.count} docs</span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className={cn("h-full rounded-full", categoryColorMap[category.color])}
                    style={{
                      width: `${Math.min(100, (category.count / maxCategoryCount) * 100)}%`,
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
