/**
 * Map a COMPASS-calculated Advantage DTO onto Opportunity Advantage Committed (₹).
 * Never recalculates. Missing/ineligible COMPASS Advantage must not invent an amount.
 */

import { canonicalCommittedRupees } from "./money";

export function compassAdvantageToCommitmentAmount(input: {
  eligible?: boolean;
  status?: string | null;
  totalAdvantageAmount?: string | number | null;
  amount?: string | number | null;
}): string | null {
  if (input.eligible !== true || input.status !== "ready") return null;
  return canonicalCommittedRupees(input.totalAdvantageAmount ?? input.amount);
}
