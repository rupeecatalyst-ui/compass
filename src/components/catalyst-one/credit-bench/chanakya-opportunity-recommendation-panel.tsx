"use client";

import Link from "next/link";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ChanakyaLoadingExperience } from "@/components/catalyst-one/chanakya-loading";
import { buildJourneyHref } from "@/constants/lead-opportunity-journey";
import { ROUTES } from "@/constants/routes";
import { isOpportunityRuntimeCase } from "@/lib/lead-opportunity-journey/opportunity-runtime-adapter";
import type { EcwStatedInformationDraft } from "@/types/enterprise-credit-workspace";
import type { LoanFile } from "@/types/catalyst-one";
import { useChanakyaCanonicalRecommendations } from "@/hooks/use-chanakya-canonical-recommendations";
import { selectStandardRecommendationPresentation } from "@/lib/opportunity-assessment/standard-presentation";
import type { CanonicalRecommendationCard } from "@/types/canonical-lender-recommendation";

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
  const presentation = selectStandardRecommendationPresentation(
    canonical.result?.recommendations ?? [],
    canonical.result?.presentation,
  );
  const visibleCount = presentation.recommended.length + presentation.additional.length;
  const matchRankingReady = [...presentation.recommended, ...presentation.additional].some(
    (row) => typeof row.matchPercent === "number" && Number.isFinite(row.matchPercent),
  );
  const result = {
    ready: canonical.result?.status === "ready",
    guidance: [canonical.guidance],
  };
  const generating = canonical.loading;
  const showRecommendations = result.ready && !generating;
  const missingCount = canonical.missingCount;
  const assessmentHref = buildJourneyHref(ROUTES.OPPORTUNITY_WORKSPACE, {
    opportunityId: opportunityId || file.enterpriseOpportunityId || (isOpportunityRuntimeCase(file) ? file.id : null),
    tab: "opportunity_assessment",
  });
  const statusTitle = canonical.noEligibleLender
    ? "No eligible lender"
    : canonical.assessmentNotReady && missingCount > 0
      ? `Assessment incomplete — ${missingCount} required details missing`
      : canonical.assessmentNotReady
        ? "Assessment incomplete — required details missing"
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
          {matchRankingReady
            ? "Ranked by Match %, then lower applicable ROI, then higher assessed offer. Lender score is not used."
            : "Match % ranking is not available for this result. Lender score is not used."}
        </p>
        {showRecommendations && visibleCount > 0 && (
          <div className="space-y-3">
            <RecommendationGroup label="Recommended" rows={presentation.recommended} />
            <RecommendationGroup label="Additional options" rows={presentation.additional} />
            {presentation.auditedOnly.length > 0 && (
              <p className="text-xs text-muted-foreground">
                {presentation.auditedOnly.length} further programme{presentation.auditedOnly.length === 1 ? "" : "s"} retained in the recommendation audit.
              </p>
            )}
          </div>
        )}

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
            {canonical.assessmentNotReady ? (
              <Button asChild size="sm" className="mt-3">
                <Link href={assessmentHref}>Complete Assessment</Link>
              </Button>
            ) : (
              <ul className="mt-2 space-y-1.5">
                {result.guidance.map((msg) => (
                  <li key={msg} className="text-xs leading-relaxed text-muted-foreground">
                    {msg}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </section>
  );
}

function formatInr(value: number | null): string {
  if (value == null || !Number.isFinite(value)) return "Not available";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatPercent(value: number | null): string {
  if (value == null || !Number.isFinite(value)) return "Not available";
  return `${new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 }).format(value)}%`;
}

function RecommendationGroup({
  label,
  rows,
}: {
  label: string;
  rows: CanonicalRecommendationCard[];
}) {
  if (rows.length === 0) return null;
  return (
    <div className="space-y-2">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
      {rows.map((row) => (
        <article key={row.programmeId} className="rounded-xl border border-border/70 px-3.5 py-3">
          <h3 className="text-sm font-semibold">{row.lenderName}</h3>
          <p className="text-xs text-muted-foreground">
            {row.programmeCode}
            {row.matchRank != null ? ` · Rank ${row.matchRank}` : ""}
            {" · "}
            {row.matchState.replaceAll("_", " ")}
          </p>
          <p className="mt-1.5 text-xs">Match %: {formatPercent(row.matchPercent)}</p>
          <p className="text-xs">Applicable ROI: {formatPercent(row.applicableRoiPercent)}</p>
          <p className="text-xs">Assessed offer: {formatInr(row.tentativeOfferRupees)}</p>
          <p className="mt-1.5 text-xs">{row.customerExplanation}</p>
          <p className="mt-1 text-xs text-muted-foreground">Lender score: unavailable</p>
        </article>
      ))}
    </div>
  );
}
