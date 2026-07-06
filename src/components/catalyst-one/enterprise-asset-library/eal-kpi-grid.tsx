"use client";

import { motion } from "framer-motion";
import { Archive, Boxes, CheckCircle2, FilePen, FolderTree, Layers } from "lucide-react";
import { getEnterpriseAssetLibraryDashboardMetrics } from "@/lib/enterprise-asset-library/eal-store";
import { Card, CardContent } from "@/components/ui/card";
import { staggerContainer, staggerItem } from "@/lib/animations";
import { cn } from "@/lib/utils";

const accentMap = {
  primary: "from-primary/15 to-primary/5 text-primary border-primary/20",
  success: "from-success/15 to-success/5 text-success border-success/20",
  warning: "from-warning/15 to-warning/5 text-warning border-warning/20",
  info: "from-info/15 to-info/5 text-info border-info/20",
  muted: "from-muted/40 to-muted/10 text-muted-foreground border-border/40",
} as const;

export function EalKpiGrid() {
  const m = getEnterpriseAssetLibraryDashboardMetrics();
  const stats = [
    { id: "total", label: "Total Assets", value: String(m.totalAssets), icon: Boxes, accent: "primary" as const },
    { id: "published", label: "Published", value: String(m.publishedAssets), icon: CheckCircle2, accent: "success" as const },
    { id: "draft", label: "Draft", value: String(m.draftAssets), icon: FilePen, accent: "muted" as const },
    { id: "categories", label: "Categories", value: String(m.categoryCount), subValue: `${m.assetTypeCount} types`, icon: FolderTree, accent: "info" as const },
    { id: "types", label: "Asset Types", value: String(m.assetTypeCount), icon: Layers, accent: "info" as const },
    { id: "deprecated", label: "Deprecated", value: String(m.deprecatedAssets), icon: Archive, accent: "warning" as const },
  ];

  return (
    <motion.div variants={staggerContainer} initial="initial" animate="animate" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {stats.map((stat) => {
        const Icon = stat.icon;
        const accent = stat.accent === "muted" ? accentMap.muted : accentMap[stat.accent];
        return (
          <motion.div key={stat.id} variants={staggerItem} whileHover={{ scale: 1.01, y: -2 }}>
            <Card className="glass-card overflow-hidden border-border/60 transition-all hover:border-primary/30 hover:shadow-md">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1 space-y-2">
                    <p className="truncate text-xs font-medium uppercase tracking-wide text-muted-foreground">{stat.label}</p>
                    <p className="text-2xl font-bold tracking-tight">{stat.value}</p>
                    {stat.subValue && <p className="truncate text-xs text-muted-foreground">{stat.subValue}</p>}
                  </div>
                  <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border bg-gradient-to-br", accent)}>
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
