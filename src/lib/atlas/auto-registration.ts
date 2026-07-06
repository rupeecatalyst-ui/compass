/**
 * ATLAS Automatic Registration Framework.
 * Design-time hooks — invoked only when platform artifacts are authored in admin.
 * Never called from loan processing or business transaction paths.
 */

import { registerAtlasAsset } from "@/lib/atlas/atlas-store";
import { formatPolicyVersion } from "@/constants/credit-risk-policy-lifecycle";
import { formatRuleVersion } from "@/constants/rule-library";
import type { CreditRiskPolicySummary } from "@/types/credit-risk-engine";
import type { RuleLibraryVersion } from "@/types/rule-library";
import type { PolicyLifecycleStatus } from "@/types/credit-risk-engine";
import type { ArchitectureTimelineAction } from "@/types/atlas";
import type { WorkflowDefinition } from "@/types/workflow-engine";
import type { ProductDefinition } from "@/types/product-library";
import type { EnterpriseAsset } from "@/types/enterprise-asset-library";
import { formatWorkflowVersion } from "@/constants/workflow-engine";
import { formatProductVersion } from "@/constants/product-library-lifecycle";
import { formatEnterpriseAssetVersion } from "@/constants/enterprise-asset-lifecycle";

const RULE_LIBRARY_MODULE = "Rule Library";
const POLICY_LIBRARY_MODULE = "Policy Library";
const PRODUCT_LIBRARY_MODULE = "Product Library";
const EAL_MODULE = "Enterprise Asset Library";

function policyStatusToAssetStatus(status: PolicyLifecycleStatus) {
  const map: Record<PolicyLifecycleStatus, import("@/types/atlas").AtlasAssetStatus> = {
    draft: "development",
    validated: "review",
    testing: "review",
    approved: "review",
    published: "active",
    archived: "retired",
  };
  return map[status];
}

function ruleStatusToAssetStatus(status: RuleLibraryVersion["status"]) {
  const map: Record<RuleLibraryVersion["status"], import("@/types/atlas").AtlasAssetStatus> = {
    draft: "development",
    published: "active",
    archived: "retired",
  };
  return map[status];
}

/** Register or update a Rule Library artifact in ATLAS. */
export function registerAtlasFromRule(rule: RuleLibraryVersion): void {
  registerAtlasAsset({
    assetType: "rule",
    name: rule.ruleName,
    category: rule.categoryId,
    description: rule.description,
    module: RULE_LIBRARY_MODULE,
    owner: rule.ruleOwnerId,
    version: formatRuleVersion(rule.majorVersion, rule.minorVersion),
    status: ruleStatusToAssetStatus(rule.status),
    documentationStatus: rule.status === "published" ? "published" : "draft",
    parentAssetId: "CAP-000002",
    platformRef: { module: RULE_LIBRARY_MODULE, refId: rule.ruleId },
    timelineAction: "updated",
    actor: rule.createdBy,
    architectureMetadata: {
      metadataDriven: true,
      versionControlled: true,
      auditEnabled: true,
      permissionModelDefined: true,
      apiRegistered: false,
      eventsRegistered: false,
      configurationDriven: true,
      reusable: true,
      performanceBudgetDefined: false,
      noHardcodedBusinessLogic: true,
    },
  });
}

/** Register or update a Policy Library artifact in ATLAS. */
export function registerAtlasFromPolicy(policy: CreditRiskPolicySummary): void {
  registerAtlasAsset({
    assetType: "policy",
    name: policy.policyName,
    category: policy.productName,
    description: policy.description,
    module: POLICY_LIBRARY_MODULE,
    owner: policy.createdBy,
    version: formatPolicyVersion(policy.majorVersion, policy.minorVersion),
    status: policyStatusToAssetStatus(policy.status),
    documentationStatus: policy.status === "published" ? "published" : "draft",
    parentAssetId: "CAP-000003",
    platformRef: { module: POLICY_LIBRARY_MODULE, refId: policy.policyId },
    timelineAction: "updated",
    actor: policy.createdBy,
    architectureMetadata: {
      metadataDriven: true,
      versionControlled: true,
      auditEnabled: true,
      permissionModelDefined: true,
      apiRegistered: false,
      eventsRegistered: false,
      configurationDriven: true,
      reusable: true,
      performanceBudgetDefined: false,
      noHardcodedBusinessLogic: true,
    },
  });
}

/** Register or update a Workflow Engine definition in ATLAS. */
export function registerAtlasFromWorkflow(workflow: WorkflowDefinition): void {
  registerAtlasAsset({
    assetType: "workflow",
    name: workflow.workflowName,
    category: workflow.category,
    description: workflow.description,
    module: "Workflow Engine",
    owner: workflow.createdBy,
    version: formatWorkflowVersion(workflow.majorVersion, workflow.minorVersion),
    status: workflow.status === "published" ? "active" : workflow.status === "archived" ? "retired" : "development",
    documentationStatus: workflow.status === "published" ? "published" : "draft",
    parentAssetId: "CAP-000001",
    platformRef: { module: "Workflow Engine", refId: workflow.workflowId },
    timelineAction: "updated",
    actor: workflow.createdBy,
    architectureMetadata: {
      metadataDriven: true,
      versionControlled: true,
      auditEnabled: true,
      permissionModelDefined: true,
      apiRegistered: false,
      eventsRegistered: workflow.eventIds.length > 0,
      configurationDriven: true,
      reusable: true,
      performanceBudgetDefined: false,
      noHardcodedBusinessLogic: true,
    },
  });
}

/** Register or update a Product Library definition in ATLAS. */
export function registerAtlasFromProduct(product: ProductDefinition): void {
  const status =
    product.lifecycleStatus === "published"
      ? "active"
      : product.lifecycleStatus === "archived" || product.lifecycleStatus === "deprecated"
        ? "retired"
        : "development";

  registerAtlasAsset({
    assetType: "object",
    name: product.productName,
    category: product.productCode,
    description: product.description,
    module: PRODUCT_LIBRARY_MODULE,
    owner: product.productOwner,
    version: formatProductVersion(product.majorVersion, product.minorVersion),
    status,
    documentationStatus: product.lifecycleStatus === "published" ? "published" : "draft",
    parentAssetId: "CAP-000004",
    platformRef: { module: PRODUCT_LIBRARY_MODULE, refId: product.productId },
    timelineAction: "updated",
    actor: product.createdBy,
    architectureMetadata: {
      metadataDriven: true,
      versionControlled: true,
      auditEnabled: true,
      permissionModelDefined: true,
      apiRegistered: product.compositionAssets.some((a) => a.assetType === "API_INTEGRATION"),
      eventsRegistered: product.compositionAssets.some((a) => a.assetType === "NOTIFICATION_PACK"),
      configurationDriven: true,
      reusable: true,
      performanceBudgetDefined: false,
      noHardcodedBusinessLogic: true,
    },
  });
}

/** Register or update an Enterprise Asset Library artifact in ATLAS. */
export function registerAtlasFromEnterpriseAsset(asset: EnterpriseAsset): void {
  const status =
    asset.lifecycle === "published"
      ? "active"
      : asset.lifecycle === "archived" || asset.lifecycle === "deprecated"
        ? "retired"
        : "development";

  registerAtlasAsset({
    assetType: "object",
    name: asset.assetName,
    category: asset.assetType,
    description: asset.description,
    module: EAL_MODULE,
    owner: asset.owner,
    version: formatEnterpriseAssetVersion(asset.majorVersion, asset.minorVersion),
    status,
    documentationStatus: asset.lifecycle === "published" ? "published" : "draft",
    parentAssetId: "CAP-000005",
    platformRef: { module: EAL_MODULE, refId: asset.assetId },
    timelineAction: "updated",
    actor: asset.createdBy,
    architectureMetadata: {
      metadataDriven: true,
      versionControlled: true,
      auditEnabled: true,
      permissionModelDefined: true,
      apiRegistered: asset.assetType === "API_INTEGRATION",
      eventsRegistered: asset.assetType === "NOTIFICATION_PACK",
      configurationDriven: true,
      reusable: true,
      performanceBudgetDefined: false,
      noHardcodedBusinessLogic: true,
    },
  });
}

/** Map policy lifecycle transitions to ATLAS timeline actions. */
export function registerAtlasPolicyLifecycle(
  policy: CreditRiskPolicySummary,
  action: ArchitectureTimelineAction,
  actor: string,
): void {
  registerAtlasAsset({
    assetType: "policy",
    name: policy.policyName,
    category: policy.productName,
    description: policy.description,
    module: POLICY_LIBRARY_MODULE,
    owner: policy.createdBy,
    version: formatPolicyVersion(policy.majorVersion, policy.minorVersion),
    status: policyStatusToAssetStatus(policy.status),
    documentationStatus: policy.status === "published" ? "published" : "draft",
    parentAssetId: "CAP-000003",
    platformRef: { module: POLICY_LIBRARY_MODULE, refId: policy.policyId },
    timelineAction: action,
    actor,
  });
}
