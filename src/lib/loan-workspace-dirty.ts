import { getRevenueBaseAmount } from "@/lib/loan-amount-utils";
import { syncParticipantLegacyFields } from "@/lib/loan-participants";
import type { LoanFile } from "@/types/catalyst-one";

/** UX-01B / UX-02 — Detect unsaved loan workspace edits (display-only; no workflow impact). */
export function isLoanWorkspaceDirty(
  draft: LoanFile,
  original: LoanFile,
  notes: string,
): boolean {
  const participants = draft.participants ?? [];
  const synced = syncParticipantLegacyFields(participants, draft.businessDetails);
  const revenueBase = getRevenueBaseAmount(draft);
  const expectedRevenue = Math.round(revenueBase * (draft.revenuePercent / 100));

  const origParticipants = original.participants ?? [];
  const origSynced = syncParticipantLegacyFields(origParticipants, original.businessDetails);
  const origRevenueBase = getRevenueBaseAmount(original);
  const origExpectedRevenue = Math.round(origRevenueBase * (original.revenuePercent / 100));

  const currentPayload = JSON.stringify({
    ...draft,
    ...synced,
    internalNotes: notes,
    topUpRequested: draft.topUpRequired ? draft.topUpRequested : 0,
    expectedRevenue,
  });
  const originalPayload = JSON.stringify({
    ...original,
    ...origSynced,
    internalNotes: original.internalNotes,
    topUpRequested: original.topUpRequired ? original.topUpRequested : 0,
    expectedRevenue: origExpectedRevenue,
  });

  return currentPayload !== originalPayload;
}
