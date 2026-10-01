/**
 * Durable identity for a finalized recommendation run.
 * asOf stays as a UTC calendar day because seasoning and programme
 * effective windows are date-based. The clock time is not part of reuse.
 * Programme, policy, lender-category, and rule-set identity are.
 */
import type { ActiveRecommendationRuleSet } from "@/lib/product-recommendation/types";
import { hashOpportunityAssessmentCommand } from "./content-hash";

export type RecommendationInventoryIdentity = {
  programmes: Array<{
    id: string;
    versionNumber: number;
    policyVersionId: string | null;
    policyVersion?: { versionNumber?: number | null } | null;
    suspendedByOverride?: boolean;
  }>;
  lenderCategories: ReadonlyMap<string, string>;
};

export function recommendationAsOfCalendarDay(asOf: Date): string {
  return asOf.toISOString().slice(0, 10);
}

export function recommendationInventoryFingerprint(inventory: RecommendationInventoryIdentity): string {
  const programmes = inventory.programmes
    .map((row) => ({
      id: row.id,
      versionNumber: row.versionNumber,
      policyVersionId: row.policyVersionId,
      policyVersionNumber: row.policyVersion?.versionNumber ?? null,
      suspendedByOverride: row.suspendedByOverride === true,
    }))
    .sort((a, b) =>
      a.id.localeCompare(b.id) ||
      a.versionNumber - b.versionNumber ||
      (a.policyVersionId ?? "").localeCompare(b.policyVersionId ?? ""),
    );
  const lenderCategories = [...inventory.lenderCategories.entries()]
    .map(([lenderId, category]) => ({ lenderId, category }))
    .sort((a, b) => a.lenderId.localeCompare(b.lenderId) || a.category.localeCompare(b.category));
  return hashOpportunityAssessmentCommand({ programmes, lenderCategories });
}

export function recommendationRuleSetFingerprint(ruleSet: ActiveRecommendationRuleSet | null): string {
  if (!ruleSet) return hashOpportunityAssessmentCommand({ ruleSet: null });
  return hashOpportunityAssessmentCommand({
    id: ruleSet.id,
    lineageId: ruleSet.lineageId,
    versionNumber: ruleSet.versionNumber,
    lifecycleStatus: ruleSet.lifecycleStatus,
    simulationOnly: ruleSet.simulationOnly,
    labelledUnapproved: ruleSet.labelledUnapproved,
    weights: ruleSet.weights,
  });
}

export function recommendationReuseKey(input: {
  organizationId: string;
  opportunityId: string;
  revisionId: string;
  contentHash: string;
  mapperVersion: string;
  factsSchemaVersion: string;
  product: string;
  customer: unknown;
  asOfCalendarDay: string;
  inventoryFingerprint: string;
  ruleSetFingerprint: string;
}): string {
  return hashOpportunityAssessmentCommand(input);
}
