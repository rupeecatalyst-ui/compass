"use client";

import { useEffect, useState } from "react";
import { authenticatedJsonFetch } from "@/lib/api-client";
import { absoluteRupeesFromStoredString, parseFinancialMagnitudeInput } from "@/lib/enterprise-financial-input";
import type { CanonicalLenderRecommendationResult } from "@/types/canonical-lender-recommendation";
import type { LoanFile } from "@/types/catalyst-one";
import type { EcwStatedInformationDraft } from "@/types/enterprise-credit-workspace";
import type { OpportunityAssessmentRecommendationDto } from "@/types/opportunity-assessment-recommendation";

const assessmentLabels: Record<string, string> = {
  residency: "residency", cibil: "CIBIL information", dateOfBirth: "date of birth", requestedTenure: "requested tenure",
  employment: "employment", monthlyIncome: "monthly income", obligations: "existing obligations", propertyValue: "property value",
  propertyType: "property type", constructionStatus: "construction status", constitution: "borrower constitution",
  city: "city", state: "state", requestedAmount: "requested amount", coApplicant: "co-applicant information",
  btOutstanding: "BT outstanding", loanStartDate: "loan start date", repaymentTrack: "repayment track",
  delayedEmis: "delayed EMI count", occupancy: "occupancy", possession: "possession status", registration: "registration status",
};
function missingLabels(value: unknown): string[] {
  return Array.isArray(value) ? [...new Set(value.filter((key): key is string => typeof key === "string" &&
    Object.prototype.hasOwnProperty.call(assessmentLabels, key)).map(key => assessmentLabels[key]))] : [];
}

function amount(value: string | number | undefined): number | null {
  if (value == null || String(value).trim() === "") return null;
  if (parseFinancialMagnitudeInput(String(value)) === 0) return 0;
  return absoluteRupeesFromStoredString(String(value)) ?? null;
}

type Envelope = {
  success?: boolean;
  data?: OpportunityAssessmentRecommendationDto | CanonicalLenderRecommendationResult;
  error?: { missingInputs?: unknown; code?: string };
};

function isCanonicalResult(value: unknown): value is CanonicalLenderRecommendationResult {
  return Boolean(value && typeof value === "object" && Array.isArray((value as CanonicalLenderRecommendationResult).recommendations));
}

function isAssessmentDto(value: unknown): value is OpportunityAssessmentRecommendationDto {
  return Boolean(value && typeof value === "object" && "executionAllowed" in (value as object));
}

/**
 * Stage 5C5 panels execute from finalized Opportunity Assessment.
 * The draft JSON body is transport-compatible with Stage 2/4A characterization only.
 * The server ignores browser-local financial/property fields as recommendation inputs.
 */
export function useChanakyaCanonicalRecommendations(
  opportunityId: string | null | undefined,
  file?: LoanFile | null,
  stated?: EcwStatedInformationDraft,
  revision?: string | number,
) {
  const draft = JSON.stringify({
    monthlyIncomeRupees: amount(stated?.statedIncomeMonthly ?? file?.businessDetails?.monthlySalary),
    existingMonthlyEmiRupees: amount(stated?.statedObligations ?? file?.businessDetails?.existingEmi),
    propertyValueRupees: amount(stated?.statedPropertyValue ?? file?.approxPropertyValue),
    propertyType: stated?.statedPropertyType || file?.propertyType || null,
    constitution: stated?.statedConstitution || file?.businessDetails?.constitution || null,
  });
  const key = JSON.stringify([opportunityId ?? null, draft, revision ?? 0, file?.loanProduct, file?.loanAmount,
    file?.employmentType, file?.approxCibilScore, file?.city, file?.transactionType]);
  const [state, setState] = useState<{
    key: string;
    result: CanonicalLenderRecommendationResult | null;
    missing: string[];
    guidance: string;
    dto: OpportunityAssessmentRecommendationDto | null;
  }>({ key: "", result: null, missing: [], guidance: "", dto: null });

  useEffect(() => {
    if (!opportunityId) return;
    const controller = new AbortController();
    const path = `/api/enterprise-opportunities/${encodeURIComponent(opportunityId)}/opportunity-assessment/recommendation`;
    void (async () => {
      try {
        const existing = await authenticatedJsonFetch(path, {
          method: "GET",
          headers: { "Content-Type": "application/json" },
          body: draft,
          signal: controller.signal,
        });
        const first = (await existing.json()) as Envelope;
        let dto = isAssessmentDto(first.data) ? first.data : null;
        let result = isCanonicalResult(first.data)
          ? first.data
          : isCanonicalResult(dto?.result)
            ? dto.result
            : null;
        if (dto?.executionAllowed && !dto.recommendationExecuted && !controller.signal.aborted) {
          const executed = await authenticatedJsonFetch(path, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: draft,
            signal: controller.signal,
          });
          const second = (await executed.json()) as Envelope;
          dto = isAssessmentDto(second.data) ? second.data : dto;
          result = isCanonicalResult(dto?.result) ? dto.result : result;
        }
        const missing = missingLabels(first.error?.missingInputs ?? dto?.result?.missingInputs);
        const guidance = dto?.guidance
          ?? (missing.length
            ? `Additional saved assessment information is required: ${missing.join(", ")}.`
            : result?.cibilNotKnownDisclaimer
              ? "CIBIL is not known. Any recommendation remains subject to credit verification."
              : "Finalize the Opportunity Assessment before Chanakya can recommend lenders.");
        if (!controller.signal.aborted) {
          setState({
            key,
            result: existing.ok && first.success !== false ? result : null,
            missing,
            guidance,
            dto,
          });
        }
      } catch {
        if (!controller.signal.aborted) {
          setState({
            key,
            result: null,
            missing: [],
            guidance: "Finalize the Opportunity Assessment before Chanakya can recommend lenders.",
            dto: null,
          });
        }
      }
    })();
    return () => controller.abort();
  // key captures the primitive inputs; file identity alone must not refetch.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const current = state.key === key ? state : null;
  const loading = Boolean(opportunityId && state.key !== key);
  return {
    result: current?.result ?? null,
    loading,
    guidance: loading ? "Assessing published programmes..." : current?.guidance ?? "",
    dto: current?.dto ?? null,
    assessmentNotReady: current?.dto ? !current.dto.executionAllowed : !loading,
    noEligibleLender: current?.dto?.resultStatus === "no_eligible_programmes",
  };
}
