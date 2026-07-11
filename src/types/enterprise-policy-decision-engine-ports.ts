/**
 * EPDE Ports — repository contracts.
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
  EpdeRegistrySnapshot,
  EpdeRule,
  EpdeRuleGroup,
  EpdeRuleSet,
  EpdeScoringModel,
  EpdeSimulationResult,
} from "./enterprise-policy-decision-engine";

export interface EpdePolicyRepositoryPort {
  list(): EpdePolicy[];
  findById(id: string): EpdePolicy | undefined;
  findByCode(policyCode: string, tenantId?: string): EpdePolicy | undefined;
  save(policy: EpdePolicy): void;
  replaceAll(policies: EpdePolicy[]): void;
}

export interface EpdeVersionRepositoryPort {
  list(): EpdePolicyVersion[];
  findById(id: string): EpdePolicyVersion | undefined;
  listByPolicy(policyId: string): EpdePolicyVersion[];
  findByPolicyAndVersion(
    policyId: string,
    versionMajor: number,
    versionMinor: number,
  ): EpdePolicyVersion | undefined;
  save(version: EpdePolicyVersion): void;
  replaceAll(versions: EpdePolicyVersion[]): void;
}

export interface EpdePolicyGroupRepositoryPort {
  list(): EpdePolicyGroup[];
  findById(id: string): EpdePolicyGroup | undefined;
  findByCode(groupCode: string): EpdePolicyGroup | undefined;
  save(group: EpdePolicyGroup): void;
  replaceAll(groups: EpdePolicyGroup[]): void;
}

export interface EpdeRuleRepositoryPort {
  list(): EpdeRule[];
  findById(id: string): EpdeRule | undefined;
  findByCode(ruleCode: string): EpdeRule | undefined;
  save(rule: EpdeRule): void;
  replaceAll(rules: EpdeRule[]): void;
}

export interface EpdeRuleSetRepositoryPort {
  list(): EpdeRuleSet[];
  findById(id: string): EpdeRuleSet | undefined;
  findByCode(setCode: string): EpdeRuleSet | undefined;
  save(ruleSet: EpdeRuleSet): void;
  replaceAll(ruleSets: EpdeRuleSet[]): void;
}

export interface EpdeRuleGroupRepositoryPort {
  list(): EpdeRuleGroup[];
  findById(id: string): EpdeRuleGroup | undefined;
  listByRuleSet(ruleSetId: string): EpdeRuleGroup[];
  save(group: EpdeRuleGroup): void;
  replaceAll(groups: EpdeRuleGroup[]): void;
}

export interface EpdeDecisionTableRepositoryPort {
  list(): EpdeDecisionTable[];
  findById(id: string): EpdeDecisionTable | undefined;
  findByCode(tableCode: string): EpdeDecisionTable | undefined;
  save(table: EpdeDecisionTable): void;
  replaceAll(tables: EpdeDecisionTable[]): void;
}

export interface EpdeDecisionTreeRepositoryPort {
  list(): EpdeDecisionTree[];
  findById(id: string): EpdeDecisionTree | undefined;
  findByCode(treeCode: string): EpdeDecisionTree | undefined;
  save(tree: EpdeDecisionTree): void;
  replaceAll(trees: EpdeDecisionTree[]): void;
}

export interface EpdeDecisionMatrixRepositoryPort {
  list(): EpdeDecisionMatrix[];
  findById(id: string): EpdeDecisionMatrix | undefined;
  findByCode(matrixCode: string): EpdeDecisionMatrix | undefined;
  save(matrix: EpdeDecisionMatrix): void;
  replaceAll(matrices: EpdeDecisionMatrix[]): void;
}

export interface EpdeScoringModelRepositoryPort {
  list(): EpdeScoringModel[];
  findById(id: string): EpdeScoringModel | undefined;
  findByCode(modelCode: string): EpdeScoringModel | undefined;
  save(model: EpdeScoringModel): void;
  replaceAll(models: EpdeScoringModel[]): void;
}

export interface EpdeConflictRepositoryPort {
  list(): EpdePolicyConflict[];
  findById(id: string): EpdePolicyConflict | undefined;
  save(conflict: EpdePolicyConflict): void;
  replaceAll(conflicts: EpdePolicyConflict[]): void;
}

export interface EpdeResolutionRepositoryPort {
  list(): EpdePolicyResolution[];
  findById(id: string): EpdePolicyResolution | undefined;
  save(resolution: EpdePolicyResolution): void;
  replaceAll(resolutions: EpdePolicyResolution[]): void;
}

export interface EpdeSimulationRepositoryPort {
  list(): EpdeSimulationResult[];
  findById(id: string): EpdeSimulationResult | undefined;
  append(simulation: EpdeSimulationResult): void;
  replaceAll(simulations: EpdeSimulationResult[]): void;
}

export interface EpdeAuditReferenceRepositoryPort {
  list(): EpdePolicyAuditReference[];
  listByEntity(entityId: string): EpdePolicyAuditReference[];
  save(reference: EpdePolicyAuditReference): void;
  replaceAll(references: EpdePolicyAuditReference[]): void;
}

export interface EpdePorts {
  policies: EpdePolicyRepositoryPort;
  versions: EpdeVersionRepositoryPort;
  policyGroups: EpdePolicyGroupRepositoryPort;
  rules: EpdeRuleRepositoryPort;
  ruleSets: EpdeRuleSetRepositoryPort;
  ruleGroups: EpdeRuleGroupRepositoryPort;
  decisionTables: EpdeDecisionTableRepositoryPort;
  decisionTrees: EpdeDecisionTreeRepositoryPort;
  decisionMatrices: EpdeDecisionMatrixRepositoryPort;
  scoringModels: EpdeScoringModelRepositoryPort;
  conflicts: EpdeConflictRepositoryPort;
  resolutions: EpdeResolutionRepositoryPort;
  simulations: EpdeSimulationRepositoryPort;
  auditReferences: EpdeAuditReferenceRepositoryPort;
}

export type PartialEpdePorts = Partial<EpdePorts>;

export type { EpdeRegistrySnapshot };
