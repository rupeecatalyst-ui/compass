"use client";

import { useCallback, useMemo, useState } from "react";
import { Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import {
  ChanakyaGapInlineField,
  type ChanakyaGapSavePayload,
} from "@/components/catalyst-one/credit-bench/chanakya-gap-inline-field";
import { ChanakyaLoadingExperience } from "@/components/catalyst-one/chanakya-loading";
import {
  listChanakyaRecommendationGaps,
} from "@/lib/chanakya-opportunity-recommendations";
import {
  buildLeadInformationPatchBody,
  formFromOpportunity,
} from "@/lib/lead-information/form-helpers";
import {
  parseLeadInformationLendingExtension,
} from "@/constants/lead-information-workspace";
import {
  enterpriseOpportunityApiClient,
  OpportunityApiError,
} from "@/lib/enterprise-opportunity/opportunity-api-client";
import { saveStatedDraft } from "@/lib/lead-opportunity-journey/stated-draft";
import { loadLoanFiles, saveLoanFiles } from "@/lib/loan-files-storage";
import { isOpportunityRuntimeCase } from "@/lib/lead-opportunity-journey/opportunity-runtime-adapter";
import type { EcwStatedInformationDraft } from "@/types/enterprise-credit-workspace";
import type { LoanFile } from "@/types/catalyst-one";
import { useChanakyaCanonicalRecommendations } from "@/hooks/use-chanakya-canonical-recommendations";

/**
 * BAT #10 / #21 / #25 — Interactive Chanakya lender recommendations.
 * Missing mandatory fields are completed inline (auto-save); recommendations
 * generate automatically when the last gap is closed.
 */
export function ChanakyaOpportunityRecommendationPanel({
  file,
  stated,
  opportunityId,
  onStatedChange,
  onFileChange,
  onAfterPersist,
}: {
  file: LoanFile;
  stated: EcwStatedInformationDraft;
  opportunityId?: string | null;
  onStatedChange: (patch: Partial<EcwStatedInformationDraft>) => void;
  onFileChange: (patch: Partial<LoanFile>) => void;
  onAfterPersist?: () => void | Promise<void>;
}) {
  const [assessmentRevision, setAssessmentRevision] = useState(0);
  const canonical = useChanakyaCanonicalRecommendations(
    opportunityId || file.enterpriseOpportunityId || (isOpportunityRuntimeCase(file) ? file.id : null), file, stated, assessmentRevision,
  );
  const gaps = useMemo(() => listChanakyaRecommendationGaps(file, stated), [file, stated]);
  const result = {
    ready: canonical.result?.status === "ready",
    recommendations: canonical.result?.recommendations ?? [],
    missingRequirements: gaps,
    guidance: [canonical.guidance],
  };
  const generating = canonical.loading;
  const [savingGapId, setSavingGapId] = useState<string | null>(null);

  const persistOpportunityPatch = useCallback(
    async (payload: Extract<ChanakyaGapSavePayload, { kind: "opportunity" }>) => {
      const oppId =
        opportunityId?.trim() ||
        file.enterpriseOpportunityId?.trim() ||
        (isOpportunityRuntimeCase(file) ? file.id : "");

      onFileChange(payload.filePatch);

      if (!oppId) {
        if (!isOpportunityRuntimeCase(file)) {
          const all = loadLoanFiles().map((f) =>
            f.id === file.id ? { ...f, ...payload.filePatch } : f,
          );
          saveLoanFiles(all);
        }
        return;
      }

      const opp = await enterpriseOpportunityApiClient.getOpportunity(oppId);
      const form = formFromOpportunity(opp);
      const nextForm = { ...form };

      if (payload.patch.productCode != null) {
        nextForm.productCode = payload.patch.productCode;
        nextForm.productLabel = payload.patch.productLabel ?? form.productLabel;
      }
      if (payload.patch.requestedAmount != null) {
        nextForm.requestedAmount = String(payload.patch.requestedAmount);
      }
      if (payload.patch.lendingType != null) {
        nextForm.lendingType = payload.patch.lendingType;
      }
      if (payload.patch.employmentTypeCode != null) {
        nextForm.employmentTypeCode = payload.patch.employmentTypeCode;
      }
      if (payload.patch.approxCibilScore != null) {
        nextForm.approxCibilScore = payload.patch.approxCibilScore;
      }
      if (payload.patch.cityLabel != null) {
        nextForm.cityLabel = payload.patch.cityLabel;
        nextForm.stateLabel = payload.patch.stateLabel ?? form.stateLabel;
      }
      if (payload.patch.btInstitutionId != null) {
        nextForm.btInstitutionId = payload.patch.btInstitutionId;
        nextForm.btInstitutionName =
          payload.patch.btInstitutionName ?? form.btInstitutionName;
      }

      await enterpriseOpportunityApiClient.updateOpportunity(
        oppId,
        buildLeadInformationPatchBody(
          nextForm,
          opp.rowVersion,
          parseLeadInformationLendingExtension(opp.lendingExtension),
        ),
      );
      await onAfterPersist?.();
      setAssessmentRevision((value) => value + 1);
    },
    [file, onAfterPersist, onFileChange, opportunityId],
  );

  const handleGapSave = useCallback(
    async (gapId: string, payload: ChanakyaGapSavePayload) => {
      setSavingGapId(gapId);
      try {
        if (payload.kind === "stated") {
          onStatedChange(payload.statedPatch);
          if (payload.filePatch) onFileChange(payload.filePatch);
          const nextStated = { ...stated, ...payload.statedPatch };
          saveStatedDraft(file.id, nextStated);
        } else {
          await persistOpportunityPatch(payload);
        }
      } catch (err) {
        const message =
          err instanceof OpportunityApiError
            ? err.message
            : err instanceof Error
              ? err.message
              : "Could not save field.";
        toast.error(message);
      } finally {
        setSavingGapId(null);
      }
    },
    [file.id, onFileChange, onStatedChange, persistOpportunityPatch, stated],
  );

  const missingCount = result.missingRequirements.length;
  const showRecommendations = result.ready && !generating;

  return (
    <section className="rounded-2xl border border-border/70 bg-card/90 p-4 shadow-sm">
      <div className="flex items-start gap-2.5">
        <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-teal-600/15 text-teal-800 dark:text-teal-200">
          <Sparkles className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-semibold text-foreground">Chanakya Recommendation</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Complete missing Opportunity details here — Chanakya saves as you go and recommends
            lenders when ready. Advisory only.
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

        {!result.ready && missingCount > 0 && (
          <div className="rounded-xl border border-amber-500/25 bg-amber-500/5 px-3.5 py-4">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <p className="text-sm font-semibold text-foreground">
                Before I can recommend lenders, I need:
              </p>
              <p className="text-[11px] font-semibold tabular-nums text-amber-900 dark:text-amber-200">
                {missingCount} field{missingCount === 1 ? "" : "s"} missing
              </p>
            </div>
            <ul className="mt-3 space-y-3" role="list">
              {result.missingRequirements.map((gap) => (
                <li
                  key={gap.id}
                  className="rounded-lg border border-border/60 bg-card/80 px-3 py-3"
                >
                  <div className="mb-1.5 flex items-center justify-between gap-2">
                    <p className="text-xs font-semibold text-foreground">{gap.label}</p>
                    {savingGapId === gap.id ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-medium text-muted-foreground">
                        <Loader2 className="h-3 w-3 animate-spin" />
                        Saving
                      </span>
                    ) : (
                      <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                        Required
                      </span>
                    )}
                  </div>
                  <ChanakyaGapInlineField
                    gap={gap}
                    file={file}
                    stated={stated}
                    disabled={savingGapId === gap.id}
                    onSave={(payload) => handleGapSave(gap.id, payload)}
                  />
                </li>
              ))}
            </ul>
            <p className="mt-3 text-[11px] text-muted-foreground">
              Values save automatically. When the last field is completed, Chanakya generates
              recommendations — no extra button.
            </p>
          </div>
        )}

        {!result.ready &&
          missingCount === 0 &&
          !generating &&
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
