/**
 * EPDE expression evaluator.
 */

import { EPDE_COMPARISON_OPERATORS, EPDE_LOGICAL_OPERATORS } from "@/constants/enterprise-policy-decision-engine";
import type {
  EpdeExpressionOperator,
  EpdePolicyCondition,
  EpdePolicyContext,
  EpdePolicyVersion,
} from "@/types/enterprise-policy-decision-engine";

function getContextValue(context: EpdePolicyContext, fieldRef: string): unknown {
  if (fieldRef in context.variables) return context.variables[fieldRef];
  if (fieldRef in context.parameters) return context.parameters[fieldRef];
  return undefined;
}

function compareValues(operator: EpdeExpressionOperator, left: unknown, right?: string): boolean {
  switch (operator) {
    case "equals":
      return String(left) === right;
    case "not_equals":
      return String(left) !== right;
    case "greater_than":
      return Number(left) > Number(right);
    case "less_than":
      return Number(left) < Number(right);
    case "gte":
      return Number(left) >= Number(right);
    case "lte":
      return Number(left) <= Number(right);
    case "in":
      return (right ?? "").split(",").map((v) => v.trim()).includes(String(left));
    case "not_in":
      return !(right ?? "").split(",").map((v) => v.trim()).includes(String(left));
    case "exists":
      return left !== undefined && left !== null;
    case "not_exists":
      return left === undefined || left === null;
    default:
      return false;
  }
}

export function evaluateEpdeCondition(condition: EpdePolicyCondition, context: EpdePolicyContext): boolean {
  return compareValues(condition.operator, getContextValue(context, condition.fieldRef), condition.value);
}

export function evaluateEpdeExpression(
  version: EpdePolicyVersion,
  expressionId: string,
  context: EpdePolicyContext,
): boolean {
  const expression = version.expressions.find((e) => e.id === expressionId && e.enabled);
  if (!expression) return false;

  if (expression.operator === "and") {
    const parts = [
      ...expression.conditionIds.map((id) => {
        const c = version.conditions.find((x) => x.id === id);
        return c ? evaluateEpdeCondition(c, context) : false;
      }),
      ...expression.childExpressionIds.map((id) => evaluateEpdeExpression(version, id, context)),
    ];
    return parts.every(Boolean);
  }

  if (expression.operator === "or") {
    const parts = [
      ...expression.conditionIds.map((id) => {
        const c = version.conditions.find((x) => x.id === id);
        return c ? evaluateEpdeCondition(c, context) : false;
      }),
      ...expression.childExpressionIds.map((id) => evaluateEpdeExpression(version, id, context)),
    ];
    return parts.some(Boolean);
  }

  if (expression.operator === "not") {
    const c = version.conditions.find((x) => expression.conditionIds.includes(x.id));
    if (c) return !evaluateEpdeCondition(c, context);
    const child = expression.childExpressionIds[0];
    return child ? !evaluateEpdeExpression(version, child, context) : true;
  }

  if ((EPDE_COMPARISON_OPERATORS as readonly string[]).includes(expression.operator)) {
    const c = version.conditions.find((x) => expression.conditionIds.includes(x.id));
    return c ? evaluateEpdeCondition(c, context) : false;
  }

  return false;
}

export function isEpdeLogicalOperator(operator: EpdeExpressionOperator): boolean {
  return (EPDE_LOGICAL_OPERATORS as readonly string[]).includes(operator);
}

export function isEpdeComparisonOperator(operator: EpdeExpressionOperator): boolean {
  return (EPDE_COMPARISON_OPERATORS as readonly string[]).includes(operator);
}
