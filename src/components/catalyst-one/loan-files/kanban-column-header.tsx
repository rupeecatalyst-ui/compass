"use client";

import { AlertTriangle, Clock, IndianRupee } from "lucide-react";
import { STAGE_COLORS } from "@/constants/loan-pipeline";
import { formatINRCompact } from "@/lib/format-currency";
import { cn } from "@/lib/utils";
import type { LoanFileColumnStats } from "@/types/catalyst-one";

interface KanbanColumnHeaderProps {
  stats: LoanFileColumnStats;
  isDragOver?: boolean;
}

export function KanbanColumnHeader({ stats, isDragOver }: KanbanColumnHeaderProps) {
  const color = STAGE_COLORS[stats.stage];

  return (
    <div
      className={cn(
        "rounded-t-xl border border-b-0 bg-card/80 backdrop-blur-sm p-3 transition-colors",
        isDragOver && "border-primary/50 bg-primary/5",
      )}
      style={{ borderTopWidth: 3, borderTopColor: color }}
    >
      <div className="flex items-center justify-between gap-2 mb-2">
        <h3 className="text-sm font-semibold truncate">{stats.label}</h3>
        <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-primary/10 px-2 text-xs font-bold text-primary">
          {stats.count}
        </span>
      </div>
      <div className="flex items-center gap-1 text-xs text-muted-foreground mb-2">
        <IndianRupee className="h-3 w-3" />
        <span>{formatINRCompact(stats.totalValue)}</span>
      </div>
      <div className="flex gap-2">
        {stats.urgentCount > 0 && (
          <span className="inline-flex items-center gap-0.5 rounded-md bg-destructive/10 px-1.5 py-0.5 text-[10px] font-medium text-destructive">
            <AlertTriangle className="h-2.5 w-2.5" />
            {stats.urgentCount}
          </span>
        )}
        {stats.delayedCount > 0 && (
          <span className="inline-flex items-center gap-0.5 rounded-md bg-warning/10 px-1.5 py-0.5 text-[10px] font-medium text-warning">
            <Clock className="h-2.5 w-2.5" />
            {stats.delayedCount}
          </span>
        )}
      </div>
    </div>
  );
}
