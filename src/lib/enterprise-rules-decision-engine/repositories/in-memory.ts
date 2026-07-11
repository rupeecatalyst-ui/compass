/**
 * ERDE in-memory adapters — Sprint 7 default implementation.
 */

import type {
  ErdeDecisionTable,
  ErdeDecisionTree,
  ErdeRule,
  ErdeRuleAuditReference,
  ErdeRuleExecution,
  ErdeRuleGroup,
  ErdeRuleSet,
  ErdeRuleVersion,
} from "@/types/enterprise-rules-decision-engine";
import type { ErdePorts } from "@/types/enterprise-rules-decision-engine-ports";

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

export function createInMemoryErdePorts(): ErdePorts {
  const rules = createMutableListStore<ErdeRule>();
  const versions = createMutableListStore<ErdeRuleVersion>();
  const ruleSets = createMutableListStore<ErdeRuleSet>();
  const ruleGroups = createMutableListStore<ErdeRuleGroup>();
  const decisionTables = createMutableListStore<ErdeDecisionTable>();
  const decisionTrees = createMutableListStore<ErdeDecisionTree>();
  const executions = createMutableListStore<ErdeRuleExecution>();
  const auditReferences = createMutableListStore<ErdeRuleAuditReference>();

  return {
    rules: {
      list: () => rules.list(),
      findById: (id) => rules.list().find((r) => r.id === id),
      findByCode: (ruleCode, tenantId) =>
        rules
          .list()
          .find(
            (r) =>
              r.ruleCode === ruleCode &&
              r.enabled &&
              (tenantId === undefined || r.tenantId === tenantId),
          ),
      save: (rule) => rules.upsert(rule, (r) => r.id),
      replaceAll: (items) => rules.replaceAll(items),
    },
    versions: {
      list: () => versions.list(),
      findById: (id) => versions.list().find((v) => v.id === id),
      listByRule: (ruleId) => versions.list().filter((v) => v.ruleId === ruleId),
      findByRuleAndVersion: (ruleId, versionMajor, versionMinor) =>
        versions
          .list()
          .find(
            (v) =>
              v.ruleId === ruleId &&
              v.versionMajor === versionMajor &&
              v.versionMinor === versionMinor,
          ),
      save: (version) => versions.upsert(version, (v) => v.id),
      replaceAll: (items) => versions.replaceAll(items),
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
      findByCode: (tableCode) =>
        decisionTables.list().find((t) => t.tableCode === tableCode && t.enabled),
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
    executions: {
      list: () => executions.list(),
      findById: (id) => executions.list().find((e) => e.id === id),
      append: (execution) => executions.append(execution),
      replaceAll: (items) => executions.replaceAll(items),
    },
    auditReferences: {
      list: () => auditReferences.list(),
      listByEntity: (entityId) =>
        auditReferences.list().filter((r) => r.entityId === entityId),
      save: (reference) => auditReferences.upsert(reference, (r) => r.id),
      replaceAll: (items) => auditReferences.replaceAll(items),
    },
  };
}
