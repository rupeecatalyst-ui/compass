"use client";

/**
 * CO-UX-017 — Lender Pipeline (Execution) section header above the Kanban.
 */

import { Button } from "@/components/ui/button";
import { Filter, ListFilter, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

export function DealPipelineSectionHeader({
  dealCount,
  onIdentifyLender,
  onViewOptions,
  onFilters,
  className,
}: {
  dealCount: number;
  onIdentifyLender: () => void;
  onViewOptions?: () => void;
  onFilters?: () => void;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-end justify-between gap-2 border-b border-border/50 pb-2",
        className,
      )}
    >
      <div className="min-w-0">
        <h2 className="text-sm font-semibold tracking-tight text-foreground">
          Lender Pipeline (Execution)
        </h2>
        <p className="mt-0.5 text-[11px] text-muted-foreground">
          One continuous execution journey for all Enterprise Deals
          {dealCount > 0 ? ` · ${dealCount} active` : ""}.
        </p>
      </div>
      <div className="flex flex-wrap items-center justify-end gap-1.5">
        <Button
          type="button"
          size="sm"
          className="h-7 gap-1 bg-teal-700 px-2.5 text-[11px] text-white hover:bg-teal-600"
          onClick={onIdentifyLender}
        >
          <Plus className="h-3.5 w-3.5" aria-hidden />
          Identify Lender
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-7 gap-1 px-2 text-[11px]"
          onClick={onViewOptions}
        >
          <ListFilter className="h-3.5 w-3.5" aria-hidden />
          View Options
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-7 gap-1 px-2 text-[11px]"
          onClick={onFilters}
        >
          <Filter className="h-3.5 w-3.5" aria-hidden />
          Filters
        </Button>
      </div>
    </div>
  );
}
