"use client";

import { useEffect, useState } from "react";
import { authenticatedJsonFetch } from "@/lib/api-client";
import { absoluteRupeesFromStoredString, parseFinancialMagnitudeInput } from "@/lib/enterprise-financial-input";
import type { CanonicalLenderRecommendationResult } from "@/types/canonical-lender-recommendation";
import type { LoanFile } from "@/types/catalyst-one";
import type { EcwStatedInformationDraft } from "@/types/enterprise-credit-workspace";

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
  const [state, setState] = useState<{ key: string; result: CanonicalLenderRecommendationResult | null }>({ key: "", result: null });
  useEffect(() => {
    if (!opportunityId || !file) return;
    const controller = new AbortController();
    void (async () => {
      try {
        const response = await authenticatedJsonFetch(`/api/enterprise-opportunities/${encodeURIComponent(opportunityId)}/chanakya-recommendations`, {
          method: "POST", body, headers: { "Content-Type": "application/json" }, signal: controller.signal,
        });
        const payload = await response.json();
        if (!response.ok || payload.success !== true || !Array.isArray(payload.data?.recommendations)) throw new Error();
        if (!controller.signal.aborted) setState({ key, result: payload.data });
      } catch {
        if (!controller.signal.aborted) setState({ key, result: null });
      }
    })();
    return () => controller.abort();
  // key captures the primitive inputs; file identity alone must not refetch.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  const result = state.key === key ? state.result : null;
  const loading = Boolean(opportunityId && file && state.key !== key);
  return { result, loading, guidance: loading ? "Assessing published programmes..." :
    "No eligible recommendation is available. Saved assessment inputs are required; local financial/property drafts are not yet durable recommendation inputs." };
}
