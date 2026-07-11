/**
 * ERDE Ports — repository contracts.
 */

import type {
  ErdeDecisionTable,
  ErdeDecisionTree,
  ErdeRegistrySnapshot,
  ErdeRule,
  ErdeRuleAuditReference,
  ErdeRuleExecution,
  ErdeRuleGroup,
  ErdeRuleSet,
  ErdeRuleVersion,
} from "./enterprise-rules-decision-engine";

export interface ErdeRuleRepositoryPort {
  list(): ErdeRule[];
  findById(id: string): ErdeRule | undefined;
  findByCode(ruleCode: string, tenantId?: string): ErdeRule | undefined;
  save(rule: ErdeRule): void;
  replaceAll(rules: ErdeRule[]): void;
}

export interface ErdeVersionRepositoryPort {
  list(): ErdeRuleVersion[];
  findById(id: string): ErdeRuleVersion | undefined;
  listByRule(ruleId: string): ErdeRuleVersion[];
  findByRuleAndVersion(
    ruleId: string,
    versionMajor: number,
    versionMinor: number,
  ): ErdeRuleVersion | undefined;
  save(version: ErdeRuleVersion): void;
  replaceAll(versions: ErdeRuleVersion[]): void;
}

export interface ErdeRuleSetRepositoryPort {
  list(): ErdeRuleSet[];
  findById(id: string): ErdeRuleSet | undefined;
  findByCode(setCode: string): ErdeRuleSet | undefined;
  save(ruleSet: ErdeRuleSet): void;
  replaceAll(ruleSets: ErdeRuleSet[]): void;
}

export interface ErdeRuleGroupRepositoryPort {
  list(): ErdeRuleGroup[];
  findById(id: string): ErdeRuleGroup | undefined;
  listByRuleSet(ruleSetId: string): ErdeRuleGroup[];
  save(group: ErdeRuleGroup): void;
  replaceAll(groups: ErdeRuleGroup[]): void;
}

export interface ErdeDecisionTableRepositoryPort {
  list(): ErdeDecisionTable[];
  findById(id: string): ErdeDecisionTable | undefined;
  findByCode(tableCode: string): ErdeDecisionTable | undefined;
  save(table: ErdeDecisionTable): void;
  replaceAll(tables: ErdeDecisionTable[]): void;
}

export interface ErdeDecisionTreeRepositoryPort {
  list(): ErdeDecisionTree[];
  findById(id: string): ErdeDecisionTree | undefined;
  findByCode(treeCode: string): ErdeDecisionTree | undefined;
  save(tree: ErdeDecisionTree): void;
  replaceAll(trees: ErdeDecisionTree[]): void;
}

export interface ErdeExecutionRepositoryPort {
  list(): ErdeRuleExecution[];
  findById(id: string): ErdeRuleExecution | undefined;
  append(execution: ErdeRuleExecution): void;
  replaceAll(executions: ErdeRuleExecution[]): void;
}

export interface ErdeAuditReferenceRepositoryPort {
  list(): ErdeRuleAuditReference[];
  listByEntity(entityId: string): ErdeRuleAuditReference[];
  save(reference: ErdeRuleAuditReference): void;
  replaceAll(references: ErdeRuleAuditReference[]): void;
}

export interface ErdePorts {
  rules: ErdeRuleRepositoryPort;
  versions: ErdeVersionRepositoryPort;
  ruleSets: ErdeRuleSetRepositoryPort;
  ruleGroups: ErdeRuleGroupRepositoryPort;
  decisionTables: ErdeDecisionTableRepositoryPort;
  decisionTrees: ErdeDecisionTreeRepositoryPort;
  executions: ErdeExecutionRepositoryPort;
  auditReferences: ErdeAuditReferenceRepositoryPort;
}

export type PartialErdePorts = Partial<ErdePorts>;

export type { ErdeRegistrySnapshot };
