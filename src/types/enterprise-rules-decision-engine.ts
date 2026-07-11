/**
 * Enterprise Rules & Decision Engine (ERDE) — Sprint 7 Foundation.
 *
 * Business-agnostic rule evaluation platform. No loan-specific logic.
 */

// ---------------------------------------------------------------------------
// Lifecycle
// ---------------------------------------------------------------------------

export type ErdeRuleLifecycleStatus =
  | "draft"
  | "validated"
  | "approved"
  | "published"
  | "deprecated"
  | "archived";

export type ErdeRuleLifecycleAction =
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

export type ErdeRuleCategory =
  | "validation"
  | "routing"
  | "scoring"
  | "eligibility"
  | "approval"
  | "notification"
  | "general";

export type ErdeExpressionOperator =
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

export type ErdeActionKind = "set_variable" | "emit_result" | "chain_rule" | "stop" | "log";

export type ErdeVariableDataType = "string" | "number" | "boolean" | "object";

export type ErdeExecutionMode = "evaluate" | "simulate";

export type ErdeAuditEntityType =
  | "rule"
  | "rule_version"
  | "rule_set"
  | "rule_group"
  | "decision_table"
  | "decision_tree"
  | "execution";

// ---------------------------------------------------------------------------
// Rule definition
// ---------------------------------------------------------------------------

export interface ErdeRuleTag {
  id: string;
  tagCode: string;
  label: string;
}

export interface ErdeRule {
  id: string;
  tenantId?: string;
  ruleCode: string;
  ruleName: string;
  description: string;
  category: ErdeRuleCategory;
  priority: number;
  tags: ErdeRuleTag[];
  parentRuleId?: string;
  dependencyRuleIds: string[];
  lifecycleStatus: ErdeRuleLifecycleStatus;
  active: boolean;
  enabled: boolean;
  createdBy: string;
  createdOn: string;
  modifiedBy: string;
  modifiedOn: string;
}

// ---------------------------------------------------------------------------
// Rule version — immutable evaluation snapshot
// ---------------------------------------------------------------------------

export interface ErdeRuleCondition {
  id: string;
  fieldRef: string;
  operator: ErdeExpressionOperator;
  value?: string;
  description?: string;
}

export interface ErdeRuleExpression {
  id: string;
  expressionCode: string;
  operator: ErdeExpressionOperator;
  conditionIds: string[];
  childExpressionIds: string[];
  enabled: boolean;
}

export interface ErdeRuleAction {
  id: string;
  actionCode: string;
  actionKind: ErdeActionKind;
  targetRef?: string;
  payload?: Record<string, unknown>;
  enabled: boolean;
}

export interface ErdeRuleParameter {
  id: string;
  parameterCode: string;
  parameterName: string;
  dataType: ErdeVariableDataType;
  required: boolean;
  defaultValue?: string;
}

export interface ErdeRuleVariable {
  id: string;
  variableCode: string;
  variableName: string;
  dataType: ErdeVariableDataType;
  sourceRef?: string;
}

export interface ErdeRuleVersion {
  id: string;
  ruleId: string;
  ruleCode: string;
  versionMajor: number;
  versionMinor: number;
  lifecycleStatus: ErdeRuleLifecycleStatus;
  conditions: ErdeRuleCondition[];
  expressions: ErdeRuleExpression[];
  actions: ErdeRuleAction[];
  parameters: ErdeRuleParameter[];
  variables: ErdeRuleVariable[];
  rootExpressionId: string;
  publishedOn?: string;
  publishedBy?: string;
  createdBy: string;
  createdOn: string;
  modifiedBy: string;
  modifiedOn: string;
}

// ---------------------------------------------------------------------------
// Rule grouping
// ---------------------------------------------------------------------------

export interface ErdeRuleGroup {
  id: string;
  groupCode: string;
  groupName: string;
  description: string;
  ruleSetId: string;
  priority: number;
  ruleIds: string[];
  enabled: boolean;
  createdBy: string;
  createdOn: string;
}

export interface ErdeRuleSet {
  id: string;
  setCode: string;
  setName: string;
  description: string;
  category: ErdeRuleCategory;
  ruleIds: string[];
  groupIds: string[];
  lifecycleStatus: ErdeRuleLifecycleStatus;
  enabled: boolean;
  createdBy: string;
  createdOn: string;
  modifiedBy: string;
  modifiedOn: string;
}

// ---------------------------------------------------------------------------
// Decision table & tree
// ---------------------------------------------------------------------------

export interface ErdeDecisionTableColumn {
  id: string;
  columnCode: string;
  columnName: string;
  input: boolean;
  dataType: ErdeVariableDataType;
}

export interface ErdeDecisionTableRow {
  id: string;
  rowCode: string;
  priority: number;
  inputs: Record<string, string>;
  outputs: Record<string, string>;
  enabled: boolean;
}

export interface ErdeDecisionTable {
  id: string;
  tableCode: string;
  tableName: string;
  description: string;
  columns: ErdeDecisionTableColumn[];
  rows: ErdeDecisionTableRow[];
  lifecycleStatus: ErdeRuleLifecycleStatus;
  enabled: boolean;
  createdBy: string;
  createdOn: string;
}

export interface ErdeDecisionTreeNode {
  id: string;
  nodeCode: string;
  label: string;
  fieldRef?: string;
  operator?: ErdeExpressionOperator;
  value?: string;
  output?: Record<string, unknown>;
  trueChildId?: string;
  falseChildId?: string;
  isLeaf: boolean;
}

export interface ErdeDecisionTree {
  id: string;
  treeCode: string;
  treeName: string;
  description: string;
  rootNodeId: string;
  nodes: ErdeDecisionTreeNode[];
  lifecycleStatus: ErdeRuleLifecycleStatus;
  enabled: boolean;
  createdBy: string;
  createdOn: string;
}

// ---------------------------------------------------------------------------
// Evaluation
// ---------------------------------------------------------------------------

export interface ErdeRuleContext {
  executionId: string;
  variables: Record<string, unknown>;
  parameters: Record<string, unknown>;
  metadataRef?: string;
}

export interface ErdeRuleResult {
  ruleId: string;
  ruleCode: string;
  versionId: string;
  matched: boolean;
  output: Record<string, unknown>;
  chainedRuleIds: string[];
  messages: string[];
}

export interface ErdeRuleExecution {
  id: string;
  ruleId?: string;
  ruleSetId?: string;
  ruleCode?: string;
  mode: ErdeExecutionMode;
  context: ErdeRuleContext;
  results: ErdeRuleResult[];
  simulated: boolean;
  executedBy: string;
  executedOn: string;
  durationMs: number;
}

// ---------------------------------------------------------------------------
// Audit
// ---------------------------------------------------------------------------

export interface ErdeRuleAuditReference {
  id: string;
  entityId: string;
  entityType: ErdeAuditEntityType;
  eafAuditEntryId: string;
  recordedOn: string;
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

export type ErdeValidationSeverity = "error" | "warning";

export interface ErdeValidationIssue {
  code: string;
  severity: ErdeValidationSeverity;
  message: string;
  entityRef?: string;
}

export interface ErdeValidationResult {
  valid: boolean;
  issues: ErdeValidationIssue[];
}

// ---------------------------------------------------------------------------
// Registry snapshot
// ---------------------------------------------------------------------------

export interface ErdeRegistrySnapshot {
  rules: ErdeRule[];
  versions: ErdeRuleVersion[];
  ruleSets: ErdeRuleSet[];
  ruleGroups: ErdeRuleGroup[];
  decisionTables: ErdeDecisionTable[];
  decisionTrees: ErdeDecisionTree[];
  executions: ErdeRuleExecution[];
  auditReferences: ErdeRuleAuditReference[];
}
