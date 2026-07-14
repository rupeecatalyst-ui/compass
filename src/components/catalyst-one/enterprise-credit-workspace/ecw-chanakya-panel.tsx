"use client";

import { ChanakyaAvatar, ChanakyaIdentityLabel } from "@/components/catalyst-one/chanakya-enterprise-identity";
import { getProposalButtonLabel } from "@/lib/chanakya-phase5-intelligence";
import type { ChanakyaProposalReadinessReview } from "@/types/chanakya-phase5-intelligence";
import type { LoanFileTimelineEvent } from "@/types/catalyst-one";
import { cn } from "@/lib/utils";

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
  return (
    <aside className="flex h-full min-h-0 flex-col border-l border-border/60 bg-gradient-to-b from-violet-50/40 via-background to-teal-50/20 dark:from-violet-950/20 dark:via-background dark:to-teal-950/10">
      <div className="border-b border-border/50 px-3 py-3">
        <div className="flex items-center gap-2.5">
          <ChanakyaAvatar size="sm" />
          <div className="min-w-0">
            <ChanakyaIdentityLabel surface="advisory" />
            <p className="truncate text-xs font-semibold text-foreground">Credit Intelligence</p>
          </div>
        </div>
      </div>

      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-3 py-3 text-xs">
        <section className="space-y-1.5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Proposal Readiness
          </p>
          <div className="rounded-lg border border-violet-400/25 bg-background/80 p-2.5">
            <div className="flex items-center justify-between gap-2">
              <span className="font-semibold tabular-nums">{readiness.completenessPct}%</span>
              <span
                className={cn(
                  "rounded-full px-2 py-0.5 text-[9px] font-semibold",
                  readiness.ready
                    ? "bg-emerald-500/15 text-emerald-800 dark:text-emerald-200"
                    : "bg-amber-500/15 text-amber-900 dark:text-amber-200",
                )}
              >
                {readiness.ready ? "Ready" : "Incomplete"}
              </span>
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-violet-500 transition-all"
                style={{ width: `${Math.min(100, readiness.completenessPct)}%` }}
              />
            </div>
            <p className="mt-2 leading-relaxed text-muted-foreground">{readiness.conversationalPrompt}</p>
          </div>
        </section>

        <section className="space-y-1.5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Intelligence
          </p>
          <ul className="space-y-1.5 text-muted-foreground">
            <li>Review Stated Information alongside uploaded statements in this workspace.</li>
            <li>
              Use <span className="font-semibold text-foreground">{getProposalButtonLabel()}</span> only after
              readiness passes completeness — never verification claims.
            </li>
          </ul>
        </section>

        <section className="space-y-1.5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Missing Information
          </p>
          {missingLabels.length === 0 ? (
            <p className="text-muted-foreground">No stated-information gaps for the readiness threshold.</p>
          ) : (
            <ul className="list-inside list-disc space-y-1 text-muted-foreground">
              {missingLabels.map((label) => (
                <li key={label}>{label}</li>
              ))}
            </ul>
          )}
        </section>

        <section className="space-y-1.5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Recommendations
          </p>
          <ul className="space-y-1.5">
            {recommendations.map((r) => (
              <li key={r} className="rounded-md border border-border/60 bg-background/70 px-2 py-1.5 text-muted-foreground">
                {r}
              </li>
            ))}
          </ul>
        </section>

        <section className="space-y-1.5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Recent Activities
          </p>
          <ul className="space-y-2">
            {recentActivities.slice(0, 5).map((ev) => (
              <li key={ev.id} className="border-l-2 border-teal-500/40 pl-2">
                <p className="font-medium text-foreground">{ev.title}</p>
                <p className="text-[10px] text-muted-foreground">
                  {new Date(ev.timestamp).toLocaleString("en-IN")}
                </p>
              </li>
            ))}
            {recentActivities.length === 0 && (
              <li className="text-muted-foreground">No timeline entries on this file.</li>
            )}
          </ul>
        </section>

        <section className="space-y-1.5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Action Suggestions
          </p>
          <ul className="space-y-1.5">
            {actionSuggestions.map((a) => (
              <li key={a} className="rounded-md bg-teal-500/10 px-2 py-1.5 text-teal-950 dark:text-teal-100">
                {a}
              </li>
            ))}
          </ul>
        </section>
      </div>
    </aside>
  );
}
