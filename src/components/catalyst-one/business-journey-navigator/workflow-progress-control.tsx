"use client";

import { useEffect, useId, useRef, useState } from "react";
import { ChevronDown, Route, X } from "lucide-react";
import { BusinessJourneyNavigator } from "@/components/catalyst-one/business-journey-navigator/business-journey-navigator";
import { Button } from "@/components/ui/button";
import type { ChanakyaLoanJourneyStageId } from "@/types/chanakya-guide";
import { cn } from "@/lib/utils";

export interface WorkflowProgressControlProps {
  currentStageId: ChanakyaLoanJourneyStageId;
  className?: string;
  fileId?: string | null;
  opportunityId?: string | null;
}

/**
 * Compact Workflow Progress control — replaces the permanent journey ribbon
 * on densified workspaces (Strategic Workspace, Credit Workbench).
 * Loan Workspace must not use this pattern.
 */
export function WorkflowProgressControl({
  currentStageId,
  className,
  fileId,
  opportunityId,
}: WorkflowProgressControlProps) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    const onPointer = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("mousedown", onPointer);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("mousedown", onPointer);
    };
  }, [open]);

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      <Button
        type="button"
        size="sm"
        variant="outline"
        className={cn(
          "h-7 gap-1.5 px-2.5 text-[11px] font-medium",
          open && "border-teal-500/40 bg-teal-500/10 text-teal-900 dark:text-teal-100",
        )}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((v) => !v)}
      >
        <Route className="h-3 w-3 shrink-0" aria-hidden />
        Workflow Progress
        <ChevronDown
          className={cn(
            "h-3 w-3 shrink-0 transition-transform duration-200",
            open && "rotate-180",
          )}
          aria-hidden
        />
      </Button>

      {open ? (
        <div
          id={panelId}
          role="dialog"
          aria-label="Workflow progress"
          className={cn(
            "absolute right-0 top-[calc(100%+0.4rem)] z-40 w-[min(92vw,42rem)]",
            "origin-top-right animate-in fade-in-0 zoom-in-95 duration-200",
            "overflow-hidden rounded-xl border border-border/70",
            "bg-background/98 shadow-xl shadow-black/10 backdrop-blur-md",
            "dark:bg-zinc-950/98 dark:shadow-black/40",
          )}
        >
          <div className="flex items-center justify-between gap-3 border-b border-border/60 bg-muted/30 px-3 py-2">
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                Business Journey
              </p>
              <p className="truncate text-xs font-medium text-foreground">
                Full workflow & status progression
              </p>
            </div>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-7 gap-1 px-2 text-[11px] text-muted-foreground"
              onClick={() => setOpen(false)}
            >
              <X className="h-3.5 w-3.5" aria-hidden />
              Close
            </Button>
          </div>
          <div className="max-h-[min(50vh,28rem)] overflow-x-auto overflow-y-auto p-2 sm:p-3">
            <BusinessJourneyNavigator
              currentStageId={currentStageId}
              fileId={fileId}
              opportunityId={opportunityId}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}
