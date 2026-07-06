import { computeTopUpRequested } from "@/constants/loan-pipeline";
import { getRevenueBaseAmount } from "@/lib/loan-amount-utils";
import type { LoanFile } from "@/types/catalyst-one";

/** UX-01B — Detect unsaved loan workspace edits (display-only; no workflow impact). */
export function isLoanWorkspaceDirty(
  draft: LoanFile,
  original: LoanFile,
  notes: string,
): boolean {
  const topUp =
    draft.btAmount != null
      ? computeTopUpRequested(draft.requiredAmount, draft.btAmount)
      : draft.topUpRequested ?? 0;
  const revenueBase = getRevenueBaseAmount(draft);
  const expectedRevenue = Math.round(revenueBase * (draft.revenuePercent / 100));

  const origTopUp =
    original.btAmount != null
      ? computeTopUpRequested(original.requiredAmount, original.btAmount)
      : original.topUpRequested ?? 0;
  const origRevenueBase = getRevenueBaseAmount(original);
  const origExpectedRevenue = Math.round(origRevenueBase * (original.revenuePercent / 100));

  const currentPayload = JSON.stringify({
    ...draft,
    internalNotes: notes,
    topUpRequested: topUp,
    expectedRevenue,
  });
  const originalPayload = JSON.stringify({
    ...original,
    internalNotes: original.internalNotes,
    topUpRequested: origTopUp,
    expectedRevenue: origExpectedRevenue,
  });

  return currentPayload !== originalPayload;
}
