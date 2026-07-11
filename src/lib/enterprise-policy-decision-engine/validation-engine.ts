/**
 * EPDE validation engine.
 */

import {
  EPDE_LIFECYCLE_TRANSITIONS,
  EPDE_MAX_PRIORITY,
  EPDE_MIN_PRIORITY,
  EPDE_POLICY_LIFECYCLE_STATUS,
  EPDE_SCOPE_TYPES,
} from "@/constants/enterprise-policy-decision-engine";
import type {
  EpdeDecisionMatrix,
  EpdeDecisionTable,
  EpdeDecisionTree,
  EpdePolicy,
  EpdePolicyContext,
  EpdePolicyLifecycleStatus,
  EpdePolicyScope,
  EpdePolicyVersion,
  EpdeScoringModel,
  EpdeValidationIssue,
  EpdeValidationResult,
} from "@/types/enterprise-policy-decision-engine";
import type { EpdePolicyRepositoryPort } from "@/types/enterprise-policy-decision-engine-ports";
import { getEpdePorts } from "./composition";
import { isEpdeComparisonOperator, isEpdeLogicalOperator } from "./expression-evaluator";

function issue(
  code: string,
  severity: EpdeValidationIssue["severity"],
  message: string,
  entityRef?: string,
): EpdeValidationIssue {
  return { code, severity, message, entityRef };
}

export function validateEpdeLifecycleTransition(from: EpdePolicyLifecycleStatus, to: EpdePolicyLifecycleStatus): void {
  const allowed = EPDE_LIFECYCLE_TRANSITIONS[from] ?? [];
  if (!allowed.includes(to)) {
    throw new Error(`EPDE validation: cannot transition policy lifecycle from "${from}" to "${to}".`);
  }
}

export function validateEpdePolicyCodeUniqueness(
  repo: EpdePolicyRepositoryPort,
  policyCode: string,
  tenantId?: string,
  excludeId?: string,
): void {
  const duplicate = repo
    .list()
    .find(
      (p) =>
        p.policyCode === policyCode &&
        p.id !== excludeId &&
        (tenantId === undefined || p.tenantId === tenantId),
    );
  if (duplicate) {
    throw new Error(`EPDE validation: policy code "${policyCode}" already exists.`);
  }
}

export function validateEpdePriority(priority: number, entityRef?: string): EpdeValidationIssue[] {
  if (priority >= EPDE_MIN_PRIORITY && priority <= EPDE_MAX_PRIORITY) return [];
  return [
    issue(
      "EPDE_INVALID_PRIORITY",
      "error",
      `Priority ${priority} must be between ${EPDE_MIN_PRIORITY} and ${EPDE_MAX_PRIORITY}.`,
      entityRef,
    ),
  ];
}

export function validateEpdePolicyScope(scopes: EpdePolicyScope[]): EpdeValidationIssue[] {
  const issues: EpdeValidationIssue[] = [];
  const validTypes = Object.values(EPDE_SCOPE_TYPES);

  if (scopes.length === 0) {
    issues.push(issue("EPDE_INVALID_SCOPE", "warning", "Policy has no scopes defined."));
    return issues;
  }

  for (const scope of scopes) {
    if (!validTypes.includes(scope.scopeType)) {
      issues.push(issue("EPDE_INVALID_SCOPE", "error", `Invalid scope type "${scope.scopeType}".`, scope.id));
    }
    if (!scope.scopeRef.trim()) {
      issues.push(issue("EPDE_INVALID_SCOPE", "error", "Scope ref cannot be empty.", scope.id));
    }
  }

  return issues;
}

export function validateEpdePolicyDependencies(policy: EpdePolicy): EpdeValidationIssue[] {
  const issues: EpdeValidationIssue[] = [];

  for (const depId of policy.dependencyPolicyIds) {
    if (!getEpdePorts().policies.findById(depId)) {
      issues.push(issue("EPDE_MISSING_DEPENDENCY", "error", `Dependency policy "${depId}" not found.`, policy.id));
    }
  }

  if (policy.parentPolicyId && !getEpdePorts().policies.findById(policy.parentPolicyId)) {
    issues.push(
      issue("EPDE_MISSING_DEPENDENCY", "error", `Parent policy "${policy.parentPolicyId}" not found.`, policy.id),
    );
  }

  const cycles = detectEpdeCircularReferences(policy.id, policy.dependencyPolicyIds);
  for (const cycle of cycles) {
    issues.push(issue("EPDE_CIRCULAR_REFERENCE", "error", `Circular reference: ${cycle.join(" → ")}.`, policy.id));
  }

  return issues;
}

function detectEpdeCircularReferences(policyId: string, dependencies: string[]): string[][] {
  const cycles: string[][] = [];
  const visited = new Set<string>();
  const path: string[] = [policyId];

  function dfs(currentId: string): void {
    if (visited.has(currentId)) {
      const start = path.indexOf(currentId);
      if (start >= 0) cycles.push([...path.slice(start), currentId]);
      return;
    }
    visited.add(currentId);
    const policy = getEpdePorts().policies.findById(currentId);
    const deps = currentId === policyId ? dependencies : (policy?.dependencyPolicyIds ?? []);
    for (const dep of deps) {
      path.push(dep);
      dfs(dep);
      path.pop();
    }
  }

  for (const dep of dependencies) dfs(dep);
  return cycles;
}

export function validateEpdeEffectiveDates(policy: EpdePolicy): EpdeValidationIssue[] {
  if (policy.effectiveFrom && policy.effectiveTo && policy.effectiveFrom > policy.effectiveTo) {
    return [
      issue("EPDE_INVALID_EFFECTIVE_DATE", "error", "effectiveFrom must be before effectiveTo.", policy.id),
    ];
  }
  return [];
}

export function validateEpdePolicyVersion(version: EpdePolicyVersion): EpdeValidationResult {
  const issues: EpdeValidationIssue[] = [];

  if (!version.expressions.find((e) => e.id === version.rootExpressionId)) {
    issues.push(issue("EPDE_INVALID_EXPRESSION", "error", "rootExpressionId must reference a valid expression.", version.id));
  }

  for (const expression of version.expressions) {
    if (!isEpdeLogicalOperator(expression.operator) && !isEpdeComparisonOperator(expression.operator)) {
      issues.push(issue("EPDE_INVALID_EXPRESSION", "error", `Unknown operator "${expression.operator}".`, expression.id));
    }
    for (const conditionId of expression.conditionIds) {
      const condition = version.conditions.find((c) => c.id === conditionId);
      if (!condition?.fieldRef.trim()) {
        issues.push(issue("EPDE_INVALID_EXPRESSION", "error", "Condition fieldRef cannot be empty.", conditionId));
      }
    }
  }

  for (const variable of version.variables.filter((v) => v.required)) {
    if (!variable.variableCode.trim()) {
      issues.push(issue("EPDE_MISSING_PARAMETER", "error", "Required variable must have a code.", variable.id));
    }
  }

  const policy = getEpdePorts().policies.findById(version.policyId);
  if (!policy) {
    issues.push(issue("EPDE_INVALID_POLICY", "error", "Version references unknown policy.", version.id));
  }

  const errors = issues.filter((i) => i.severity === "error");
  return { valid: errors.length === 0, issues };
}

export function assertEpdePolicyVersionValid(version: EpdePolicyVersion): void {
  const result = validateEpdePolicyVersion(version);
  if (!result.valid) {
    throw new Error(
      `EPDE validation: policy version invalid — ${result.issues
        .filter((i) => i.severity === "error")
        .map((i) => i.message)
        .join("; ")}`,
    );
  }
}

export function validateEpdePolicy(
  repo: EpdePolicyRepositoryPort,
  policy: EpdePolicy,
  existing?: EpdePolicy,
): EpdeValidationResult {
  const issues: EpdeValidationIssue[] = [];

  try {
    validateEpdePolicyCodeUniqueness(repo, policy.policyCode, policy.tenantId, existing?.id);
  } catch (err) {
    issues.push(
      issue("EPDE_DUPLICATE_POLICY_CODE", "error", err instanceof Error ? err.message : String(err), policy.id),
    );
  }

  if (existing && existing.tenantId !== policy.tenantId) {
    issues.push(issue("EPDE_INVALID_POLICY", "error", "tenantId is immutable after policy creation.", policy.id));
  }

  issues.push(...validateEpdePriority(policy.priority, policy.id));
  issues.push(...validateEpdePolicyScope(policy.scopes));
  issues.push(...validateEpdePolicyDependencies(policy));
  issues.push(...validateEpdeEffectiveDates(policy));

  const errors = issues.filter((i) => i.severity === "error");
  return { valid: errors.length === 0, issues };
}

export function validateEpdeDecisionTable(table: EpdeDecisionTable): EpdeValidationResult {
  const issues: EpdeValidationIssue[] = [];
  const inputs = table.columns.filter((c) => c.input);
  const outputs = table.columns.filter((c) => !c.input);

  if (inputs.length === 0) issues.push(issue("EPDE_INVALID_DECISION_TABLE", "error", "Table requires input columns.", table.id));
  if (outputs.length === 0) issues.push(issue("EPDE_INVALID_DECISION_TABLE", "error", "Table requires output columns.", table.id));
  if (table.rows.length === 0) issues.push(issue("EPDE_INVALID_DECISION_TABLE", "error", "Table requires rows.", table.id));

  for (const row of table.rows.filter((r) => r.enabled)) {
    issues.push(...validateEpdePriority(row.priority, row.id));
    for (const col of inputs) {
      if (!(col.columnCode in row.inputs)) {
        issues.push(
          issue("EPDE_INVALID_DECISION_TABLE", "error", `Row missing input "${col.columnCode}".`, row.id),
        );
      }
    }
  }

  const errors = issues.filter((i) => i.severity === "error");
  return { valid: errors.length === 0, issues };
}

export function validateEpdeDecisionTree(tree: EpdeDecisionTree): EpdeValidationResult {
  const issues: EpdeValidationIssue[] = [];
  const nodeIds = new Set(tree.nodes.map((n) => n.id));

  if (!nodeIds.has(tree.rootNodeId)) {
    issues.push(issue("EPDE_INVALID_DECISION_TREE", "error", "Invalid rootNodeId.", tree.id));
  }

  for (const node of tree.nodes) {
    if (!node.isLeaf && !node.fieldRef) {
      issues.push(issue("EPDE_INVALID_DECISION_TREE", "error", `Node "${node.nodeCode}" requires fieldRef.`, node.id));
    }
    if (node.isLeaf && !node.output) {
      issues.push(issue("EPDE_INVALID_DECISION_TREE", "error", `Leaf "${node.nodeCode}" requires output.`, node.id));
    }
  }

  const errors = issues.filter((i) => i.severity === "error");
  return { valid: errors.length === 0, issues };
}

export function validateEpdeDecisionMatrix(matrix: EpdeDecisionMatrix): EpdeValidationResult {
  const issues: EpdeValidationIssue[] = [];

  if (matrix.rowKeys.length === 0 || matrix.columnKeys.length === 0) {
    issues.push(issue("EPDE_INVALID_DECISION_MATRIX", "error", "Matrix requires row and column keys.", matrix.id));
  }

  if (matrix.cells.length === 0) {
    issues.push(issue("EPDE_INVALID_DECISION_MATRIX", "error", "Matrix requires cells.", matrix.id));
  }

  const errors = issues.filter((i) => i.severity === "error");
  return { valid: errors.length === 0, issues };
}

export function validateEpdeScoringModel(model: EpdeScoringModel): EpdeValidationResult {
  const issues: EpdeValidationIssue[] = [];

  if (model.criteria.length === 0) {
    issues.push(issue("EPDE_INVALID_SCORING_MODEL", "error", "Scoring model requires criteria.", model.id));
  }

  const totalWeight = model.criteria.filter((c) => c.enabled).reduce((sum, c) => sum + c.weight, 0);
  if (totalWeight <= 0) {
    issues.push(issue("EPDE_INVALID_SCORING_MODEL", "error", "Total criterion weight must be positive.", model.id));
  }

  if (model.passThreshold < 0) {
    issues.push(issue("EPDE_INVALID_SCORING_MODEL", "error", "passThreshold cannot be negative.", model.id));
  }

  const errors = issues.filter((i) => i.severity === "error");
  return { valid: errors.length === 0, issues };
}

export function validateEpdeEvaluationContext(version: EpdePolicyVersion, context: EpdePolicyContext): void {
  for (const variable of version.variables.filter((v) => v.required)) {
    if (!(variable.variableCode in context.parameters) && !(variable.variableCode in context.variables)) {
      throw new Error(`EPDE validation: missing required variable "${variable.variableCode}".`);
    }
  }
}

export function isEpdePolicyEffective(policy: EpdePolicy, asOfDate?: string): boolean {
  const asOf = asOfDate ?? new Date().toISOString();
  if (policy.effectiveFrom && asOf < policy.effectiveFrom) return false;
  if (policy.effectiveTo && asOf > policy.effectiveTo) return false;
  return true;
}

export function getEpdePublishedVersion(policyId: string): EpdePolicyVersion | undefined {
  return getEpdePorts()
    .versions.listByPolicy(policyId)
    .find((v) => v.lifecycleStatus === EPDE_POLICY_LIFECYCLE_STATUS.PUBLISHED);
}
