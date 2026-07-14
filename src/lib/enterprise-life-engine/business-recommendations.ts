/**
 * LIFE business recommendations — CF-LIFE-001.
 * Translates hidden engine selection into ranked executive recommendations.
 */

import type {
  LifeBusinessRecommendation,
  LifeCaseContext,
  LifeCaseContextInput,
  LifeLenderSelectionResult,
  LifeRecommendationOutcome,
} from "@/types/enterprise-life-engine";
import {
  evaluateLifeContextBlockers,
  resolveLifeCaseContext,
  toLifeSelectionCriteria,
} from "./case-context";
import { selectLifeLenderExecutors } from "./validation-engine";
import { getLifePorts } from "./composition";

const BUSINESS_REASONS = [
  "Best TAT",
  "Highest Approval Rate",
  "Existing Relationship",
  "Strong Branch Coverage",
  "Preferred Lender Fit",
] as const;

function businessReasonFor(
  result: LifeLenderSelectionResult,
  rank: number,
): string {
  const hints = getLifePorts().recommendationHints.listByContact(result.contact.id);
  const enabled = hints.find((h) => h.enabled && h.rationale.trim());
  if (enabled?.rationale) return enabled.rationale;
  return BUSINESS_REASONS[Math.min(rank - 1, BUSINESS_REASONS.length - 1)];
}

export function toLifeBusinessRecommendations(
  results: LifeLenderSelectionResult[],
): LifeBusinessRecommendation[] {
  return results.map((r, index) => {
    const rank = index + 1;
    return {
      rank,
      contactId: r.contact.id,
      lenderName: r.lenderName,
      branchName: r.branchName || r.contact.city || "—",
      executiveName: r.contact.contactName,
      relationshipManagerName:
        r.reportingManagerName || r.contact.contactName || "—",
      reason: businessReasonFor(r, rank),
      recommendationScore: r.recommendationScore,
    };
  });
}

/**
 * End-to-end business action: resolve context → blockers or ranked executives.
 * Engine criteria are never returned for UI display.
 */
export function recommendLifeLenderExecutives(
  input: LifeCaseContextInput = {},
): LifeRecommendationOutcome {
  const context = resolveLifeCaseContext(input);
  const blockers = evaluateLifeContextBlockers(context);
  if (blockers.length > 0) {
    return { ready: false, blockers, recommendations: [], context };
  }

  const criteria = toLifeSelectionCriteria(context);
  if (!criteria) {
    return {
      ready: false,
      blockers: evaluateLifeContextBlockers(context),
      recommendations: [],
      context,
    };
  }

  const matched = selectLifeLenderExecutors(criteria);
  return {
    ready: true,
    blockers: [],
    recommendations: toLifeBusinessRecommendations(matched),
    context,
  };
}

/** Convenience — read-only accessors for tests / future Loan Journey bridge. */
export function getLifeRecommendationContext(
  input: LifeCaseContextInput = {},
): LifeCaseContext {
  return resolveLifeCaseContext(input);
}
