/**
 * Enterprise Policy & Decision Engine (EPDE) — Sprint 7 Foundation.
 *
 * Business-agnostic policy evaluation platform. No loan-specific logic.
 */

// ---------------------------------------------------------------------------
// Lifecycle
// ---------------------------------------------------------------------------

export type EpdePolicyLifecycleStatus =
  | "draft"
  | "validated"
  | "approved"
  | "published"
  | "deprecated"
  | "archived";

export type EpdePolicyLifecycleAction =
  | "validate"
  | "approve"
  | "publish"
  | "deprecate"
  | "archive"
  | "revert_to_draft"
  | "activate"
  | "deactivate";

// ---------------------------------------------------------------------------
// Taxonomy
// ---------------------------------------------------------------------------

export type EpdePolicyCategory =
  | "access"
  | "eligibility"
  | "routing"
  | "scoring"
  | "approval"
  | "compliance"
  | "general";

export type EpdeScopeType = "global" | "tenant" | "organization" | "module" | "entity";

export type EpdeExpressionOperator =
  | "equals"
  | "not_equals"
  | "greater_than"
  | "less_than"
  | "gte"
  | "lte"
  | "in"
  | "not_in"
  | "exists"
  | "not_exists"
  | "and"
  | "or"
  | "not";

export type EpdeActionKind = "set_outcome" | "chain_policy" | "chain_rule" | "score" | "stop" | "log";

export type EpdeConflictResolutionStrategy = "priority" | "deny_overrides" | "allow_overrides" | "merge" | "first_match";

export type EpdeVariableDataType = "string" | "number" | "boolean" | "object";

export type EpdeExecutionMode = "evaluate" | "simulate" | "what_if";

export type EpdeAuditEntityType =
  | "policy"
  | "policy_version"
  | "policy_group"
  | "rule"
  | "rule_set"
  | "decision_table"
  | "decision_tree"
  | "decision_matrix"
  | "scoring_model"
  | "conflict"
  | "execution";

// ---------------------------------------------------------------------------
// Policy
// ---------------------------------------------------------------------------

export interface EpdePolicyScope {
  id: string;
  scopeType: EpdeScopeType;
  scopeRef: string;
  label: string;
}

export interface EpdePolicy {
  id: string;
  tenantId?: string;
  policyCode: string;
  policyName: string;
  description: string;
  category: EpdePolicyCategory;
  priority: number;
  scopes: EpdePolicyScope[];
  parentPolicyId?: string;
  dependencyPolicyIds: string[];
  lifecycleStatus: EpdePolicyLifecycleStatus;
  active: boolean;
  enabled: boolean;
  effectiveFrom?: string;
  effectiveTo?: string;
  createdBy: string;
  createdOn: string;
  modifiedBy: string;
  modifiedOn: string;
}

// ---------------------------------------------------------------------------
// Policy version
// ---------------------------------------------------------------------------

export interface EpdePolicyCondition {
  id: string;
  fieldRef: string;
  operator: EpdeExpressionOperator;
  value?: string;
}

export interface EpdePolicyExpression {
  id: string;
  expressionCode: string;
  operator: EpdeExpressionOperator;
  conditionIds: string[];
  childExpressionIds: string[];
  enabled: boolean;
}

export interface EpdePolicyAction {
  id: string;
  actionCode: string;
  actionKind: EpdeActionKind;
  targetRef?: string;
  payload?: Record<string, unknown>;
  enabled: boolean;
}

export interface EpdePolicyVariable {
  id: string;
  variableCode: string;
  variableName: string;
  dataType: EpdeVariableDataType;
  required: boolean;
  defaultValue?: string;
}

export interface EpdePolicyOutcome {
  id: string;
  outcomeCode: string;
  label: string;
  disposition: "allow" | "deny" | "review" | "inform";
  payload?: Record<string, unknown>;
}

export interface EpdePolicyVersion {
  id: string;
  policyId: string;
  policyCode: string;
  versionMajor: number;
  versionMinor: number;
  lifecycleStatus: EpdePolicyLifecycleStatus;
  conditions: EpdePolicyCondition[];
  expressions: EpdePolicyExpression[];
  actions: EpdePolicyAction[];
  variables: EpdePolicyVariable[];
  outcomes: EpdePolicyOutcome[];
  rootExpressionId: string;
  publishedOn?: string;
  publishedBy?: string;
  createdBy: string;
  createdOn: string;
  modifiedBy: string;
  modifiedOn: string;
}

// ---------------------------------------------------------------------------
// Policy grouping
// ---------------------------------------------------------------------------

export interface EpdePolicyGroup {
  id: string;
  groupCode: string;
  groupName: string;
  description: string;
  policyIds: string[];
  priority: number;
  conflictResolution: EpdeConflictResolutionStrategy;
  enabled: boolean;
  createdBy: string;
  createdOn: string;
}

// ---------------------------------------------------------------------------
// Rules (embedded in policy engine)
// ---------------------------------------------------------------------------

export interface EpdeRule {
  id: string;
  ruleCode: string;
  ruleName: string;
  policyId?: string;
  priority: number;
  enabled: boolean;
  createdBy: string;
  createdOn: string;
}

export interface EpdeRuleGroup {
  id: string;
  groupCode: string;
  groupName: string;
  ruleSetId: string;
  ruleIds: string[];
  priority: number;
  enabled: boolean;
}

export interface EpdeRuleSet {
  id: string;
  setCode: string;
  setName: string;
  policyId?: string;
  ruleIds: string[];
  groupIds: string[];
  enabled: boolean;
  createdBy: string;
  createdOn: string;
}

// ---------------------------------------------------------------------------
// Decision artifacts
// ---------------------------------------------------------------------------

export interface EpdeDecisionTableColumn {
  id: string;
  columnCode: string;
  columnName: string;
  input: boolean;
  dataType: EpdeVariableDataType;
}

export interface EpdeDecisionTableRow {
  id: string;
  rowCode: string;
  priority: number;
  inputs: Record<string, string>;
  outputs: Record<string, string>;
  enabled: boolean;
}

export interface EpdeDecisionTable {
  id: string;
  tableCode: string;
  tableName: string;
  policyId?: string;
  columns: EpdeDecisionTableColumn[];
  rows: EpdeDecisionTableRow[];
  lifecycleStatus: EpdePolicyLifecycleStatus;
  enabled: boolean;
  createdBy: string;
  createdOn: string;
}

export interface EpdeDecisionTreeNode {
  id: string;
  nodeCode: string;
  label: string;
  fieldRef?: string;
  operator?: EpdeExpressionOperator;
  value?: string;
  output?: Record<string, unknown>;
  trueChildId?: string;
  falseChildId?: string;
  isLeaf: boolean;
}

export interface EpdeDecisionTree {
  id: string;
  treeCode: string;
  treeName: string;
  policyId?: string;
  rootNodeId: string;
  nodes: EpdeDecisionTreeNode[];
  lifecycleStatus: EpdePolicyLifecycleStatus;
  enabled: boolean;
  createdBy: string;
  createdOn: string;
}

export interface EpdeDecisionMatrixCell {
  id: string;
  rowKey: string;
  columnKey: string;
  value: string;
  output: Record<string, unknown>;
}

export interface EpdeDecisionMatrix {
  id: string;
  matrixCode: string;
  matrixName: string;
  policyId?: string;
  rowKeys: string[];
  columnKeys: string[];
  cells: EpdeDecisionMatrixCell[];
  lifecycleStatus: EpdePolicyLifecycleStatus;
  enabled: boolean;
  createdBy: string;
  createdOn: string;
}

export interface EpdeScoringCriterion {
  id: string;
  criterionCode: string;
  fieldRef: string;
  weight: number;
  maxScore: number;
  enabled: boolean;
}

export interface EpdeScoringModel {
  id: string;
  modelCode: string;
  modelName: string;
  policyId?: string;
  criteria: EpdeScoringCriterion[];
  passThreshold: number;
  lifecycleStatus: EpdePolicyLifecycleStatus;
  enabled: boolean;
  createdBy: string;
  createdOn: string;
}

// ---------------------------------------------------------------------------
// Conflict & resolution
// ---------------------------------------------------------------------------

export interface EpdePolicyConflict {
  id: string;
  policyGroupId: string;
  conflictingPolicyIds: string[];
  conflictType: "outcome_mismatch" | "priority_collision" | "scope_overlap";
  detectedOn: string;
  resolved: boolean;
}

export interface EpdePolicyResolution {
  id: string;
  conflictId: string;
  strategy: EpdeConflictResolutionStrategy;
  winningPolicyId: string;
  resolvedOutcome: EpdePolicyOutcome;
  resolvedOn: string;
  resolvedBy: string;
}

// ---------------------------------------------------------------------------
// Evaluation
// ---------------------------------------------------------------------------

export interface EpdePolicyContext {
  executionId: string;
  variables: Record<string, unknown>;
  parameters: Record<string, unknown>;
  scopeRefs?: string[];
  metadataRef?: string;
  asOfDate?: string;
}

export interface EpdeEvaluationResult {
  policyId: string;
  policyCode: string;
  versionId: string;
  matched: boolean;
  outcome?: EpdePolicyOutcome;
  output: Record<string, unknown>;
  score?: number;
  chainedPolicyIds: string[];
  messages: string[];
}

export interface EpdeSimulationResult {
  executionId: string;
  mode: EpdeExecutionMode;
  results: EpdeEvaluationResult[];
  conflicts: EpdePolicyConflict[];
  resolutions: EpdePolicyResolution[];
  simulated: boolean;
  executedBy: string;
  executedOn: string;
  durationMs: number;
}

export interface EpdePolicyAuditReference {
  id: string;
  entityId: string;
  entityType: EpdeAuditEntityType;
  eafAuditEntryId: string;
  recordedOn: string;
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

export type EpdeValidationSeverity = "error" | "warning";

export interface EpdeValidationIssue {
  code: string;
  severity: EpdeValidationSeverity;
  message: string;
  entityRef?: string;
}

export interface EpdeValidationResult {
  valid: boolean;
  issues: EpdeValidationIssue[];
}

// ---------------------------------------------------------------------------
// Registry snapshot
// ---------------------------------------------------------------------------

export interface EpdeRegistrySnapshot {
  policies: EpdePolicy[];
  versions: EpdePolicyVersion[];
  policyGroups: EpdePolicyGroup[];
  rules: EpdeRule[];
  ruleSets: EpdeRuleSet[];
  ruleGroups: EpdeRuleGroup[];
  decisionTables: EpdeDecisionTable[];
  decisionTrees: EpdeDecisionTree[];
  decisionMatrices: EpdeDecisionMatrix[];
  scoringModels: EpdeScoringModel[];
  conflicts: EpdePolicyConflict[];
  resolutions: EpdePolicyResolution[];
  simulations: EpdeSimulationResult[];
  auditReferences: EpdePolicyAuditReference[];
}
