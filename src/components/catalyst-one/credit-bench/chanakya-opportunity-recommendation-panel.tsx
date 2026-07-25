"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, Sparkles, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  deriveChanakyaOpportunityRecommendations,
  type ChanakyaRecommendationSection,
} from "@/lib/chanakya-opportunity-recommendations";
import type { EcwStatedInformationDraft } from "@/types/enterprise-credit-workspace";
import type { LoanFile } from "@/types/catalyst-one";
import { cn } from "@/lib/utils";

function Stars({ count }: { count: number }) {
  const n = Math.max(1, Math.min(5, Math.round(count)));
  return (
    <span className="tracking-tight text-amber-600 dark:text-amber-400" aria-label={`${n} of 5 stars`}>
      {"★".repeat(n)}
      <span className="text-muted-foreground/40">{"☆".repeat(5 - n)}</span>
    </span>
  );
}

/**
 * BAT #10 / #21 — Interactive Chanakya lender recommendations for Opportunity Setup.
 * Uses the canonical recommendation engine only — no parallel calculators.
 */
export function ChanakyaOpportunityRecommendationPanel({
  file,
  stated,
  onNavigateSection,
}: {
  file: LoanFile;
  stated: EcwStatedInformationDraft;
  /** One-click jump to the Opportunity Setup section that owns a missing field. */
  onNavigateSection?: (section: ChanakyaRecommendationSection) => void;
}) {
  const result = useMemo(
    () => deriveChanakyaOpportunityRecommendations({ file, stated }),
    [file, stated],
  );

  /** Case 1: checklist appears after Generate Now; Case 2: auto-show when ready. */
  const [checklistRevealed, setChecklistRevealed] = useState(false);

  useEffect(() => {
    if (result.ready) setChecklistRevealed(false);
  }, [result.ready]);

  const showChecklist =
    !result.ready &&
    checklistRevealed &&
    result.missingRequirements.length > 0;

  return (
    <section className="rounded-2xl border border-border/70 bg-card/90 p-4 shadow-sm">
      <div className="flex items-start gap-2.5">
        <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-teal-600/15 text-teal-800 dark:text-teal-200">
          <Sparkles className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-semibold text-foreground">Chanakya Recommendation</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            AI-assisted lender ranking from Opportunity information. Advisory only — Credit &amp;
            Risk / Lender Policy engines will refine this further.
          </p>
        </div>
      </div>

      <div className="mt-4 space-y-3">
        {result.ready &&
          result.recommendations.map((row) => (
            <article
              key={`${row.rank}-${row.lenderName}`}
              className={cn(
                "rounded-xl border border-border/70 bg-muted/15 px-3.5 py-3",
                row.rank === 1 && "border-teal-500/35 bg-teal-500/5",
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-start gap-2">
                  <span
                    className={cn(
                      "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full",
                      row.rank === 1
                        ? "bg-teal-600 text-white"
                        : "bg-muted text-muted-foreground",
                    )}
                    aria-hidden
                  >
                    <Check className="h-3 w-3" />
                  </span>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Stars count={row.stars} />
                      <h3 className="text-sm font-semibold text-foreground">{row.lenderName}</h3>
                      <span className="rounded-md border border-border/60 bg-background/80 px-1.5 py-px text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                        Score {row.score}
                      </span>
                    </div>
                    <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
                      {row.reason}
                    </p>
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Confidence
                  </p>
                  <p className="text-sm font-semibold tabular-nums text-teal-800 dark:text-teal-200">
                    {row.confidencePct}%
                  </p>
                </div>
              </div>
            </article>
          ))}

        {!result.ready && !showChecklist && (
          <div className="rounded-xl border border-amber-500/25 bg-amber-500/5 px-3.5 py-4">
            <p className="text-xs font-medium text-foreground">
              Chanakya needs a few more Opportunity details before recommending lenders.
            </p>
            <p className="mt-1.5 text-[11px] leading-relaxed text-muted-foreground">
              Generate Now analyses this Opportunity and lists exactly what is missing — then jump
              straight to each section to complete it.
            </p>
            <Button
              type="button"
              size="sm"
              className="mt-3 h-9 gap-1.5 bg-teal-700 text-white hover:bg-teal-600"
              onClick={() => setChecklistRevealed(true)}
            >
              <Sparkles className="h-3.5 w-3.5" />
              Generate Now
            </Button>
          </div>
        )}

        {showChecklist && (
          <div className="rounded-xl border border-amber-500/25 bg-amber-500/5 px-3.5 py-4">
            <p className="text-sm font-semibold text-foreground">
              Before I can recommend lenders, I need:
            </p>
            <ul className="mt-3 space-y-1.5" role="list">
              {result.missingRequirements.map((gap) => (
                <li key={gap.id}>
                  <button
                    type="button"
                    className={cn(
                      "flex w-full items-center gap-2 rounded-lg border border-border/60 bg-card/80 px-3 py-2.5 text-left text-xs font-medium text-foreground",
                      "transition-colors hover:border-teal-500/40 hover:bg-teal-500/5",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/50",
                    )}
                    onClick={() => onNavigateSection?.(gap.section)}
                  >
                    <Square className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
                    <span className="min-w-0 flex-1">{gap.label}</span>
                    <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wide text-teal-800 dark:text-teal-200">
                      Open
                    </span>
                  </button>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-[11px] text-muted-foreground">
              Complete and save each item, then return here — recommendations generate automatically
              when all mandatory inputs are ready.
            </p>
          </div>
        )}

        {!result.ready &&
          showChecklist &&
          result.missingRequirements.length === 0 &&
          result.guidance.length > 0 && (
            <div className="rounded-xl border border-amber-500/25 bg-amber-500/5 px-3 py-3">
              <p className="text-xs font-medium text-foreground">
                Recommendations are not available yet.
              </p>
              <ul className="mt-2 space-y-1.5">
                {result.guidance.map((msg) => (
                  <li key={msg} className="text-xs leading-relaxed text-muted-foreground">
                    {msg}
                  </li>
                ))}
              </ul>
            </div>
          )}
      </div>
    </section>
  );
}
