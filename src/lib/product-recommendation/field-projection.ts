/**
 * Application-layer projection: discover from canonical sources, then apply mapping overlays.
 * Overlay is pairing / aliases only. A field appears because its source created it.
 */

import type { OpportunityAssessmentFactsV1 } from "@/types/opportunity-assessment";
import { recommendationProductCodesEquivalent } from "./product-code";
import { RECOMMENDATION_EVALUATOR_TYPES } from "./evaluator-types";
import { discoverCanonicalRecommendationFields } from "./discover-canonical-fields";
import type { ProjectedRecommendationField } from "./types";

const unimplemented = RECOMMENDATION_EVALUATOR_TYPES.NOT_IMPLEMENTED;
const HL = ["HOME_LOAN", "HOME_LOAN_BT"] as const;

type FieldBindingOverlay = {
  programmeFactRef?: string | null;
  aliases?: readonly string[];
  notes?: string;
  evaluatorType?: ProjectedRecommendationField["evaluatorType"];
  scoreability?: ProjectedRecommendationField["scoreability"];
};

/**
 * Mapping overlay only. Does not cause a field to appear.
 * Comparison pairing and historical aliases live here.
 */
const RECOMMENDATION_FIELD_BINDINGS: Record<string, FieldBindingOverlay> = {
  "assessment:incomeAndObligations.monthlyIncome": { programmeFactRef: "ppo:minIncomeExact" },
  "assessment:loanRequirement.requestedAmount": { programmeFactRef: "ppo:minLoanAmountExact" },
  "assessment:incomeAndObligations.requestedTenureMonths": { programmeFactRef: "ppo:maxTenureMonths" },
  "assessment:cibil.exactScore": {
    programmeFactRef: "ppo:minCibil",
    notes: "CIBIL A/B/C category remains candidate-universe logic and is not this field.",
  },
  "derived:foirPercent": {
    programmeFactRef: "ppo:maxFoirExact",
    aliases: ["foirFit"],
    evaluatorType: RECOMMENDATION_EVALUATOR_TYPES.WITHIN_NORM_OR_PENDING,
    scoreability: "fully_scorable",
  },
  "derived:ltvPercent": {
    programmeFactRef: "ppo:maxLtvExact",
    aliases: ["ltvFit"],
    evaluatorType: RECOMMENDATION_EVALUATOR_TYPES.PENDING_CONTRACT,
    scoreability: "inputs_wired_scoring_contract_pending",
    notes: "Actual LTV is calculated. The 0–100 LTV scoring curve is not business-approved.",
  },
  "derived:ageYears": { programmeFactRef: "ppo:minAge" },
  "derived:ageAtMaturityYears": { programmeFactRef: "ppo:maxAge" },
  "derived:applicableRoiPercent": {
    programmeFactRef: "ppo:minRoiExact",
    aliases: ["roiCompetitiveness"],
    evaluatorType: RECOMMENDATION_EVALUATOR_TYPES.LOWEST_AMONG_ELIGIBLE_OR_PENDING,
    scoreability: "fully_scorable",
  },
  "derived:assessedOfferRupees": {
    aliases: ["eligibleAmount", "fundingFit"],
    evaluatorType: RECOMMENDATION_EVALUATOR_TYPES.CAPPED_REQUIREMENT_RATIO,
    scoreability: "fully_scorable",
  },
  "derived:effectiveTenureMonths": {
    aliases: ["tenureAvailability"],
    evaluatorType: RECOMMENDATION_EVALUATOR_TYPES.RELATIVE_TO_ELIGIBLE_MAX,
    scoreability: "fully_scorable",
  },
  "derived:btSavingsRupees": { aliases: ["balanceTransferBenefit"] },
};

function compatibilityAlias(
  id: string,
  label: string,
  alias: string,
  sourceKind: ProjectedRecommendationField["sourceKind"],
  valueType: ProjectedRecommendationField["valueType"],
  programmeFactRef: string | null = null,
): ProjectedRecommendationField {
  return {
    id,
    label,
    productCodes: HL,
    sourceKind,
    fieldKind: "compatibility_alias",
    valueType,
    customerFactRef: null,
    programmeFactRef,
    evaluatorType: unimplemented,
    selectable: false,
    scoreability: "not_implemented",
    aliases: [alias],
    notes: "Compatibility only. Not a governed selectable field.",
  };
}

const COMPATIBILITY_ALIASES: readonly ProjectedRecommendationField[] = [
  compatibilityAlias("legacy:lenderScore", "Lender score", "lenderScore", "raw", "number"),
  compatibilityAlias("legacy:policyEligibilityFit", "Policy eligibility fit", "policyEligibilityFit", "derived", "number"),
  compatibilityAlias("legacy:approvalReliability", "Approval reliability", "approvalReliability", "derived", "number"),
  compatibilityAlias(
    "legacy:turnaroundTime",
    "Turnaround time",
    "turnaroundTime",
    "raw",
    "integer",
    "ppo:averageTatDays",
  ),
  compatibilityAlias("legacy:feesAndTotalCost", "Fees and total cost", "feesAndTotalCost", "derived", "currency"),
  compatibilityAlias(
    "legacy:tenureEmiFlexibility",
    "Tenure / EMI flexibility",
    "tenureEmiFlexibility",
    "derived",
    "number",
  ),
  compatibilityAlias(
    "legacy:eligibilityGapProximity",
    "Eligibility gap proximity",
    "eligibilityGapProximity",
    "derived",
    "number",
  ),
  compatibilityAlias("legacy:topUpSuitability", "Top-up suitability", "topUpSuitability", "derived", "number"),
];

function applyBindingOverlay(row: ProjectedRecommendationField): ProjectedRecommendationField {
  const overlay = RECOMMENDATION_FIELD_BINDINGS[row.id];
  if (!overlay) return row;
  return {
    ...row,
    programmeFactRef: overlay.programmeFactRef !== undefined ? overlay.programmeFactRef : row.programmeFactRef,
    aliases: overlay.aliases ?? row.aliases,
    notes: overlay.notes ?? row.notes,
    evaluatorType: overlay.evaluatorType ?? row.evaluatorType,
    scoreability: overlay.scoreability ?? row.scoreability,
  };
}

export function projectCanonicalRecommendationFields(input?: {
  assessmentFacts?: OpportunityAssessmentFactsV1;
  additional?: readonly ProjectedRecommendationField[];
}): ProjectedRecommendationField[] {
  const discovered = discoverCanonicalRecommendationFields({ assessmentFacts: input?.assessmentFacts }).map(
    applyBindingOverlay,
  );
  const byId = new Map(discovered.map((row) => [row.id, row]));
  for (const row of COMPATIBILITY_ALIASES) {
    if (!byId.has(row.id)) byId.set(row.id, row);
  }
  for (const row of input?.additional ?? []) {
    byId.set(row.id, row);
  }
  return [...byId.values()];
}

/**
 * Frozen snapshot of default discovery (empty Assessment facts + IDC + PPO + derived calculators).
 * Live picker should prefer projectCanonicalRecommendationFields / listProjectedRecommendationFields.
 */
export const CANONICAL_RECOMMENDATION_FIELD_PROJECTION: readonly ProjectedRecommendationField[] =
  projectCanonicalRecommendationFields();

export function listProjectedRecommendationFields(input: {
  productCode: string;
  additional?: readonly ProjectedRecommendationField[];
  includeNonSelectable?: boolean;
  assessmentFacts?: OpportunityAssessmentFactsV1;
}): ProjectedRecommendationField[] {
  const rows = projectCanonicalRecommendationFields({
    assessmentFacts: input.assessmentFacts,
    additional: input.additional,
  });
  return rows.filter((row) => {
    if (!input.includeNonSelectable && !row.selectable) return false;
    return row.productCodes.some((code) => recommendationProductCodesEquivalent(code, input.productCode));
  });
}

export function resolveProjectedField(
  key: string,
  catalog: readonly ProjectedRecommendationField[] = CANONICAL_RECOMMENDATION_FIELD_PROJECTION,
): ProjectedRecommendationField | null {
  const trimmed = key.trim();
  if (!trimmed) return null;
  return (
    catalog.find((row) => row.id === trimmed) ?? catalog.find((row) => row.aliases.includes(trimmed)) ?? null
  );
}

export function canonicalFieldIdForKey(
  key: string,
  catalog: readonly ProjectedRecommendationField[] = CANONICAL_RECOMMENDATION_FIELD_PROJECTION,
): string {
  return resolveProjectedField(key, catalog)?.id ?? key;
}

export function fieldIsSelected(weights: Record<string, number>, field: ProjectedRecommendationField): boolean {
  if (Object.prototype.hasOwnProperty.call(weights, field.id)) return true;
  return field.aliases.some((alias) => Object.prototype.hasOwnProperty.call(weights, alias));
}

export function selectedWeightForField(
  weights: Record<string, number>,
  field: ProjectedRecommendationField,
): number | undefined {
  if (Object.prototype.hasOwnProperty.call(weights, field.id)) return weights[field.id];
  for (const alias of field.aliases) {
    if (Object.prototype.hasOwnProperty.call(weights, alias)) return weights[alias];
  }
  return undefined;
}

export function deselectFieldKeys(
  weights: Record<string, number>,
  field: ProjectedRecommendationField,
): Record<string, number> {
  const next = { ...weights };
  delete next[field.id];
  for (const alias of field.aliases) delete next[alias];
  return next;
}
