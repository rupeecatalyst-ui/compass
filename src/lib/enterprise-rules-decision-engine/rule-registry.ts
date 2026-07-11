/**
 * ERDE rule registry — definitions, versions, sets, groups, lifecycle.
 */

import {
  ERDE_LIFECYCLE_ACTION_MAP,
  ERDE_RULE_LIFECYCLE_STATUS,
} from "@/constants/enterprise-rules-decision-engine";
import type {
  ErdeDecisionTable,
  ErdeDecisionTree,
  ErdeRule,
  ErdeRuleGroup,
  ErdeRuleLifecycleAction,
  ErdeRuleLifecycleStatus,
  ErdeRuleSet,
  ErdeRuleVersion,
} from "@/types/enterprise-rules-decision-engine";
import { recordErdeRuleAudit } from "./audit-integration";
import { getErdePorts } from "./composition";
import {
  assertErdeRuleVersionValid,
  validateErdeDecisionTable,
  validateErdeDecisionTree,
  validateErdeLifecycleTransition,
  validateErdeRule,
} from "./validation-engine";

type CreateRuleInput = Omit<
  ErdeRule,
  "id" | "lifecycleStatus" | "active" | "enabled" | "createdOn" | "modifiedOn" | "modifiedBy" | "tags" | "dependencyRuleIds"
> &
  Partial<Pick<ErdeRule, "active" | "enabled" | "tags" | "dependencyRuleIds" | "parentRuleId" | "tenantId">>;

export function registerErdeRule(input: CreateRuleInput): ErdeRule {
  const now = new Date().toISOString();
  const rule: ErdeRule = {
    id: crypto.randomUUID(),
    tenantId: input.tenantId,
    ruleCode: input.ruleCode,
    ruleName: input.ruleName,
    description: input.description,
    category: input.category,
    priority: input.priority,
    tags: input.tags ?? [],
    parentRuleId: input.parentRuleId,
    dependencyRuleIds: input.dependencyRuleIds ?? [],
    lifecycleStatus: ERDE_RULE_LIFECYCLE_STATUS.DRAFT,
    active: input.active ?? true,
    enabled: input.enabled ?? true,
    createdBy: input.createdBy,
    createdOn: now,
    modifiedBy: input.createdBy,
    modifiedOn: now,
  };

  const validation = validateErdeRule(getErdePorts().rules, rule);
  if (!validation.valid) {
    throw new Error(validation.issues.map((i) => i.message).join("; "));
  }

  getErdePorts().rules.save(rule);
  recordErdeRuleAudit({
    entityId: rule.id,
    entityType: "rule",
    action: "created",
    actorId: input.createdBy,
    newStateRef: rule.lifecycleStatus,
    remarks: `Registered rule ${rule.ruleCode}`,
  });

  return rule;
}

export function createErdeRuleVersion(
  input: Omit<ErdeRuleVersion, "id" | "lifecycleStatus" | "createdOn" | "modifiedOn">,
): ErdeRuleVersion {
  const now = new Date().toISOString();
  const version: ErdeRuleVersion = {
    ...input,
    id: crypto.randomUUID(),
    lifecycleStatus: ERDE_RULE_LIFECYCLE_STATUS.DRAFT,
    createdOn: now,
    modifiedOn: now,
  };

  const duplicate = getErdePorts().versions.findByRuleAndVersion(
    version.ruleId,
    version.versionMajor,
    version.versionMinor,
  );
  if (duplicate) {
    throw new Error(
      `ERDE: version ${version.versionMajor}.${version.versionMinor} already exists for rule.`,
    );
  }

  assertErdeRuleVersionValid(version);
  getErdePorts().versions.save(version);

  recordErdeRuleAudit({
    entityId: version.id,
    entityType: "rule_version",
    action: "created",
    actorId: input.createdBy,
    remarks: `Created rule version ${version.ruleCode} v${version.versionMajor}.${version.versionMinor}`,
  });

  return version;
}

export function registerErdeRuleSet(
  input: Omit<ErdeRuleSet, "id" | "lifecycleStatus" | "createdOn" | "modifiedOn" | "modifiedBy" | "groupIds"> &
    Partial<Pick<ErdeRuleSet, "groupIds">>,
): ErdeRuleSet {
  const duplicate = getErdePorts().ruleSets.findByCode(input.setCode);
  if (duplicate) {
    throw new Error(`ERDE: rule set code "${input.setCode}" already exists.`);
  }

  const now = new Date().toISOString();
  const ruleSet: ErdeRuleSet = {
    ...input,
    id: crypto.randomUUID(),
    groupIds: input.groupIds ?? [],
    lifecycleStatus: ERDE_RULE_LIFECYCLE_STATUS.DRAFT,
    createdOn: now,
    modifiedOn: now,
    modifiedBy: input.createdBy,
  };

  getErdePorts().ruleSets.save(ruleSet);
  recordErdeRuleAudit({
    entityId: ruleSet.id,
    entityType: "rule_set",
    action: "created",
    actorId: input.createdBy,
    remarks: `Registered rule set ${ruleSet.setCode}`,
  });

  return ruleSet;
}

export function registerErdeRuleGroup(
  input: Omit<ErdeRuleGroup, "id" | "createdOn">,
): ErdeRuleGroup {
  const ruleSet = getErdePorts().ruleSets.findById(input.ruleSetId);
  if (!ruleSet) {
    throw new Error(`ERDE: rule set "${input.ruleSetId}" not found.`);
  }

  const group: ErdeRuleGroup = {
    ...input,
    id: crypto.randomUUID(),
    createdOn: new Date().toISOString(),
  };

  getErdePorts().ruleGroups.save(group);
  getErdePorts().ruleSets.save({
    ...ruleSet,
    groupIds: [...ruleSet.groupIds, group.id],
    modifiedOn: new Date().toISOString(),
  });

  recordErdeRuleAudit({
    entityId: group.id,
    entityType: "rule_group",
    action: "created",
    actorId: input.createdBy,
    remarks: `Registered rule group ${group.groupCode}`,
  });

  return group;
}

export function registerErdeDecisionTable(
  input: Omit<ErdeDecisionTable, "id" | "lifecycleStatus" | "createdOn">,
): ErdeDecisionTable {
  const duplicate = getErdePorts().decisionTables.findByCode(input.tableCode);
  if (duplicate) {
    throw new Error(`ERDE: decision table code "${input.tableCode}" already exists.`);
  }

  const table: ErdeDecisionTable = {
    ...input,
    id: crypto.randomUUID(),
    lifecycleStatus: ERDE_RULE_LIFECYCLE_STATUS.DRAFT,
    createdOn: new Date().toISOString(),
  };

  const validation = validateErdeDecisionTable(table);
  if (!validation.valid) {
    throw new Error(validation.issues.map((i) => i.message).join("; "));
  }

  getErdePorts().decisionTables.save(table);
  recordErdeRuleAudit({
    entityId: table.id,
    entityType: "decision_table",
    action: "created",
    actorId: input.createdBy,
    remarks: `Registered decision table ${table.tableCode}`,
  });

  return table;
}

export function registerErdeDecisionTree(
  input: Omit<ErdeDecisionTree, "id" | "lifecycleStatus" | "createdOn">,
): ErdeDecisionTree {
  const duplicate = getErdePorts().decisionTrees.findByCode(input.treeCode);
  if (duplicate) {
    throw new Error(`ERDE: decision tree code "${input.treeCode}" already exists.`);
  }

  const tree: ErdeDecisionTree = {
    ...input,
    id: crypto.randomUUID(),
    lifecycleStatus: ERDE_RULE_LIFECYCLE_STATUS.DRAFT,
    createdOn: new Date().toISOString(),
  };

  const validation = validateErdeDecisionTree(tree);
  if (!validation.valid) {
    throw new Error(validation.issues.map((i) => i.message).join("; "));
  }

  getErdePorts().decisionTrees.save(tree);
  recordErdeRuleAudit({
    entityId: tree.id,
    entityType: "decision_tree",
    action: "created",
    actorId: input.createdBy,
    remarks: `Registered decision tree ${tree.treeCode}`,
  });

  return tree;
}

export function transitionErdeRuleLifecycle(input: {
  ruleId: string;
  action: ErdeRuleLifecycleAction;
  actorId: string;
  remarks?: string;
}): ErdeRule | undefined {
  const rule = getErdePorts().rules.findById(input.ruleId);
  if (!rule) return undefined;

  if (input.action === "activate") {
    const updated = { ...rule, active: true, modifiedBy: input.actorId, modifiedOn: new Date().toISOString() };
    getErdePorts().rules.save(updated);
    return updated;
  }

  if (input.action === "deactivate") {
    const updated = { ...rule, active: false, modifiedBy: input.actorId, modifiedOn: new Date().toISOString() };
    getErdePorts().rules.save(updated);
    return updated;
  }

  const target = ERDE_LIFECYCLE_ACTION_MAP[input.action] as ErdeRuleLifecycleStatus;
  validateErdeLifecycleTransition(rule.lifecycleStatus, target);

  if (input.action === "publish") {
    const published = getErdePorts()
      .versions.listByRule(rule.id)
      .find((v) => v.lifecycleStatus === ERDE_RULE_LIFECYCLE_STATUS.PUBLISHED);
    if (!published) {
      throw new Error("ERDE: cannot publish rule without a published version.");
    }
    assertErdeRuleVersionValid(published);
  }

  const updated: ErdeRule = {
    ...rule,
    lifecycleStatus: target,
    modifiedBy: input.actorId,
    modifiedOn: new Date().toISOString(),
  };

  getErdePorts().rules.save(updated);
  recordErdeRuleAudit({
    entityId: rule.id,
    entityType: "rule",
    action: target === ERDE_RULE_LIFECYCLE_STATUS.ARCHIVED ? "archived" : "published",
    actorId: input.actorId,
    previousStateRef: rule.lifecycleStatus,
    newStateRef: target,
    remarks: input.remarks,
  });

  return updated;
}

export function transitionErdeRuleVersionLifecycle(input: {
  versionId: string;
  action: ErdeRuleLifecycleAction;
  actorId: string;
  remarks?: string;
}): ErdeRuleVersion | undefined {
  const version = getErdePorts().versions.findById(input.versionId);
  if (!version) return undefined;

  const target = ERDE_LIFECYCLE_ACTION_MAP[input.action] as ErdeRuleLifecycleStatus;
  validateErdeLifecycleTransition(version.lifecycleStatus, target);

  if (input.action === "validate" || input.action === "approve" || input.action === "publish") {
    assertErdeRuleVersionValid(version);
  }

  const now = new Date().toISOString();
  const updated: ErdeRuleVersion = {
    ...version,
    lifecycleStatus: target,
    modifiedBy: input.actorId,
    modifiedOn: now,
    ...(input.action === "publish" ? { publishedOn: now, publishedBy: input.actorId } : {}),
  };

  getErdePorts().versions.save(updated);
  recordErdeRuleAudit({
    entityId: version.id,
    entityType: "rule_version",
    action: target === ERDE_RULE_LIFECYCLE_STATUS.ARCHIVED ? "archived" : "published",
    actorId: input.actorId,
    previousStateRef: version.lifecycleStatus,
    newStateRef: target,
    remarks: input.remarks,
  });

  return updated;
}

export function getErdeRuleByCode(ruleCode: string, tenantId?: string): ErdeRule | undefined {
  return getErdePorts().rules.findByCode(ruleCode, tenantId);
}

export function listErdeRules(): ErdeRule[] {
  return getErdePorts().rules.list();
}

export function listErdeRuleVersions(ruleId?: string): ErdeRuleVersion[] {
  return ruleId ? getErdePorts().versions.listByRule(ruleId) : getErdePorts().versions.list();
}
