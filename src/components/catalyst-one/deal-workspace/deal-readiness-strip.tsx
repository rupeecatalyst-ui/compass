/**
 * CO-DWS-001 / CO-UX-022 — Single-line Deal Readiness status (warnings, not blockers).
 */
"use client";

import { useState } from "react";
import { AlertTriangle, CheckCircle2, ChevronDown, ChevronUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { DealReadinessSnapshot } from "@/types/deal-workflow-validation";

export function DealReadinessStrip({
  readiness,
  className,
  onConfigureAccounting,
}: {
  readiness: DealReadinessSnapshot;
  className?: string;
  onConfigureAccounting?: () => void;
}) {
  const attention = readiness.warnings;
  const [open, setOpen] = useState(false);

  if (!attention.length) {
    return (
      <div
        className={cn(
          "flex h-6 items-center gap-1.5 truncate text-[10px] text-muted-foreground",
          className,
        )}
        data-dws="deal-readiness-ready"
      >
        <CheckCircle2 className="h-3 w-3 shrink-0 text-emerald-600" aria-hidden />
        <span className="truncate">Deal readiness — no open warnings</span>
      </div>
    );
  }

  return (
    <div className={cn("min-w-0", className)} data-dws="deal-readiness-attention">
      <button
        type="button"
        className={cn(
          "flex h-6 w-full max-w-full items-center gap-1.5 truncate rounded px-1 text-left text-[10px]",
          "text-amber-900 hover:bg-amber-500/10 dark:text-amber-100",
        )}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <AlertTriangle className="h-3 w-3 shrink-0" aria-hidden />
        <span className="min-w-0 flex-1 truncate font-medium">
          Deal readiness · {attention.length} warning{attention.length === 1 ? "" : "s"} ·
          continue work
        </span>
        {open ? (
          <ChevronUp className="h-3 w-3 shrink-0 opacity-70" aria-hidden />
        ) : (
          <ChevronDown className="h-3 w-3 shrink-0 opacity-70" aria-hidden />
        )}
      </button>
      {open ? (
        <ul
          className="mt-1 space-y-1 rounded-md border border-amber-500/30 bg-amber-500/5 px-2 py-1.5"
          role="status"
        >
          {attention.map((item) => (
            <li
              key={item.code}
              className="flex flex-wrap items-start justify-between gap-2 text-[10px] text-foreground"
            >
              <div className="min-w-0 space-y-0.5">
                <div className="flex flex-wrap items-center gap-1.5">
                  <Badge variant="outline" className="h-4 px-1 text-[9px]">
                    {item.label}
                  </Badge>
                  <span className="text-muted-foreground">{item.message}</span>
                </div>
                {item.actionHint ? (
                  <p className="text-[9px] text-muted-foreground">{item.actionHint}</p>
                ) : null}
              </div>
              {item.categoryId === "accounting" && item.actionLabel && onConfigureAccounting ? (
                <button
                  type="button"
                  className="shrink-0 text-[10px] font-medium text-violet-700 underline-offset-2 hover:underline dark:text-violet-300"
                  onClick={onConfigureAccounting}
                >
                  {item.actionLabel}
                </button>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
