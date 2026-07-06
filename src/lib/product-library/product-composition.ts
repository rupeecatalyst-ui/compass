import type { EnterpriseAssetType, ProductDefinition } from "@/types/product-library";

const REQUIRED_ASSET_TYPES: EnterpriseAssetType[] = [
  "DOCUMENT_PACK",
  "SLA_PACK",
  "CHECKLIST_PACK",
  "COMPLIANCE_PACK",
];

/**
 * Enterprise Product Composition Engine — design-time completeness checks.
 * No execution, pricing, eligibility, or EAL runtime behaviour.
 */

export function hasEnterpriseAssets(def: ProductDefinition): boolean {
  return def.compositionAssets.length > 0;
}

export function hasRequiredEnterpriseAssetTypes(def: ProductDefinition): boolean {
  const types = new Set(def.compositionAssets.map((a) => a.assetType));
  return REQUIRED_ASSET_TYPES.every((t) => types.has(t));
}

export function isCompositionComplete(def: ProductDefinition): boolean {
  return (
    def.policyIds.length > 0 &&
    def.workflowIds.length > 0 &&
    def.ruleIds.length > 0 &&
    def.decisionMatrixIds.length > 0 &&
    hasRequiredEnterpriseAssetTypes(def)
  );
}

export function isReadyForPublishing(def: ProductDefinition): boolean {
  return isCompositionComplete(def) && def.lifecycleStatus === "approved";
}

export function getCompositionGaps(def: ProductDefinition): string[] {
  const gaps: string[] = [];
  if (def.policyIds.length === 0) gaps.push("policies");
  if (def.workflowIds.length === 0) gaps.push("workflows");
  if (def.ruleIds.length === 0) gaps.push("rules");
  if (def.decisionMatrixIds.length === 0) gaps.push("decision_matrices");
  if (!hasEnterpriseAssets(def)) gaps.push("enterprise_assets");
  else if (!hasRequiredEnterpriseAssetTypes(def)) gaps.push("required_enterprise_asset_types");
  return gaps;
}

export function countCompositionReferences(def: ProductDefinition): number {
  return (
    def.policyIds.length +
    def.workflowIds.length +
    def.ruleIds.length +
    def.decisionMatrixIds.length +
    def.documentIds.length +
    def.compositionAssets.length
  );
}
