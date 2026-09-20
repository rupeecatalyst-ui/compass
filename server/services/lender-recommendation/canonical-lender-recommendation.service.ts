import "server-only";

import { runHomeLoanRecommendationEngine } from "@/lib/home-loan-recommendation/engine";
import type {
  CanonicalLenderRecommendationRequest,
  CanonicalLenderRecommendationResult,
  CanonicalProgrammeRejection,
} from "@/types/canonical-lender-recommendation";
import {
  mapCanonicalProgramme,
  type CanonicalAssessmentProgramme,
} from "./programme-assessment-adapter";
import {
  loadCanonicalProgrammeInventory,
  type CanonicalProgrammeInventory,
} from "./recommendation-programme.repository";

export type CanonicalRecommendationDependencies = {
  loadInventory?: typeof loadCanonicalProgrammeInventory;
  runEngine?: typeof runHomeLoanRecommendationEngine;
};

/** Read-only orchestration. This function contains no persistence operation. */
export async function recommendLendersCanonical(
  request: CanonicalLenderRecommendationRequest,
  dependencies: CanonicalRecommendationDependencies = {},
): Promise<CanonicalLenderRecommendationResult> {
  if (!request.organizationId.trim()) throw new Error("ORGANIZATION_REQUIRED");
  const asOf = request.asOf ?? new Date();
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
      accepted.push(
        mapCanonicalProgramme({
          row,
          product: request.product,
          lenderCategory: inventory.lenderCategories.get(row.lenderId) ?? null,
          asOf,
        }),
      );
    } catch (error) {
      rejectedProgrammes.push({
        programmeId: row.id,
        code: row.code,
        reason: error instanceof Error ? error.message : "PROGRAMME_CONFIGURATION_INVALID",
      });
    }
  }

  const engine = runEngine({ customer: request.customer, programmes: accepted, now: asOf });
  const byProgramme = new Map(accepted.map((row) => [row.id, row]));
  const recommendations = engine.cards.map((card) => {
    const programme = byProgramme.get(card.programmeId);
    if (!programme) throw new Error("ENGINE_RETURNED_UNKNOWN_PROGRAMME");
    return {
      ...card,
      lenderScore: null as null,
      policyId: programme.policyId,
      policyVersionId: programme.policyVersionId,
      policyVersionNumber: programme.policyVersionNumber,
    };
  });

  return {
    status: recommendations.length ? "ready" : "no_eligible_programmes",
    product: request.product,
    readOnly: true,
    recommendations,
    rejectedProgrammes,
    retrievedProgrammeCount: inventory.programmes.length,
    evaluatedProgrammeCount: accepted.length,
    versions: { ...engine.versions, lenderScoreVersion: null },
    analyzedAt: engine.analyzedAt,
  };
}

function configurationFailure(
  product: CanonicalLenderRecommendationRequest["product"],
  asOf: Date,
): CanonicalLenderRecommendationResult {
  return {
    status: "configuration_error",
    product,
    readOnly: true,
    recommendations: [],
    rejectedProgrammes: [],
    retrievedProgrammeCount: 0,
    evaluatedProgrammeCount: 0,
    versions: {
      calculationVersion: "unavailable",
      ruleSetVersion: null,
      categoryRuleVersion: null,
      lenderScoreVersion: null,
      ltvMasterVersion: null,
    },
    analyzedAt: asOf.toISOString(),
  };
}
