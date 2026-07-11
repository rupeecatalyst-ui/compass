/**
 * EPDE in-memory adapters — Sprint 7 default implementation.
 */

import type {
  EpdeDecisionMatrix,
  EpdeDecisionTable,
  EpdeDecisionTree,
  EpdePolicy,
  EpdePolicyAuditReference,
  EpdePolicyConflict,
  EpdePolicyGroup,
  EpdePolicyResolution,
  EpdePolicyVersion,
  EpdeRule,
  EpdeRuleGroup,
  EpdeRuleSet,
  EpdeScoringModel,
  EpdeSimulationResult,
} from "@/types/enterprise-policy-decision-engine";
import type { EpdePorts } from "@/types/enterprise-policy-decision-engine-ports";

function createMutableListStore<T>(): {
  list: () => T[];
  replaceAll: (items: T[]) => void;
  upsert: (item: T, key: (item: T) => string) => void;
  append: (item: T) => void;
} {
  let items: T[] = [];
  return {
    list: () => items,
    replaceAll: (next) => {
      items = next;
    },
    upsert: (item, key) => {
      const id = key(item);
      items = [item, ...items.filter((i) => key(i) !== id)];
    },
    append: (item) => {
      items = [...items, item];
    },
  };
}

export function createInMemoryEpdePorts(): EpdePorts {
  const policies = createMutableListStore<EpdePolicy>();
  const versions = createMutableListStore<EpdePolicyVersion>();
  const policyGroups = createMutableListStore<EpdePolicyGroup>();
  const rules = createMutableListStore<EpdeRule>();
  const ruleSets = createMutableListStore<EpdeRuleSet>();
  const ruleGroups = createMutableListStore<EpdeRuleGroup>();
  const decisionTables = createMutableListStore<EpdeDecisionTable>();
  const decisionTrees = createMutableListStore<EpdeDecisionTree>();
  const decisionMatrices = createMutableListStore<EpdeDecisionMatrix>();
  const scoringModels = createMutableListStore<EpdeScoringModel>();
  const conflicts = createMutableListStore<EpdePolicyConflict>();
  const resolutions = createMutableListStore<EpdePolicyResolution>();
  const simulations = createMutableListStore<EpdeSimulationResult>();
  const auditReferences = createMutableListStore<EpdePolicyAuditReference>();

  return {
    policies: {
      list: () => policies.list(),
      findById: (id) => policies.list().find((p) => p.id === id),
      findByCode: (policyCode, tenantId) =>
        policies
          .list()
          .find(
            (p) =>
              p.policyCode === policyCode &&
              p.enabled &&
              (tenantId === undefined || p.tenantId === tenantId),
          ),
      save: (policy) => policies.upsert(policy, (p) => p.id),
      replaceAll: (items) => policies.replaceAll(items),
    },
    versions: {
      list: () => versions.list(),
      findById: (id) => versions.list().find((v) => v.id === id),
      listByPolicy: (policyId) => versions.list().filter((v) => v.policyId === policyId),
      findByPolicyAndVersion: (policyId, versionMajor, versionMinor) =>
        versions
          .list()
          .find(
            (v) =>
              v.policyId === policyId &&
              v.versionMajor === versionMajor &&
              v.versionMinor === versionMinor,
          ),
      save: (version) => versions.upsert(version, (v) => v.id),
      replaceAll: (items) => versions.replaceAll(items),
    },
    policyGroups: {
      list: () => policyGroups.list(),
      findById: (id) => policyGroups.list().find((g) => g.id === id),
      findByCode: (groupCode) => policyGroups.list().find((g) => g.groupCode === groupCode && g.enabled),
      save: (group) => policyGroups.upsert(group, (g) => g.id),
      replaceAll: (items) => policyGroups.replaceAll(items),
    },
    rules: {
      list: () => rules.list(),
      findById: (id) => rules.list().find((r) => r.id === id),
      findByCode: (ruleCode) => rules.list().find((r) => r.ruleCode === ruleCode && r.enabled),
      save: (rule) => rules.upsert(rule, (r) => r.id),
      replaceAll: (items) => rules.replaceAll(items),
    },
    ruleSets: {
      list: () => ruleSets.list(),
      findById: (id) => ruleSets.list().find((s) => s.id === id),
      findByCode: (setCode) => ruleSets.list().find((s) => s.setCode === setCode && s.enabled),
      save: (ruleSet) => ruleSets.upsert(ruleSet, (s) => s.id),
      replaceAll: (items) => ruleSets.replaceAll(items),
    },
    ruleGroups: {
      list: () => ruleGroups.list(),
      findById: (id) => ruleGroups.list().find((g) => g.id === id),
      listByRuleSet: (ruleSetId) => ruleGroups.list().filter((g) => g.ruleSetId === ruleSetId),
      save: (group) => ruleGroups.upsert(group, (g) => g.id),
      replaceAll: (items) => ruleGroups.replaceAll(items),
    },
    decisionTables: {
      list: () => decisionTables.list(),
      findById: (id) => decisionTables.list().find((t) => t.id === id),
      findByCode: (tableCode) => decisionTables.list().find((t) => t.tableCode === tableCode && t.enabled),
      save: (table) => decisionTables.upsert(table, (t) => t.id),
      replaceAll: (items) => decisionTables.replaceAll(items),
    },
    decisionTrees: {
      list: () => decisionTrees.list(),
      findById: (id) => decisionTrees.list().find((t) => t.id === id),
      findByCode: (treeCode) => decisionTrees.list().find((t) => t.treeCode === treeCode && t.enabled),
      save: (tree) => decisionTrees.upsert(tree, (t) => t.id),
      replaceAll: (items) => decisionTrees.replaceAll(items),
    },
    decisionMatrices: {
      list: () => decisionMatrices.list(),
      findById: (id) => decisionMatrices.list().find((m) => m.id === id),
      findByCode: (matrixCode) => decisionMatrices.list().find((m) => m.matrixCode === matrixCode && m.enabled),
      save: (matrix) => decisionMatrices.upsert(matrix, (m) => m.id),
      replaceAll: (items) => decisionMatrices.replaceAll(items),
    },
    scoringModels: {
      list: () => scoringModels.list(),
      findById: (id) => scoringModels.list().find((m) => m.id === id),
      findByCode: (modelCode) => scoringModels.list().find((m) => m.modelCode === modelCode && m.enabled),
      save: (model) => scoringModels.upsert(model, (m) => m.id),
      replaceAll: (items) => scoringModels.replaceAll(items),
    },
    conflicts: {
      list: () => conflicts.list(),
      findById: (id) => conflicts.list().find((c) => c.id === id),
      save: (conflict) => conflicts.upsert(conflict, (c) => c.id),
      replaceAll: (items) => conflicts.replaceAll(items),
    },
    resolutions: {
      list: () => resolutions.list(),
      findById: (id) => resolutions.list().find((r) => r.id === id),
      save: (resolution) => resolutions.upsert(resolution, (r) => r.id),
      replaceAll: (items) => resolutions.replaceAll(items),
    },
    simulations: {
      list: () => simulations.list(),
      findById: (id) => simulations.list().find((s) => s.executionId === id),
      append: (simulation) => simulations.append(simulation),
      replaceAll: (items) => simulations.replaceAll(items),
    },
    auditReferences: {
      list: () => auditReferences.list(),
      listByEntity: (entityId) => auditReferences.list().filter((r) => r.entityId === entityId),
      save: (reference) => auditReferences.upsert(reference, (r) => r.id),
      replaceAll: (items) => auditReferences.replaceAll(items),
    },
  };
}
