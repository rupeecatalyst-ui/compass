/**
 * ERDE expression evaluator — configuration-driven condition evaluation.
 */

import { ERDE_COMPARISON_OPERATORS, ERDE_LOGICAL_OPERATORS } from "@/constants/enterprise-rules-decision-engine";
import type {
  ErdeExpressionOperator,
  ErdeRuleCondition,
  ErdeRuleContext,
  ErdeRuleVersion,
} from "@/types/enterprise-rules-decision-engine";

function getContextValue(context: ErdeRuleContext, fieldRef: string): unknown {
  if (fieldRef in context.variables) return context.variables[fieldRef];
  if (fieldRef in context.parameters) return context.parameters[fieldRef];
  return undefined;
}

function compareValues(
  operator: ErdeExpressionOperator,
  left: unknown,
  right?: string,
): boolean {
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

export function evaluateErdeCondition(
  condition: ErdeRuleCondition,
  context: ErdeRuleContext,
): boolean {
  const value = getContextValue(context, condition.fieldRef);
  return compareValues(condition.operator, value, condition.value);
}

export function evaluateErdeExpression(
  version: ErdeRuleVersion,
  expressionId: string,
  context: ErdeRuleContext,
): boolean {
  const expression = version.expressions.find((e) => e.id === expressionId && e.enabled);
  if (!expression) return false;

  if (expression.operator === "and") {
    const conditionResults = expression.conditionIds.map((id) => {
      const condition = version.conditions.find((c) => c.id === id);
      return condition ? evaluateErdeCondition(condition, context) : false;
    });
    const childResults = expression.childExpressionIds.map((id) =>
      evaluateErdeExpression(version, id, context),
    );
    return [...conditionResults, ...childResults].every(Boolean);
  }

  if (expression.operator === "or") {
    const conditionResults = expression.conditionIds.map((id) => {
      const condition = version.conditions.find((c) => c.id === id);
      return condition ? evaluateErdeCondition(condition, context) : false;
    });
    const childResults = expression.childExpressionIds.map((id) =>
      evaluateErdeExpression(version, id, context),
    );
    return [...conditionResults, ...childResults].some(Boolean);
  }

  if (expression.operator === "not") {
    const target = expression.conditionIds[0];
    if (target) {
      const condition = version.conditions.find((c) => c.id === target);
      return condition ? !evaluateErdeCondition(condition, context) : true;
    }
    const child = expression.childExpressionIds[0];
    return child ? !evaluateErdeExpression(version, child, context) : true;
  }

  if ((ERDE_COMPARISON_OPERATORS as readonly string[]).includes(expression.operator)) {
    const condition = version.conditions.find((c) => expression.conditionIds.includes(c.id));
    return condition ? evaluateErdeCondition(condition, context) : false;
  }

  return false;
}

export function isErdeLogicalOperator(operator: ErdeExpressionOperator): boolean {
  return (ERDE_LOGICAL_OPERATORS as readonly string[]).includes(operator);
}

export function isErdeComparisonOperator(operator: ErdeExpressionOperator): boolean {
  return (ERDE_COMPARISON_OPERATORS as readonly string[]).includes(operator);
}
