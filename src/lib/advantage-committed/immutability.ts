import { ADVANTAGE_COMMITTED_MUTATION_KEYS } from "@/constants/advantage-committed";
import { canonicalCommittedRupees } from "./money";

export type AdvantageCommittedImmutabilityDecision =
  | { ok: true; action: "ignore" | "allow_initial_commit" }
  | { ok: false; code: "ADVANTAGE_COMMITTED_IMMUTABLE"; message: string };

const FORBIDDEN_NESTED_PATHS = [
  "snapshot.advantageCommittedAmount",
  "lendingExtension.advantageCommittedAmount",
  "commercialTerms.advantageCommittedAmount",
];

export function collectForbiddenCommitmentMutations(
  body: Record<string, unknown> | null | undefined,
): string[] {
  if (!body || typeof body !== "object") return [];
  const hits: string[] = [];
  for (const key of ADVANTAGE_COMMITTED_MUTATION_KEYS) {
    if (Object.prototype.hasOwnProperty.call(body, key) && body[key] !== undefined) {
      hits.push(key);
    }
  }
  const snapshot = body.snapshot;
  if (snapshot && typeof snapshot === "object" && !Array.isArray(snapshot)) {
    for (const key of ADVANTAGE_COMMITTED_MUTATION_KEYS) {
      if (Object.prototype.hasOwnProperty.call(snapshot, key)) hits.push(`snapshot.${key}`);
    }
  }
  const extension = body.lendingExtension;
  if (extension && typeof extension === "object" && !Array.isArray(extension)) {
    for (const key of ADVANTAGE_COMMITTED_MUTATION_KEYS) {
      if (Object.prototype.hasOwnProperty.call(extension, key)) {
        hits.push(`lendingExtension.${key}`);
      }
    }
  }
  for (const path of FORBIDDEN_NESTED_PATHS) {
    void path;
  }
  return hits;
}

export function decideOrdinaryCommitmentMutation(input: {
  existingAmount: unknown;
  incomingBody: Record<string, unknown> | null | undefined;
  allowInitialCommit?: boolean;
  incomingAuthorizedAmount?: unknown;
}): AdvantageCommittedImmutabilityDecision {
  const existing = canonicalCommittedRupees(input.existingAmount);
  const forbidden = collectForbiddenCommitmentMutations(input.incomingBody);
  if (existing) {
    if (forbidden.length > 0) {
      return {
        ok: false,
        code: "ADVANTAGE_COMMITTED_IMMUTABLE",
        message:
          "Advantage Committed (₹) is immutable after commitment. Use the authorised correction workflow.",
      };
    }
    return { ok: true, action: "ignore" };
  }
  if (input.allowInitialCommit && canonicalCommittedRupees(input.incomingAuthorizedAmount)) {
    return { ok: true, action: "allow_initial_commit" };
  }
  if (forbidden.length > 0) {
    return {
      ok: false,
      code: "ADVANTAGE_COMMITTED_IMMUTABLE",
      message:
        "Advantage Committed (₹) cannot be set through ordinary create, update, import, or bulk APIs.",
    };
  }
  return { ok: true, action: "ignore" };
}

export function decideDealCannotIntroduceCommitment(input: {
  opportunityAmount: unknown;
  incomingDealAmount: unknown;
}): AdvantageCommittedImmutabilityDecision {
  const incoming = canonicalCommittedRupees(input.incomingDealAmount);
  if (incoming == null) return { ok: true, action: "ignore" };
  const opportunity = canonicalCommittedRupees(input.opportunityAmount);
  if (opportunity && opportunity === incoming) return { ok: true, action: "ignore" };
  return {
    ok: false,
    code: "ADVANTAGE_COMMITTED_IMMUTABLE",
    message: "A Deal cannot introduce or change Advantage Committed (₹). Inherit the Opportunity value.",
  };
}

export function decideRecalculationCannotMutateCommitment(input: {
  existingCommittedAmount: unknown;
  recalculatedAdvantageAmount: unknown;
}): { committedAmount: string | null; recalculatedAmount: string | null; wouldMutateIfWritten: boolean } {
  const committed = canonicalCommittedRupees(input.existingCommittedAmount);
  const recalculated = canonicalCommittedRupees(input.recalculatedAdvantageAmount);
  return {
    committedAmount: committed,
    recalculatedAmount: recalculated,
    wouldMutateIfWritten: Boolean(committed && recalculated && committed !== recalculated),
  };
}

/** Recalculation may change calculated snapshots; it must never return a new committed amount. */
export function preserveCommittedAmountAcrossRecalculation(
  existingCommittedAmount: unknown,
  _recalculatedAdvantageAmount: unknown,
): string | null {
  void _recalculatedAdvantageAmount;
  return canonicalCommittedRupees(existingCommittedAmount);
}
