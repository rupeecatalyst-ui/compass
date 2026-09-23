import "server-only";

import { runHomeLoanRecommendationEngine } from "@/lib/home-loan-recommendation/engine";
import { evaluateCanonicalEligibility, canonicalCardSatisfies } from "./canonical-governed-eligibility";
import { isCanonicalProgrammeAvailable, type CanonicalProgrammeAvailabilityFields } from "./programme-availability";
import { UnsupportedEligibilityPolicyRuleError } from "./policy-rule-parser";
import type {
  CanonicalLenderRecommendationRequest,
  CanonicalLenderRecommendationResult,
  CanonicalProgrammeRejection,
  CanonicalRecommendationCard,
} from "@/types/canonical-lender-recommendation";
import {
  mapCanonicalProgramme,
  type CanonicalAssessmentProgramme,
} from "./programme-assessment-adapter";
import {
  loadCanonicalProgrammeInventory,
  type CanonicalProgrammeInventory,
} from "./recommendation-programme.repository";
import {
  createGovernedCriterionRegistry,
  presentationSlice,
  rankByMatchPercent,
  scoreProgrammes,
  type CriterionEvaluatorRegistry,
} from "@/lib/product-recommendation";
import type { ActiveRecommendationRuleSet } from "@/lib/product-recommendation/types";
import { loadActiveRecommendationRuleSet } from "./load-active-rule-set";

export type CanonicalRecommendationDependencies = {
  loadInventory?: typeof loadCanonicalProgrammeInventory;
  runEngine?: typeof runHomeLoanRecommendationEngine;
  resolveActiveRuleSet?: (input: {
    organizationId: string;
    productCode: string;
  }) => Promise<ActiveRecommendationRuleSet | null | "AMBIGUOUS" | "INVALID">;
  criterionRegistry?: CriterionEvaluatorRegistry;
};

/** Closed policy-link vocabulary only. Arbitrary Error.message must not appear on the DTO. */
const POLICY_LINK_REJECTION_CODES = new Set([
  "POLICY_VERSION_MISSING",
  "POLICY_ORGANIZATION_MISMATCH",
  "POLICY_LINEAGE_MISMATCH",
  "POLICY_LENDER_MISMATCH",
  "POLICY_PRODUCT_MISMATCH",
  "POLICY_NOT_PUBLISHED",
  "POLICY_CURRENT_VERSION_MISMATCH",
  "POLICY_NOT_EFFECTIVE",
]);

function canonicalRejectionReason(error: unknown): string {
  if (error instanceof UnsupportedEligibilityPolicyRuleError) return "UNSUPPORTED_GOVERNED_RULE";
  if (error instanceof Error && error.message === "UNSUPPORTED_GOVERNED_RULE") return "UNSUPPORTED_GOVERNED_RULE";
  if (error instanceof Error && POLICY_LINK_REJECTION_CODES.has(error.message)) return error.message;
  return "PROGRAMME_CONFIGURATION_INVALID";
}

/** Read-only orchestration. This function contains no persistence operation. */
export async function recommendLendersCanonical(
  request: CanonicalLenderRecommendationRequest,
  dependencies: CanonicalRecommendationDependencies = {},
): Promise<CanonicalLenderRecommendationResult> {
  if (!request.organizationId.trim()) throw new Error("ORGANIZATION_REQUIRED");
  const asOf = request.asOf ?? new Date();
  if (!["HOME_LOAN", "HOME_LOAN_BT"].includes(request.product) || !Number.isFinite(asOf.getTime())) {
    throw new Error("ASSESSMENT_CONTEXT_INVALID");
  }
  const loadInventory = dependencies.loadInventory ?? loadCanonicalProgrammeInventory;
  const runEngine = dependencies.runEngine ?? runHomeLoanRecommendationEngine;

  let inventory: CanonicalProgrammeInventory;
  try {
    inventory = await loadInventory({
      organizationId: request.organizationId,
      product: request.product,
      asOf,
    });
  } catch {
    return configurationFailure(request.product, asOf);
  }

  const accepted: CanonicalAssessmentProgramme[] = [];
  const rejectedProgrammes: CanonicalProgrammeRejection[] = [];
  for (const row of inventory.programmes) {
    try {
      const lender = row.lender;
      const effective = (value: Date | string | null | undefined, from: boolean) => value == null ||
        (Number.isFinite(new Date(value).getTime()) && (from ? new Date(value) <= asOf : new Date(value) >= asOf));
      if (!isCanonicalProgrammeAvailable({ programme: row as unknown as CanonicalProgrammeAvailabilityFields,
        organizationId: request.organizationId, product: request.product, asOf }) ||
        row.lifecycleStatus !== "active" || row.status !== "active" || row.approvalStatus !== "approved" || row.suspendedByOverride === true ||
        !lender || lender.organizationId !== request.organizationId || lender.enabled !== true || lender.isDeleted !== false ||
        lender.lifecycleStatus !== "active" || lender.operationalStatus !== "active" ||
        !effective(lender.effectiveFrom, true) || !effective(lender.effectiveUntil, false)) {
        rejectedProgrammes.push({ programmeId: row.id, code: row.code, reason: "PROGRAMME_UNAVAILABLE" });
        continue;
      }
      const programme = mapCanonicalProgramme({
          row,
          product: request.product,
          lenderCategory: inventory.lenderCategories.get(row.lenderId) ?? null,
          asOf,
        });
      const verdict = evaluateCanonicalEligibility(programme, request.customer, asOf);
      if (verdict) rejectedProgrammes.push({ programmeId: row.id, code: row.code, ...verdict });
      else accepted.push(programme);
    } catch (error) {
      rejectedProgrammes.push({
        programmeId: row.id,
        code: row.code,
        reason: canonicalRejectionReason(error),
      });
    }
  }

  // Age/seasoning were proved above at asOf. Avoid the shared legacy helper's separate wall clock.
  // Requested tenure remains supplied and checked; no programme maximum substitutes for it.
  const engine = runEngine({ customer: request.customer, programmes: accepted.map(programme => ({
    ...programme, maxAge: null, maxAgeAtMaturityYears: null, requiredSeasoningMonths: null,
  })), now: asOf });
  const byProgramme = new Map(accepted.map((row) => [row.id, row]));
  const recommendations = engine.cards.filter(card => {
    const programme = byProgramme.get(card.programmeId);
    if (!programme) throw new Error("ENGINE_RETURNED_UNKNOWN_PROGRAMME");
    if (canonicalCardSatisfies(programme, request.customer, card)) return true;
    rejectedProgrammes.push({ programmeId: programme.id, code: programme.code, reason: "ELIGIBILITY_NOT_MET" });
    return false;
  }).map((card) => {
    const programme = byProgramme.get(card.programmeId);
    if (!programme) throw new Error("ENGINE_RETURNED_UNKNOWN_PROGRAMME");
    const savingsKnown = request.product === "HOME_LOAN_BT" &&
      [request.customer.currentHomeLoanEmiRupees, request.customer.currentRoiPercent, request.customer.remainingTenureMonths]
        .every(value => typeof value === "number" && Number.isFinite(value) && value > 0) &&
      [request.customer.currentHomeLoanEmiCertainty, request.customer.currentRoiCertainty, request.customer.remainingTenureCertainty]
        .every(value => value === "exact" || value === "approximate");
    return {
      ...card,
      ...(request.product === "HOME_LOAN_BT" && !savingsKnown ? {
        savingSuppressed: true, monthlyEmiDifferenceRupees: null, indicativeSavingRupees: null,
        reasonCodes: card.reasonCodes.filter(reason => reason !== "BALANCE_TRANSFER_SAVING"),
        customerExplanation: "Programme assessment excludes savings because comparison information is incomplete.",
      } : {}),
      lenderScore: null as null,
      matchPercent: null,
      matchRank: null,
      presentationTier: null,
      criterionContributions: null,
      policyId: programme.policyId,
      policyVersionId: programme.policyVersionId,
      policyVersionNumber: programme.policyVersionNumber,
    };
  });

  const scored = await applyUniversalMatchPercent({
    request,
    recommendations,
    rejectedProgrammes,
    inventoryCount: inventory.programmes.length,
    acceptedCount: accepted.length,
    engine,
    dependencies,
  });
  return scored;
}

function configurationFailure(
  product: CanonicalLenderRecommendationRequest["product"],
  asOf: Date,
  extra: Partial<CanonicalLenderRecommendationResult> = {},
): CanonicalLenderRecommendationResult {
  return {
    status: "configuration_error",
    product,
    readOnly: true,
    recommendations: [],
    rejectedProgrammes: extra.rejectedProgrammes ?? [],
    retrievedProgrammeCount: extra.retrievedProgrammeCount ?? 0,
    evaluatedProgrammeCount: extra.evaluatedProgrammeCount ?? 0,
    presentation: { primaryProgrammeIds: [], additionalProgrammeIds: [] },
    matchPercent: extra.matchPercent ?? {
      ruleSetId: null,
      ruleSetLineageId: null,
      ruleSetVersion: null,
      weights: null,
      failureCode: "RULE_SET_REQUIRED",
    },
    versions: extra.versions ?? {
      calculationVersion: "unavailable",
      ruleSetVersion: null,
      categoryRuleVersion: null,
      lenderScoreVersion: null,
      ltvMasterVersion: null,
    },
    analyzedAt: extra.analyzedAt ?? asOf.toISOString(),
    missingInputs: extra.missingInputs,
    cibilNotKnownDisclaimer: extra.cibilNotKnownDisclaimer,
  };
}

async function applyUniversalMatchPercent(input: {
  request: CanonicalLenderRecommendationRequest;
  recommendations: CanonicalRecommendationCard[];
  rejectedProgrammes: CanonicalProgrammeRejection[];
  inventoryCount: number;
  acceptedCount: number;
  engine: ReturnType<typeof runHomeLoanRecommendationEngine>;
  dependencies: CanonicalRecommendationDependencies;
}): Promise<CanonicalLenderRecommendationResult> {
  const { request, recommendations, rejectedProgrammes, inventoryCount, acceptedCount, engine, dependencies } = input;
  const asOf = request.asOf ?? new Date();
  const base = {
    product: request.product,
    readOnly: true as const,
    rejectedProgrammes,
    retrievedProgrammeCount: inventoryCount,
    evaluatedProgrammeCount: acceptedCount,
    versions: { ...engine.versions, lenderScoreVersion: null as null, ruleSetVersion: null },
    analyzedAt: engine.analyzedAt,
    missingInputs: [...new Set(rejectedProgrammes.flatMap((row) => row.missingInputs ?? []))],
    cibilNotKnownDisclaimer: engine.cibilNotKnownDisclaimer,
  };

  if (recommendations.length === 0) {
    return {
      status: "no_eligible_programmes",
      ...base,
      recommendations,
      presentation: { primaryProgrammeIds: [], additionalProgrammeIds: [] },
      matchPercent: { ruleSetId: null, ruleSetLineageId: null, ruleSetVersion: null, weights: null, failureCode: null },
    };
  }

  let ruleSet: ActiveRecommendationRuleSet | null = null;
  if (dependencies.resolveActiveRuleSet) {
    const resolved = await dependencies.resolveActiveRuleSet({
      organizationId: request.organizationId,
      productCode: request.product,
    });
    if (resolved === "AMBIGUOUS") {
      return configurationFailure(request.product, asOf, {
        ...base,
        matchPercent: { ruleSetId: null, ruleSetLineageId: null, ruleSetVersion: null, weights: null, failureCode: "RULE_SET_AMBIGUOUS" },
      });
    }
    if (resolved === "INVALID") {
      return configurationFailure(request.product, asOf, {
        ...base,
        matchPercent: { ruleSetId: null, ruleSetLineageId: null, ruleSetVersion: null, weights: null, failureCode: "WEIGHTS_NOT_EXACTLY_100" },
      });
    }
    ruleSet = resolved;
  } else {
    const loaded = await loadActiveRecommendationRuleSet({
      organizationId: request.organizationId,
      productCode: request.product,
    });
    if (loaded.status === "ambiguous") {
      return configurationFailure(request.product, asOf, {
        ...base,
        matchPercent: { ruleSetId: null, ruleSetLineageId: null, ruleSetVersion: null, weights: null, failureCode: "RULE_SET_AMBIGUOUS" },
      });
    }
    if (loaded.status === "invalid") {
      return configurationFailure(request.product, asOf, {
        ...base,
        matchPercent: { ruleSetId: null, ruleSetLineageId: null, ruleSetVersion: null, weights: null, failureCode: loaded.reason },
      });
    }
    ruleSet = loaded.status === "resolved" ? loaded.ruleSet : null;
  }

  if (!ruleSet) {
    return configurationFailure(request.product, asOf, {
      ...base,
      matchPercent: { ruleSetId: null, ruleSetLineageId: null, ruleSetVersion: null, weights: null, failureCode: "RULE_SET_REQUIRED" },
    });
  }

  const registry = dependencies.criterionRegistry ?? createGovernedCriterionRegistry();
  const scored = scoreProgrammes({
    ruleSet,
    programmes: recommendations.map((card) => ({ programmeId: card.programmeId, context: { programmeId: card.programmeId } })),
    registry,
  });
  if (!scored.ok) {
    return configurationFailure(request.product, asOf, {
      ...base,
      versions: { ...base.versions, ruleSetVersion: String(ruleSet.versionNumber) },
      matchPercent: {
        ruleSetId: ruleSet.id,
        ruleSetLineageId: ruleSet.lineageId,
        ruleSetVersion: ruleSet.versionNumber,
        weights: { ...ruleSet.weights.selected },
        failureCode: scored.code,
      },
    });
  }

  const byId = new Map(scored.scores.map((row) => [row.programmeId, row]));
  if (recommendations.some((card) => !byId.has(card.programmeId))) {
    return configurationFailure(request.product, asOf, {
      ...base,
      versions: { ...base.versions, ruleSetVersion: String(ruleSet.versionNumber) },
      matchPercent: {
        ruleSetId: ruleSet.id,
        ruleSetLineageId: ruleSet.lineageId,
        ruleSetVersion: ruleSet.versionNumber,
        weights: { ...ruleSet.weights.selected },
        failureCode: "NON_SCORABLE",
      },
    });
  }
  const ranked = rankByMatchPercent(
    recommendations.map((card) => {
      const score = byId.get(card.programmeId)!;
      return {
        item: card,
        programmeId: card.programmeId,
        matchPercent: score.matchPercent,
        applicableRoiPercent: card.applicableRoiPercent,
        tentativeOfferRupees: card.tentativeOfferRupees,
      };
    }),
  );
  const slice = presentationSlice(ranked);
  const rankedCards: CanonicalRecommendationCard[] = ranked.map((row) => {
    const score = byId.get(row.programmeId);
    return {
      ...row.item,
      matchPercent: row.matchPercent,
      matchRank: row.rank,
      presentationTier: row.presentationTier,
      criterionContributions:
        score?.contributions.map((item) => ({
          criterionKey: item.criterionKey,
          criterionScore: item.criterionScore,
          weightPercent: item.weightPercent,
          weightedContribution: item.weightedContribution,
          status: item.status,
        })) ?? null,
    };
  });

  return {
    status: rankedCards.length ? "ready" : "no_eligible_programmes",
    ...base,
    recommendations: rankedCards,
    presentation: {
      primaryProgrammeIds: slice.primary.map((row) => row.programmeId),
      additionalProgrammeIds: slice.additional.map((row) => row.programmeId),
    },
    matchPercent: {
      ruleSetId: ruleSet.id,
      ruleSetLineageId: ruleSet.lineageId,
      ruleSetVersion: ruleSet.versionNumber,
      weights: { ...ruleSet.weights.selected },
      failureCode: null,
    },
    versions: { ...base.versions, ruleSetVersion: `${ruleSet.lineageId}:${ruleSet.versionNumber}` },
  };
}
