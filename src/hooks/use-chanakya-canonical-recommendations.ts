"use client";

import { useEffect, useState } from "react";
import { authenticatedJsonFetch } from "@/lib/api-client";
import { absoluteRupeesFromStoredString, parseFinancialMagnitudeInput } from "@/lib/enterprise-financial-input";
import type { CanonicalLenderRecommendationResult } from "@/types/canonical-lender-recommendation";
import type { LoanFile } from "@/types/catalyst-one";
import type { EcwStatedInformationDraft } from "@/types/enterprise-credit-workspace";

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
  // Preserve explicit zero; positive amounts use the same contract as the editor.
  if (parseFinancialMagnitudeInput(String(value)) === 0) return 0;
  return absoluteRupeesFromStoredString(String(value)) ?? null;
}

/** Transport only: all eligibility, policy validation and ordering remain on the server. */
export function useChanakyaCanonicalRecommendations(
  opportunityId: string | null | undefined,
  file: LoanFile | null,
  stated?: EcwStatedInformationDraft,
  revision?: string | number,
) {
  const body = JSON.stringify({
    monthlyIncomeRupees: amount(stated?.statedIncomeMonthly ?? file?.businessDetails?.monthlySalary),
    existingMonthlyEmiRupees: amount(stated?.statedObligations ?? file?.businessDetails?.existingEmi),
    propertyValueRupees: amount(stated?.statedPropertyValue ?? file?.approxPropertyValue),
    propertyType: stated?.statedPropertyType || file?.propertyType || null,
    constitution: stated?.statedConstitution || file?.businessDetails?.constitution || null,
  });
  // Include saved-input projections to invalidate old recommendations immediately.
  const key = JSON.stringify([opportunityId, body, revision, file?.loanProduct, file?.loanAmount,
    file?.employmentType, file?.approxCibilScore, file?.city, file?.transactionType]);
  const [state, setState] = useState<{ key: string; result: CanonicalLenderRecommendationResult | null; missing: string[] }>({ key: "", result: null, missing: [] });
  useEffect(() => {
    if (!opportunityId || !file) return;
    const controller = new AbortController();
    void (async () => {
      try {
        const response = await authenticatedJsonFetch(`/api/enterprise-opportunities/${encodeURIComponent(opportunityId)}/chanakya-recommendations`, {
          method: "POST", body, headers: { "Content-Type": "application/json" }, signal: controller.signal,
        });
        const payload = await response.json();
        if (!response.ok || payload.success !== true || !Array.isArray(payload.data?.recommendations)) {
          if (!controller.signal.aborted) setState({ key, result: null, missing: missingLabels(payload.error?.missingInputs) });
          return;
        }
        if (!controller.signal.aborted) setState({ key, result: payload.data, missing: missingLabels(payload.data.missingInputs) });
      } catch {
        if (!controller.signal.aborted) setState({ key, result: null, missing: [] });
      }
    })();
    return () => controller.abort();
  // key captures the primitive inputs; file identity alone must not refetch.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  const result = state.key === key ? state.result : null;
  const loading = Boolean(opportunityId && file && state.key !== key);
  const missing = state.key === key ? state.missing : [];
  return { result, loading, guidance: loading ? "Assessing published programmes..." :
    missing.length ? `Additional saved assessment information is required: ${missing.join(", ")}.` :
    result?.cibilNotKnownDisclaimer ? "CIBIL is not known. Any recommendation remains subject to credit verification." :
    "No eligible recommendation is available. Saved assessment inputs are required; local financial/property drafts are not yet durable recommendation inputs." };
}
