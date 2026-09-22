import "server-only";

import { runHomeLoanRecommendationEngine } from "@/lib/home-loan-recommendation/engine";
import { evaluateCanonicalEligibility, canonicalCardSatisfies } from "./canonical-governed-eligibility";
import { isCanonicalProgrammeAvailable, type CanonicalProgrammeAvailabilityFields } from "./programme-availability";
import { UnsupportedEligibilityPolicyRuleError } from "./policy-rule-parser";
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
        reason: error instanceof UnsupportedEligibilityPolicyRuleError ||
          (error instanceof Error && error.message === "UNSUPPORTED_GOVERNED_RULE")
          ? "UNSUPPORTED_GOVERNED_RULE" : "PROGRAMME_CONFIGURATION_INVALID",
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
    missingInputs: [...new Set(rejectedProgrammes.flatMap(row => row.missingInputs ?? []))],
    cibilNotKnownDisclaimer: engine.cibilNotKnownDisclaimer,
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
