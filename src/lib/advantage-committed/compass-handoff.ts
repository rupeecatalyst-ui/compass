/**
 * COMPASS → Advantage Committed (₹) handoff decision.
 * Keys by canonical Opportunity id only. Never name matching.
 *
 * CompassAdvantageSnapshot is the live current calculation (one row per Opportunity,
 * overwritten on recalc). It has no submitted/frozen version column.
 * Journey submission proof lives on Opportunity.snapshot.compassSubmittedAt
 * (fallback: compassOperationalHandoffAt), written by COMPASS submit().
 * A snapshot may become a commitment only when it was calculated at or before that
 * submit timestamp. Post-submit recalc must not be promoted.
 */
import { canonicalCommittedRupees } from "./money";
import { isAdvantageCommittedApplicableProduct } from "./applicability";

export const COMPASS_ADVANTAGE_COMMIT_ACTOR = "compass-customer-gateway" as const;

export const COMPASS_ADVANTAGE_COMMIT_REASON =
  "COMPASS submission — Advantage communicated to the customer on this Opportunity." as const;

/** Written by compass-journey.service submit() onto Opportunity.snapshot. */
export const COMPASS_JOURNEY_SUBMITTED_AT_KEY = "compassSubmittedAt" as const;
export const COMPASS_OPERATIONAL_HANDOFF_AT_KEY = "compassOperationalHandoffAt" as const;

export type CompassAdvantageCommitDecision =
  | { action: "commit"; amount: string; reason: "submitted_snapshot" }
  | {
      action: "skip";
      reason:
        | "missing_opportunity_id"
        | "snapshot_opportunity_mismatch"
        | "already_committed"
        | "product_not_applicable"
        | "snapshot_absent"
        | "snapshot_not_ready"
        | "snapshot_amount_absent"
        | "journey_not_submitted"
        | "snapshot_unversioned"
        | "snapshot_after_submission";
    };

function parseIso(value: unknown): Date | null {
  if (value == null || value === "") return null;
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }
  const parsed = Date.parse(String(value));
  if (Number.isNaN(parsed)) return null;
  return new Date(parsed);
}

export function readCompassJourneySubmittedAt(snapshot: unknown): string | null {
  if (!snapshot || typeof snapshot !== "object" || Array.isArray(snapshot)) return null;
  const rec = snapshot as Record<string, unknown>;
  for (const key of [COMPASS_JOURNEY_SUBMITTED_AT_KEY, COMPASS_OPERATIONAL_HANDOFF_AT_KEY]) {
    const at = parseIso(rec[key]);
    if (at) return at.toISOString();
  }
  return null;
}

export function snapshotCalculatedAtOrBeforeSubmission(input: {
  snapshotCalculatedAt?: unknown;
  journeySubmittedAt?: unknown;
}): boolean {
  const calculated = parseIso(input.snapshotCalculatedAt);
  const submitted = parseIso(input.journeySubmittedAt);
  if (!calculated || !submitted) return false;
  return calculated.getTime() <= submitted.getTime();
}

export function decideCompassSubmissionAdvantageCommit(input: {
  opportunityId?: string | null;
  snapshotOpportunityId?: string | null;
  productCode?: string | null;
  productLabel?: string | null;
  existingCommittedAmount?: unknown;
  snapshotTotalAdvantageAmount?: unknown;
  snapshotCalculationStatus?: string | null;
  snapshotCalculatedAt?: unknown;
  journeySubmittedAt?: unknown;
  opportunitySnapshot?: unknown;
}): CompassAdvantageCommitDecision {
  const opportunityId = input.opportunityId?.trim() || "";
  if (!opportunityId) {
    return { action: "skip", reason: "missing_opportunity_id" };
  }
  const snapshotOpportunityId = input.snapshotOpportunityId?.trim() || "";
  if (!snapshotOpportunityId) {
    return { action: "skip", reason: "snapshot_absent" };
  }
  if (snapshotOpportunityId !== opportunityId) {
    return { action: "skip", reason: "snapshot_opportunity_mismatch" };
  }
  if (canonicalCommittedRupees(input.existingCommittedAmount)) {
    return { action: "skip", reason: "already_committed" };
  }
  if (!isAdvantageCommittedApplicableProduct(input.productCode, input.productLabel)) {
    return { action: "skip", reason: "product_not_applicable" };
  }

  const journeySubmittedAt =
    parseIso(input.journeySubmittedAt)?.toISOString() ||
    readCompassJourneySubmittedAt(input.opportunitySnapshot);
  if (!journeySubmittedAt) {
    return { action: "skip", reason: "journey_not_submitted" };
  }

  const status = (input.snapshotCalculationStatus || "").trim().toLowerCase();
  if (status !== "ready") {
    return { action: "skip", reason: "snapshot_not_ready" };
  }
  if (!parseIso(input.snapshotCalculatedAt)) {
    return { action: "skip", reason: "snapshot_unversioned" };
  }
  if (
    !snapshotCalculatedAtOrBeforeSubmission({
      snapshotCalculatedAt: input.snapshotCalculatedAt,
      journeySubmittedAt,
    })
  ) {
    return { action: "skip", reason: "snapshot_after_submission" };
  }

  const amount = canonicalCommittedRupees(input.snapshotTotalAdvantageAmount);
  if (!amount) {
    return { action: "skip", reason: "snapshot_amount_absent" };
  }
  return { action: "commit", amount, reason: "submitted_snapshot" };
}
