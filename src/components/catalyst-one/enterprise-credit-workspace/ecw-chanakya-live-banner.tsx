"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { ChanakyaAvatar, ChanakyaIdentityLabel } from "@/components/catalyst-one/chanakya-enterprise-identity";
import type { ChanakyaProposalReadinessReview } from "@/types/chanakya-phase5-intelligence";
import { cn } from "@/lib/utils";

/**
 * Credit Workbench — Chanakya Live Assistant (horizontal banner).
 * Does not permanently occupy the document desk.
 */
export function EcwChanakyaLiveBanner({
  readiness,
  missingLabels,
  recommendations,
}: {
  readiness: ChanakyaProposalReadinessReview;
  missingLabels: string[];
  recommendations: string[];
}) {
  const [expanded, setExpanded] = useState(false);
  const primary =
    recommendations[0] ??
    (missingLabels[0]
      ? `Missing information: ${missingLabels[0]}.`
      : readiness.conversationalPrompt);

  return (
    <div className="shrink-0 border-b border-violet-500/20 bg-gradient-to-r from-violet-500/10 via-background to-teal-500/5">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center gap-3 px-3 py-2 text-left transition-colors hover:bg-violet-500/5 sm:px-4"
      >
        <ChanakyaAvatar size="sm" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <ChanakyaIdentityLabel surface="advisory" />
            <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              Live Assistant
            </span>
            <span
              className={cn(
                "rounded-full px-1.5 py-0.5 text-[8px] font-semibold",
                readiness.ready
                  ? "bg-emerald-500/15 text-emerald-800 dark:text-emerald-200"
                  : "bg-amber-500/15 text-amber-900 dark:text-amber-200",
              )}
            >
              Readiness {readiness.completenessPct}%
            </span>
          </div>
          <p className="mt-0.5 truncate text-xs text-foreground">{primary}</p>
        </div>
        {expanded ? (
          <ChevronUp className="h-4 w-4 shrink-0 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
        )}
      </button>
      {expanded && (
        <div className="animate-in fade-in-0 slide-in-from-top-1 border-t border-border/40 px-3 py-3 text-xs sm:px-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-lg border border-border/60 bg-background/80 px-2.5 py-2">
              <p className="text-[9px] font-semibold uppercase tracking-wide text-muted-foreground">
                Recommendation
              </p>
              <p className="mt-1 leading-snug text-foreground">{primary}</p>
            </div>
            <div className="rounded-lg border border-border/60 bg-background/80 px-2.5 py-2">
              <p className="text-[9px] font-semibold uppercase tracking-wide text-muted-foreground">
                Missing Information
              </p>
              {missingLabels.length === 0 ? (
                <p className="mt-1 text-muted-foreground">No stated-information gaps.</p>
              ) : (
                <ul className="mt-1 space-y-0.5 text-muted-foreground">
                  {missingLabels.slice(0, 4).map((m) => (
                    <li key={m}>· {m}</li>
                  ))}
                </ul>
              )}
            </div>
            <div className="rounded-lg border border-border/60 bg-background/80 px-2.5 py-2">
              <p className="text-[9px] font-semibold uppercase tracking-wide text-muted-foreground">
                Next guidance
              </p>
              <ul className="mt-1 space-y-0.5 text-muted-foreground">
                {recommendations.slice(0, 3).map((r) => (
                  <li key={r}>· {r}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
