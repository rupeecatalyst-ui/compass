"use client";

import { Sparkles } from "lucide-react";
import { ChanakyaLoadingExperience } from "@/components/catalyst-one/chanakya-loading";
import { isOpportunityRuntimeCase } from "@/lib/lead-opportunity-journey/opportunity-runtime-adapter";
import type { EcwStatedInformationDraft } from "@/types/enterprise-credit-workspace";
import type { LoanFile } from "@/types/catalyst-one";
import { useChanakyaCanonicalRecommendations } from "@/hooks/use-chanakya-canonical-recommendations";

/**
 * Stage 5C5 — Chanakya lender recommendations from a finalized Opportunity Assessment.
 * Browser-local drafts are not recommendation inputs.
 */
export function ChanakyaOpportunityRecommendationPanel({
  file,
  stated,
  opportunityId,
}: {
  file: LoanFile;
  stated: EcwStatedInformationDraft;
  opportunityId?: string | null;
  onStatedChange?: (patch: Partial<EcwStatedInformationDraft>) => void;
  onFileChange?: (patch: Partial<LoanFile>) => void;
  onAfterPersist?: () => void | Promise<void>;
}) {
  const canonical = useChanakyaCanonicalRecommendations(
    opportunityId || file.enterpriseOpportunityId || (isOpportunityRuntimeCase(file) ? file.id : null),
    file,
    stated,
  );
  const result = {
    ready: canonical.result?.status === "ready",
    recommendations: canonical.result?.recommendations ?? [],
    guidance: [canonical.guidance],
  };
  const generating = canonical.loading;
  const showRecommendations = result.ready && !generating;
  const statusTitle = canonical.noEligibleLender
    ? "No eligible lender"
    : canonical.assessmentNotReady
      ? "Assessment not ready"
      : "Recommendations are not available yet.";

  return (
    <section className="rounded-2xl border border-border/70 bg-card/90 p-4 shadow-sm">
      <div className="flex items-start gap-2.5">
        <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-teal-600/15 text-teal-800 dark:text-teal-200">
          <Sparkles className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-semibold text-foreground">Chanakya Recommendation</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Recommendations use the finalized Opportunity Assessment. Advisory only.
          </p>
        </div>
      </div>

      <div className="mt-4 space-y-3">
        <p className="text-xs text-muted-foreground">
          Ordered by assessed offer and applicable ROI. No governed lender score or final business ranking is available.
        </p>
        {showRecommendations && result.recommendations.map((row) => (
          <article key={row.programmeId} className="rounded-xl border border-border/70 px-3.5 py-3">
            <h3 className="text-sm font-semibold">{row.lenderName}</h3>
            <p className="text-xs text-muted-foreground">{row.programmeCode} &middot; {row.matchState.replaceAll("_", " ")}</p>
            <p className="mt-1.5 text-xs">{row.customerExplanation}</p>
            <p className="mt-1 text-xs text-muted-foreground">Lender score: unavailable</p>
          </article>
        ))}

        {generating && (
          <ChanakyaLoadingExperience
            module="credit"
            statusLabel="Analysing this Opportunity profile..."
            density="inline"
            useEbiSignals={false}
          />
        )}

        {!result.ready && !generating && (
          <div className="rounded-xl border border-amber-500/25 bg-amber-500/5 px-3 py-3">
            <p className="text-xs font-medium text-foreground">{statusTitle}</p>
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
