import type { ActiveRecommendationRuleSet } from "@/lib/product-recommendation/types";
import { normalizeDraftCriterionWeights } from "@/lib/product-recommendation/weights";
import { recommendationProductCodesEquivalent } from "@/lib/product-recommendation/product-code";

export type StoredRecommendationRuleSetRow = {
  id: string;
  organizationId: string;
  productCode: string;
  lineageId: string;
  versionNumber: number;
  weightsJson: unknown;
  labelledUnapproved: boolean;
  simulationOnly: boolean;
  lifecycleStatus: string;
  isDeleted?: boolean;
};

export type ResolveActiveRuleSetResult =
  | { status: "resolved"; ruleSet: ActiveRecommendationRuleSet }
  | { status: "missing" }
  | { status: "ambiguous" }
  | { status: "invalid"; reason: string };

export function resolveActiveRecommendationRuleSet(input: {
  organizationId: string;
  productCode: string;
  rows: StoredRecommendationRuleSetRow[];
}): ResolveActiveRuleSetResult {
  const eligible = input.rows.filter(
    (row) =>
      row.organizationId === input.organizationId &&
      row.isDeleted !== true &&
      row.lifecycleStatus === "active" &&
      row.simulationOnly === false &&
      row.labelledUnapproved === false &&
      recommendationProductCodesEquivalent(row.productCode, input.productCode),
  );
  if (eligible.length === 0) return { status: "missing" };
  if (eligible.length > 1) return { status: "ambiguous" };
  const row = eligible[0]!;
  const parsed = normalizeDraftCriterionWeights(row.weightsJson);
  if ("error" in parsed) return { status: "invalid", reason: parsed.error };
  return {
    status: "resolved",
    ruleSet: {
      id: row.id,
      organizationId: row.organizationId,
      productCode: row.productCode,
      lineageId: row.lineageId,
      versionNumber: row.versionNumber,
      weights: parsed,
      labelledUnapproved: row.labelledUnapproved,
      simulationOnly: row.simulationOnly,
      lifecycleStatus: row.lifecycleStatus,
    },
  };
}
