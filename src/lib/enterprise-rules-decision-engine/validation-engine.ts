/**
 * ERDE validation engine.
 */

import {
  ERDE_LIFECYCLE_TRANSITIONS,
  ERDE_MAX_PRIORITY,
  ERDE_MIN_PRIORITY,
  ERDE_RULE_LIFECYCLE_STATUS,
} from "@/constants/enterprise-rules-decision-engine";
import type {
  ErdeDecisionTable,
  ErdeDecisionTree,
  ErdeRule,
  ErdeRuleLifecycleStatus,
  ErdeRuleVersion,
  ErdeValidationIssue,
  ErdeValidationResult,
} from "@/types/enterprise-rules-decision-engine";
import type { ErdeRuleRepositoryPort } from "@/types/enterprise-rules-decision-engine-ports";
import { getErdePorts } from "./composition";
import { isErdeComparisonOperator, isErdeLogicalOperator } from "./expression-evaluator";

function issue(
  code: string,
  severity: ErdeValidationIssue["severity"],
  message: string,
  entityRef?: string,
): ErdeValidationIssue {
  return { code, severity, message, entityRef };
}

export function validateErdeLifecycleTransition(
  from: ErdeRuleLifecycleStatus,
  to: ErdeRuleLifecycleStatus,
): void {
  const allowed = ERDE_LIFECYCLE_TRANSITIONS[from] ?? [];
  if (!allowed.includes(to)) {
    throw new Error(`ERDE validation: cannot transition rule lifecycle from "${from}" to "${to}".`);
  }
}

export function validateErdeRuleCodeUniqueness(
  repo: ErdeRuleRepositoryPort,
  ruleCode: string,
  tenantId?: string,
  excludeId?: string,
): void {
  const duplicate = repo
    .list()
    .find(
      (r) =>
        r.ruleCode === ruleCode &&
        r.id !== excludeId &&
        (tenantId === undefined || r.tenantId === tenantId),
    );
  if (duplicate) {
    throw new Error(`ERDE validation: rule code "${ruleCode}" already exists.`);
  }
}

export function validateErdePriority(priority: number, entityRef?: string): ErdeValidationIssue[] {
  const issues: ErdeValidationIssue[] = [];
  if (priority < ERDE_MIN_PRIORITY || priority > ERDE_MAX_PRIORITY) {
    issues.push(
      issue(
        "ERDE_INVALID_PRIORITY",
        "error",
        `Priority ${priority} must be between ${ERDE_MIN_PRIORITY} and ${ERDE_MAX_PRIORITY}.`,
        entityRef,
      ),
    );
  }
  return issues;
}

export function validateErdeRuleDependencies(rule: ErdeRule): ErdeValidationIssue[] {
  const issues: ErdeValidationIssue[] = [];

  for (const depId of rule.dependencyRuleIds) {
    const dep = getErdePorts().rules.findById(depId);
    if (!dep) {
      issues.push(
        issue("ERDE_MISSING_DEPENDENCY", "error", `Dependency rule "${depId}" not found.`, rule.id),
      );
    }
  }

  if (rule.parentRuleId) {
    const parent = getErdePorts().rules.findById(rule.parentRuleId);
    if (!parent) {
      issues.push(
        issue("ERDE_MISSING_DEPENDENCY", "error", `Parent rule "${rule.parentRuleId}" not found.`, rule.id),
      );
    }
  }

  const cycles = detectErdeRuleDependencyCycles(rule.id, rule.dependencyRuleIds);
  for (const cycle of cycles) {
    issues.push(
      issue("ERDE_CIRCULAR_REFERENCE", "error", `Circular rule dependency: ${cycle.join(" → ")}.`, rule.id),
    );
  }

  return issues;
}

function detectErdeRuleDependencyCycles(ruleId: string, dependencies: string[]): string[][] {
  const cycles: string[][] = [];
  const visited = new Set<string>();
  const path: string[] = [ruleId];

  function dfs(currentId: string): void {
    if (visited.has(currentId)) {
      const cycleStart = path.indexOf(currentId);
      if (cycleStart >= 0) cycles.push([...path.slice(cycleStart), currentId]);
      return;
    }
    visited.add(currentId);

    const rule = getErdePorts().rules.findById(currentId);
    const deps = currentId === ruleId ? dependencies : (rule?.dependencyRuleIds ?? []);

    for (const dep of deps) {
      path.push(dep);
      dfs(dep);
      path.pop();
    }
  }

  for (const dep of dependencies) dfs(dep);
  return cycles;
}

export function validateErdeRuleVersion(version: ErdeRuleVersion): ErdeValidationResult {
  const issues: ErdeValidationIssue[] = [];

  const root = version.expressions.find((e) => e.id === version.rootExpressionId);
  if (!root) {
    issues.push(
      issue("ERDE_INVALID_EXPRESSION", "error", "rootExpressionId must reference a valid expression.", version.id),
    );
  }

  for (const expression of version.expressions) {
    if (!isErdeLogicalOperator(expression.operator) && !isErdeComparisonOperator(expression.operator)) {
      issues.push(
        issue("ERDE_INVALID_EXPRESSION", "error", `Unknown operator "${expression.operator}".`, expression.id),
      );
    }

    for (const conditionId of expression.conditionIds) {
      const condition = version.conditions.find((c) => c.id === conditionId);
      if (!condition) {
        issues.push(
          issue("ERDE_INVALID_EXPRESSION", "error", `Expression references unknown condition.`, expression.id),
        );
      } else if (!condition.fieldRef.trim()) {
        issues.push(
          issue("ERDE_INVALID_EXPRESSION", "error", `Condition fieldRef cannot be empty.`, condition.id),
        );
      }
    }
  }

  for (const param of version.parameters) {
    if (param.required && !param.parameterCode.trim()) {
      issues.push(
        issue("ERDE_MISSING_PARAMETER", "error", "Required parameter must have a code.", param.id),
      );
    }
  }

  const requiredParams = version.parameters.filter((p) => p.required);
  if (requiredParams.length === 0) {
    issues.push(
      issue("ERDE_MISSING_PARAMETER", "warning", "Rule version has no required parameters.", version.id),
    );
  }

  const rule = getErdePorts().rules.findById(version.ruleId);
  if (!rule) {
    issues.push(
      issue("ERDE_INVALID_RULE", "error", "Version references unknown rule.", version.id),
    );
  } else if (rule.ruleCode !== version.ruleCode) {
    issues.push(
      issue("ERDE_INVALID_RULE", "error", "Version ruleCode must match rule definition.", version.id),
    );
  }

  const errors = issues.filter((i) => i.severity === "error");
  return { valid: errors.length === 0, issues };
}

export function assertErdeRuleVersionValid(version: ErdeRuleVersion): void {
  const result = validateErdeRuleVersion(version);
  if (!result.valid) {
    const messages = result.issues
      .filter((i) => i.severity === "error")
      .map((i) => i.message)
      .join("; ");
    throw new Error(`ERDE validation: rule version invalid — ${messages}`);
  }
}

export function validateErdeRule(
  repo: ErdeRuleRepositoryPort,
  rule: ErdeRule,
  existing?: ErdeRule,
): ErdeValidationResult {
  const issues: ErdeValidationIssue[] = [];

  try {
    validateErdeRuleCodeUniqueness(repo, rule.ruleCode, rule.tenantId, existing?.id);
  } catch (err) {
    issues.push(
      issue("ERDE_DUPLICATE_RULE_CODE", "error", err instanceof Error ? err.message : String(err), rule.id),
    );
  }

  if (existing && existing.tenantId !== rule.tenantId) {
    issues.push(issue("ERDE_INVALID_RULE", "error", "tenantId is immutable after rule creation.", rule.id));
  }

  issues.push(...validateErdePriority(rule.priority, rule.id));
  issues.push(...validateErdeRuleDependencies(rule));

  const errors = issues.filter((i) => i.severity === "error");
  return { valid: errors.length === 0, issues };
}

export function validateErdeDecisionTable(table: ErdeDecisionTable): ErdeValidationResult {
  const issues: ErdeValidationIssue[] = [];
  const inputColumns = table.columns.filter((c) => c.input);

  if (inputColumns.length === 0) {
    issues.push(issue("ERDE_INVALID_DECISION_TABLE", "error", "Decision table must have input columns.", table.id));
  }

  const outputColumns = table.columns.filter((c) => !c.input);
  if (outputColumns.length === 0) {
    issues.push(issue("ERDE_INVALID_DECISION_TABLE", "error", "Decision table must have output columns.", table.id));
  }

  if (table.rows.length === 0) {
    issues.push(issue("ERDE_INVALID_DECISION_TABLE", "error", "Decision table must have at least one row.", table.id));
  }

  for (const row of table.rows.filter((r) => r.enabled)) {
    issues.push(...validateErdePriority(row.priority, row.id));
    for (const col of inputColumns) {
      if (!(col.columnCode in row.inputs)) {
        issues.push(
          issue(
            "ERDE_INVALID_DECISION_TABLE",
            "error",
            `Row "${row.rowCode}" missing input column "${col.columnCode}".`,
            row.id,
          ),
        );
      }
    }
  }

  const errors = issues.filter((i) => i.severity === "error");
  return { valid: errors.length === 0, issues };
}

export function validateErdeDecisionTree(tree: ErdeDecisionTree): ErdeValidationResult {
  const issues: ErdeValidationIssue[] = [];
  const nodeIds = new Set(tree.nodes.map((n) => n.id));

  if (!nodeIds.has(tree.rootNodeId)) {
    issues.push(
      issue("ERDE_INVALID_DECISION_TREE", "error", "rootNodeId must reference an existing node.", tree.id),
    );
  }

  for (const node of tree.nodes) {
    if (node.trueChildId && !nodeIds.has(node.trueChildId)) {
      issues.push(
        issue("ERDE_INVALID_DECISION_TREE", "error", `Node "${node.nodeCode}" has invalid trueChildId.`, node.id),
      );
    }
    if (node.falseChildId && !nodeIds.has(node.falseChildId)) {
      issues.push(
        issue("ERDE_INVALID_DECISION_TREE", "error", `Node "${node.nodeCode}" has invalid falseChildId.`, node.id),
      );
    }
    if (!node.isLeaf && !node.fieldRef) {
      issues.push(
        issue("ERDE_INVALID_DECISION_TREE", "error", `Non-leaf node "${node.nodeCode}" requires fieldRef.`, node.id),
      );
    }
    if (node.isLeaf && !node.output) {
      issues.push(
        issue("ERDE_INVALID_DECISION_TREE", "error", `Leaf node "${node.nodeCode}" requires output.`, node.id),
      );
    }
  }

  const errors = issues.filter((i) => i.severity === "error");
  return { valid: errors.length === 0, issues };
}

export function validateErdeEvaluationContext(
  version: ErdeRuleVersion,
  context: { parameters: Record<string, unknown> },
): void {
  for (const param of version.parameters.filter((p) => p.required)) {
    if (!(param.parameterCode in context.parameters)) {
      throw new Error(`ERDE validation: missing required parameter "${param.parameterCode}".`);
    }
  }
}

export function getErdePublishedVersion(ruleId: string): ErdeRuleVersion | undefined {
  return getErdePorts()
    .versions.listByRule(ruleId)
    .find((v) => v.lifecycleStatus === ERDE_RULE_LIFECYCLE_STATUS.PUBLISHED);
}
