/**
 * EPDE policy registry.
 */

import {
  EPDE_LIFECYCLE_ACTION_MAP,
  EPDE_POLICY_LIFECYCLE_STATUS,
} from "@/constants/enterprise-policy-decision-engine";
import type {
  EpdeDecisionMatrix,
  EpdeDecisionTable,
  EpdeDecisionTree,
  EpdePolicy,
  EpdePolicyGroup,
  EpdePolicyLifecycleAction,
  EpdePolicyLifecycleStatus,
  EpdePolicyVersion,
  EpdeRule,
  EpdeRuleSet,
  EpdeScoringModel,
} from "@/types/enterprise-policy-decision-engine";
import { recordEpdePolicyAudit } from "./audit-integration";
import { getEpdePorts } from "./composition";
import {
  assertEpdePolicyVersionValid,
  getEpdePublishedVersion,
  validateEpdeDecisionMatrix,
  validateEpdeDecisionTable,
  validateEpdeDecisionTree,
  validateEpdeLifecycleTransition,
  validateEpdePolicy,
  validateEpdeScoringModel,
} from "./validation-engine";

type CreatePolicyInput = Omit<
  EpdePolicy,
  "id" | "lifecycleStatus" | "active" | "enabled" | "createdOn" | "modifiedOn" | "modifiedBy" | "dependencyPolicyIds"
> &
  Partial<Pick<EpdePolicy, "active" | "enabled" | "dependencyPolicyIds" | "parentPolicyId" | "tenantId" | "effectiveFrom" | "effectiveTo">>;

export function registerEpdePolicy(input: CreatePolicyInput): EpdePolicy {
  const now = new Date().toISOString();
  const policy: EpdePolicy = {
    id: crypto.randomUUID(),
    tenantId: input.tenantId,
    policyCode: input.policyCode,
    policyName: input.policyName,
    description: input.description,
    category: input.category,
    priority: input.priority,
    scopes: input.scopes,
    parentPolicyId: input.parentPolicyId,
    dependencyPolicyIds: input.dependencyPolicyIds ?? [],
    lifecycleStatus: EPDE_POLICY_LIFECYCLE_STATUS.DRAFT,
    active: input.active ?? true,
    enabled: input.enabled ?? true,
    effectiveFrom: input.effectiveFrom,
    effectiveTo: input.effectiveTo,
    createdBy: input.createdBy,
    createdOn: now,
    modifiedBy: input.createdBy,
    modifiedOn: now,
  };

  const validation = validateEpdePolicy(getEpdePorts().policies, policy);
  if (!validation.valid) throw new Error(validation.issues.map((i) => i.message).join("; "));

  getEpdePorts().policies.save(policy);
  recordEpdePolicyAudit({
    entityId: policy.id,
    entityType: "policy",
    action: "created",
    actorId: input.createdBy,
    newStateRef: policy.lifecycleStatus,
    remarks: `Registered policy ${policy.policyCode}`,
  });

  return policy;
}

export function createEpdePolicyVersion(
  input: Omit<EpdePolicyVersion, "id" | "lifecycleStatus" | "createdOn" | "modifiedOn">,
): EpdePolicyVersion {
  const now = new Date().toISOString();
  const version: EpdePolicyVersion = {
    ...input,
    id: crypto.randomUUID(),
    lifecycleStatus: EPDE_POLICY_LIFECYCLE_STATUS.DRAFT,
    createdOn: now,
    modifiedOn: now,
  };

  assertEpdePolicyVersionValid(version);
  getEpdePorts().versions.save(version);
  recordEpdePolicyAudit({
    entityId: version.id,
    entityType: "policy_version",
    action: "created",
    actorId: input.createdBy,
    remarks: `Created policy version ${version.policyCode}`,
  });

  return version;
}

export function registerEpdePolicyGroup(
  input: Omit<EpdePolicyGroup, "id" | "createdOn">,
): EpdePolicyGroup {
  const duplicate = getEpdePorts().policyGroups.findByCode(input.groupCode);
  if (duplicate) throw new Error(`EPDE: policy group code "${input.groupCode}" already exists.`);

  const group: EpdePolicyGroup = {
    ...input,
    id: crypto.randomUUID(),
    createdOn: new Date().toISOString(),
  };

  getEpdePorts().policyGroups.save(group);
  recordEpdePolicyAudit({
    entityId: group.id,
    entityType: "policy_group",
    action: "created",
    actorId: input.createdBy,
    remarks: `Registered policy group ${group.groupCode}`,
  });

  return group;
}

export function registerEpdeRule(input: Omit<EpdeRule, "id" | "createdOn">): EpdeRule {
  const duplicate = getEpdePorts().rules.findByCode(input.ruleCode);
  if (duplicate) throw new Error(`EPDE: rule code "${input.ruleCode}" already exists.`);

  const rule: EpdeRule = { ...input, id: crypto.randomUUID(), createdOn: new Date().toISOString() };
  getEpdePorts().rules.save(rule);
  recordEpdePolicyAudit({ entityId: rule.id, entityType: "rule", action: "created", actorId: input.createdBy });
  return rule;
}

export function registerEpdeRuleSet(input: Omit<EpdeRuleSet, "id" | "createdOn" | "groupIds"> & { groupIds?: string[] }): EpdeRuleSet {
  const duplicate = getEpdePorts().ruleSets.findByCode(input.setCode);
  if (duplicate) throw new Error(`EPDE: rule set code "${input.setCode}" already exists.`);

  const ruleSet: EpdeRuleSet = {
    ...input,
    id: crypto.randomUUID(),
    groupIds: input.groupIds ?? [],
    createdOn: new Date().toISOString(),
  };

  getEpdePorts().ruleSets.save(ruleSet);
  recordEpdePolicyAudit({ entityId: ruleSet.id, entityType: "rule_set", action: "created", actorId: input.createdBy });
  return ruleSet;
}

export function registerEpdeDecisionTable(input: Omit<EpdeDecisionTable, "id" | "lifecycleStatus" | "createdOn">): EpdeDecisionTable {
  const duplicate = getEpdePorts().decisionTables.findByCode(input.tableCode);
  if (duplicate) throw new Error(`EPDE: decision table "${input.tableCode}" already exists.`);

  const table: EpdeDecisionTable = {
    ...input,
    id: crypto.randomUUID(),
    lifecycleStatus: EPDE_POLICY_LIFECYCLE_STATUS.DRAFT,
    createdOn: new Date().toISOString(),
  };

  const validation = validateEpdeDecisionTable(table);
  if (!validation.valid) throw new Error(validation.issues.map((i) => i.message).join("; "));

  getEpdePorts().decisionTables.save(table);
  recordEpdePolicyAudit({ entityId: table.id, entityType: "decision_table", action: "created", actorId: input.createdBy });
  return table;
}

export function registerEpdeDecisionTree(input: Omit<EpdeDecisionTree, "id" | "lifecycleStatus" | "createdOn">): EpdeDecisionTree {
  const duplicate = getEpdePorts().decisionTrees.findByCode(input.treeCode);
  if (duplicate) throw new Error(`EPDE: decision tree "${input.treeCode}" already exists.`);

  const tree: EpdeDecisionTree = {
    ...input,
    id: crypto.randomUUID(),
    lifecycleStatus: EPDE_POLICY_LIFECYCLE_STATUS.DRAFT,
    createdOn: new Date().toISOString(),
  };

  const validation = validateEpdeDecisionTree(tree);
  if (!validation.valid) throw new Error(validation.issues.map((i) => i.message).join("; "));

  getEpdePorts().decisionTrees.save(tree);
  recordEpdePolicyAudit({ entityId: tree.id, entityType: "decision_tree", action: "created", actorId: input.createdBy });
  return tree;
}

export function registerEpdeDecisionMatrix(input: Omit<EpdeDecisionMatrix, "id" | "lifecycleStatus" | "createdOn">): EpdeDecisionMatrix {
  const duplicate = getEpdePorts().decisionMatrices.findByCode(input.matrixCode);
  if (duplicate) throw new Error(`EPDE: decision matrix "${input.matrixCode}" already exists.`);

  const matrix: EpdeDecisionMatrix = {
    ...input,
    id: crypto.randomUUID(),
    lifecycleStatus: EPDE_POLICY_LIFECYCLE_STATUS.DRAFT,
    createdOn: new Date().toISOString(),
  };

  const validation = validateEpdeDecisionMatrix(matrix);
  if (!validation.valid) throw new Error(validation.issues.map((i) => i.message).join("; "));

  getEpdePorts().decisionMatrices.save(matrix);
  return matrix;
}

export function registerEpdeScoringModel(input: Omit<EpdeScoringModel, "id" | "lifecycleStatus" | "createdOn">): EpdeScoringModel {
  const duplicate = getEpdePorts().scoringModels.findByCode(input.modelCode);
  if (duplicate) throw new Error(`EPDE: scoring model "${input.modelCode}" already exists.`);

  const model: EpdeScoringModel = {
    ...input,
    id: crypto.randomUUID(),
    lifecycleStatus: EPDE_POLICY_LIFECYCLE_STATUS.DRAFT,
    createdOn: new Date().toISOString(),
  };

  const validation = validateEpdeScoringModel(model);
  if (!validation.valid) throw new Error(validation.issues.map((i) => i.message).join("; "));

  getEpdePorts().scoringModels.save(model);
  return model;
}

export function transitionEpdePolicyLifecycle(input: {
  policyId: string;
  action: EpdePolicyLifecycleAction;
  actorId: string;
}): EpdePolicy | undefined {
  const policy = getEpdePorts().policies.findById(input.policyId);
  if (!policy) return undefined;

  if (input.action === "activate") {
    const updated = { ...policy, active: true, modifiedBy: input.actorId, modifiedOn: new Date().toISOString() };
    getEpdePorts().policies.save(updated);
    return updated;
  }

  if (input.action === "deactivate") {
    const updated = { ...policy, active: false, modifiedBy: input.actorId, modifiedOn: new Date().toISOString() };
    getEpdePorts().policies.save(updated);
    return updated;
  }

  const target = EPDE_LIFECYCLE_ACTION_MAP[input.action] as EpdePolicyLifecycleStatus;
  validateEpdeLifecycleTransition(policy.lifecycleStatus, target);

  if (input.action === "publish") {
    const published = getEpdePublishedVersion(policy.id);
    if (!published) throw new Error("EPDE: cannot publish policy without a published version.");
    assertEpdePolicyVersionValid(published);
  }

  const updated: EpdePolicy = {
    ...policy,
    lifecycleStatus: target,
    modifiedBy: input.actorId,
    modifiedOn: new Date().toISOString(),
  };

  getEpdePorts().policies.save(updated);
  recordEpdePolicyAudit({
    entityId: policy.id,
    entityType: "policy",
    action: target === EPDE_POLICY_LIFECYCLE_STATUS.ARCHIVED ? "archived" : "published",
    actorId: input.actorId,
    previousStateRef: policy.lifecycleStatus,
    newStateRef: target,
  });

  return updated;
}

export function transitionEpdePolicyVersionLifecycle(input: {
  versionId: string;
  action: EpdePolicyLifecycleAction;
  actorId: string;
}): EpdePolicyVersion | undefined {
  const version = getEpdePorts().versions.findById(input.versionId);
  if (!version) return undefined;

  const target = EPDE_LIFECYCLE_ACTION_MAP[input.action] as EpdePolicyLifecycleStatus;
  validateEpdeLifecycleTransition(version.lifecycleStatus, target);

  if (["validate", "approve", "publish"].includes(input.action)) {
    assertEpdePolicyVersionValid(version);
  }

  const now = new Date().toISOString();
  const updated: EpdePolicyVersion = {
    ...version,
    lifecycleStatus: target,
    modifiedBy: input.actorId,
    modifiedOn: now,
    ...(input.action === "publish" ? { publishedOn: now, publishedBy: input.actorId } : {}),
  };

  getEpdePorts().versions.save(updated);
  recordEpdePolicyAudit({
    entityId: version.id,
    entityType: "policy_version",
    action: target === EPDE_POLICY_LIFECYCLE_STATUS.ARCHIVED ? "archived" : "published",
    actorId: input.actorId,
    previousStateRef: version.lifecycleStatus,
    newStateRef: target,
  });

  return updated;
}

export function getEpdePolicyByCode(policyCode: string, tenantId?: string): EpdePolicy | undefined {
  return getEpdePorts().policies.findByCode(policyCode, tenantId);
}

export function listEpdePolicies(): EpdePolicy[] {
  return getEpdePorts().policies.list();
}

export function publishEpdeArtifact(
  kind: "decision_table" | "decision_tree" | "decision_matrix" | "scoring_model",
  id: string,
): void {
  const status = EPDE_POLICY_LIFECYCLE_STATUS.PUBLISHED;
  if (kind === "decision_table") {
    const t = getEpdePorts().decisionTables.findById(id);
    if (t) getEpdePorts().decisionTables.save({ ...t, lifecycleStatus: status });
  } else if (kind === "decision_tree") {
    const t = getEpdePorts().decisionTrees.findById(id);
    if (t) getEpdePorts().decisionTrees.save({ ...t, lifecycleStatus: status });
  } else if (kind === "decision_matrix") {
    const m = getEpdePorts().decisionMatrices.findById(id);
    if (m) getEpdePorts().decisionMatrices.save({ ...m, lifecycleStatus: status });
  } else {
    const m = getEpdePorts().scoringModels.findById(id);
    if (m) getEpdePorts().scoringModels.save({ ...m, lifecycleStatus: status });
  }
}
