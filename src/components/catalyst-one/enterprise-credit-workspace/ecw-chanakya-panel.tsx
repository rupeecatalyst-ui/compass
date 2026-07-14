"use client";

import { ChanakyaAvatar, ChanakyaIdentityLabel } from "@/components/catalyst-one/chanakya-enterprise-identity";
import { getProposalButtonLabel } from "@/lib/chanakya-phase5-intelligence";
import type { ChanakyaProposalReadinessReview } from "@/types/chanakya-phase5-intelligence";
import type { LoanFileTimelineEvent } from "@/types/catalyst-one";
import { cn } from "@/lib/utils";

/**
 * Prompt 018 — Compact permanent CHANAKYA panel.
 * Primary: readiness, missing info, current recommendation.
 * Detail: expandable secondary intelligence.
 */
export function EcwChanakyaPanel({
  readiness,
  missingLabels,
  recommendations,
  recentActivities,
  actionSuggestions,
}: {
  readiness: ChanakyaProposalReadinessReview;
  missingLabels: string[];
  recommendations: string[];
  recentActivities: LoanFileTimelineEvent[];
  actionSuggestions: string[];
}) {
  const primaryRecommendation = recommendations[0] ?? readiness.conversationalPrompt;

  return (
    <aside className="flex h-full min-h-0 flex-col border-l border-border/60 bg-gradient-to-b from-violet-50/30 via-background to-background dark:from-violet-950/15 dark:via-background">
      <div className="flex h-9 shrink-0 items-center gap-2 border-b border-border/50 px-2.5">
        <ChanakyaAvatar size="sm" />
        <div className="min-w-0">
          <ChanakyaIdentityLabel surface="advisory" />
          <p className="truncate text-[10px] font-semibold leading-tight text-foreground">Credit Intelligence</p>
        </div>
      </div>

      <div className="min-h-0 flex-1 space-y-2.5 overflow-y-auto px-2.5 py-2.5 text-[11px]">
        <section className="space-y-1">
          <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            Proposal Readiness
          </p>
          <div className="rounded-md border border-violet-400/25 bg-background/80 px-2 py-1.5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-semibold tabular-nums">{readiness.completenessPct}%</span>
              <span
                className={cn(
                  "rounded-full px-1.5 py-0.5 text-[8px] font-semibold",
                  readiness.ready
                    ? "bg-emerald-500/15 text-emerald-800 dark:text-emerald-200"
                    : "bg-amber-500/15 text-amber-900 dark:text-amber-200",
                )}
              >
                {readiness.ready ? "Ready" : "Incomplete"}
              </span>
            </div>
            <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-violet-500 transition-all"
                style={{ width: `${Math.min(100, readiness.completenessPct)}%` }}
              />
            </div>
          </div>
        </section>

        <section className="space-y-1">
          <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            Missing Information
          </p>
          {missingLabels.length === 0 ? (
            <p className="text-muted-foreground">No stated-information gaps.</p>
          ) : (
            <ul className="space-y-0.5 text-muted-foreground">
              {missingLabels.slice(0, 4).map((label) => (
                <li key={label} className="truncate rounded border border-border/50 bg-muted/20 px-1.5 py-0.5">
                  {label}
                </li>
              ))}
              {missingLabels.length > 4 && (
                <li className="text-[10px] text-muted-foreground">+{missingLabels.length - 4} more</li>
              )}
            </ul>
          )}
        </section>

        <section className="space-y-1">
          <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            Current Recommendation
          </p>
          <p className="rounded-md border border-teal-500/20 bg-teal-500/5 px-2 py-1.5 leading-snug text-foreground">
            {primaryRecommendation}
          </p>
        </section>

        <details className="rounded-md border border-border/50 bg-muted/10 open:bg-muted/20">
          <summary className="cursor-pointer px-2 py-1.5 text-[10px] font-semibold text-muted-foreground hover:text-foreground">
            More guidance
          </summary>
          <div className="space-y-2 border-t border-border/40 px-2 py-2 text-muted-foreground">
            <p className="leading-snug">
              Use <span className="font-semibold text-foreground">{getProposalButtonLabel()}</span> only after
              readiness passes completeness.
            </p>
            {recommendations.slice(1).map((r) => (
              <p key={r} className="leading-snug">
                · {r}
              </p>
            ))}
          </div>
        </details>

        <details className="rounded-md border border-border/50 bg-muted/10">
          <summary className="cursor-pointer px-2 py-1.5 text-[10px] font-semibold text-muted-foreground hover:text-foreground">
            Action suggestions
          </summary>
          <ul className="space-y-1 border-t border-border/40 px-2 py-2 text-muted-foreground">
            {actionSuggestions.map((a) => (
              <li key={a} className="leading-snug">
                · {a}
              </li>
            ))}
          </ul>
        </details>

        <details className="rounded-md border border-border/50 bg-muted/10">
          <summary className="cursor-pointer px-2 py-1.5 text-[10px] font-semibold text-muted-foreground hover:text-foreground">
            Recent activities
          </summary>
          <ul className="space-y-1.5 border-t border-border/40 px-2 py-2">
            {recentActivities.slice(0, 5).map((ev) => (
              <li key={ev.id} className="border-l-2 border-teal-500/40 pl-2">
                <p className="font-medium text-foreground">{ev.title}</p>
                <p className="text-[9px] text-muted-foreground">
                  {new Date(ev.timestamp).toLocaleString("en-IN")}
                </p>
              </li>
            ))}
            {recentActivities.length === 0 && (
              <li className="text-muted-foreground">No timeline entries on this file.</li>
            )}
          </ul>
        </details>
      </div>
    </aside>
  );
}
