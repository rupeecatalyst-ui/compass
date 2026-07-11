/**
 * ERDE rule evaluator — single rule and rule set chaining.
 */

import { ERDE_ACTION_KINDS, ERDE_RULE_LIFECYCLE_STATUS } from "@/constants/enterprise-rules-decision-engine";
import type {
  ErdeRule,
  ErdeRuleContext,
  ErdeRuleExecution,
  ErdeRuleResult,
  ErdeRuleVersion,
} from "@/types/enterprise-rules-decision-engine";
import { recordErdeRuleAudit } from "./audit-integration";
import { getErdePorts } from "./composition";
import { evaluateErdeExpression } from "./expression-evaluator";
import {
  getErdePublishedVersion,
  validateErdeEvaluationContext,
} from "./validation-engine";

function applyErdeInheritance(rule: ErdeRule, context: ErdeRuleContext): ErdeRuleContext {
  if (!rule.parentRuleId) return context;

  const parent = getErdePorts().rules.findById(rule.parentRuleId);
  if (!parent) return context;

  const parentVersion = getErdePublishedVersion(parent.id);
  if (!parentVersion) return context;

  const parentResult = evaluateErdeRuleVersionInternal(parent, parentVersion, context);
  return {
    ...context,
    variables: { ...context.variables, ...parentResult.output },
  };
}

function executeErdeActions(
  version: ErdeRuleVersion,
  matched: boolean,
): { output: Record<string, unknown>; chainedRuleIds: string[]; messages: string[] } {
  const output: Record<string, unknown> = {};
  const chainedRuleIds: string[] = [];
  const messages: string[] = [];

  if (!matched) return { output, chainedRuleIds, messages };

  for (const action of version.actions.filter((a) => a.enabled)) {
    switch (action.actionKind) {
      case ERDE_ACTION_KINDS.SET_VARIABLE:
        if (action.targetRef && action.payload) {
          output[action.targetRef] = action.payload.value ?? action.payload;
        }
        break;
      case ERDE_ACTION_KINDS.EMIT_RESULT:
        Object.assign(output, action.payload ?? {});
        break;
      case ERDE_ACTION_KINDS.CHAIN_RULE:
        if (action.targetRef) chainedRuleIds.push(action.targetRef);
        break;
      case ERDE_ACTION_KINDS.LOG:
        messages.push(String(action.payload?.message ?? action.actionCode));
        break;
      case ERDE_ACTION_KINDS.STOP:
        return { output, chainedRuleIds, messages };
    }
  }

  return { output, chainedRuleIds, messages };
}

function evaluateErdeRuleVersionInternal(
  rule: ErdeRule,
  version: ErdeRuleVersion,
  context: ErdeRuleContext,
): ErdeRuleResult {
  validateErdeEvaluationContext(version, context);

  const inheritedContext = applyErdeInheritance(rule, context);
  const matched = evaluateErdeExpression(version, version.rootExpressionId, inheritedContext);
  const { output, chainedRuleIds, messages } = executeErdeActions(version, matched);

  return {
    ruleId: rule.id,
    ruleCode: rule.ruleCode,
    versionId: version.id,
    matched,
    output,
    chainedRuleIds,
    messages,
  };
}

export function evaluateErdeRule(input: {
  ruleCode: string;
  context: ErdeRuleContext;
  executedBy: string;
  persist?: boolean;
}): ErdeRuleResult {
  const rule = getErdePorts().rules.findByCode(input.ruleCode);
  if (!rule?.active || !rule.enabled) {
    throw new Error(`ERDE: rule "${input.ruleCode}" not found, inactive, or disabled.`);
  }
  if (rule.lifecycleStatus !== ERDE_RULE_LIFECYCLE_STATUS.PUBLISHED) {
    throw new Error(`ERDE: rule "${input.ruleCode}" is not published.`);
  }

  const version = getErdePublishedVersion(rule.id);
  if (!version) {
    throw new Error(`ERDE: no published version for rule "${input.ruleCode}".`);
  }

  const start = Date.now();
  const result = evaluateErdeRuleVersionInternal(rule, version, input.context);

  if (input.persist !== false) {
    const execution: ErdeRuleExecution = {
      id: input.context.executionId,
      ruleId: rule.id,
      ruleCode: rule.ruleCode,
      mode: "evaluate",
      context: input.context,
      results: [result],
      simulated: false,
      executedBy: input.executedBy,
      executedOn: new Date().toISOString(),
      durationMs: Date.now() - start,
    };
    getErdePorts().executions.append(execution);

    recordErdeRuleAudit({
      entityId: execution.id,
      entityType: "execution",
      action: "evaluated",
      actorId: input.executedBy,
      remarks: `Evaluated rule ${rule.ruleCode} — matched: ${result.matched}`,
    });
  }

  return result;
}

export function evaluateErdeRuleSet(input: {
  setCode: string;
  context: ErdeRuleContext;
  executedBy: string;
  simulate?: boolean;
}): ErdeRuleExecution {
  const ruleSet = getErdePorts().ruleSets.findByCode(input.setCode);
  if (!ruleSet?.enabled) {
    throw new Error(`ERDE: rule set "${input.setCode}" not found or disabled.`);
  }

  const start = Date.now();
  const results: ErdeRuleResult[] = [];
  const visited = new Set<string>();

  const rules = ruleSet.ruleIds
    .map((id) => getErdePorts().rules.findById(id))
    .filter((r): r is ErdeRule => !!r && r.active && r.enabled)
    .sort((a, b) => a.priority - b.priority);

  const queue = [...rules];

  while (queue.length > 0) {
    const rule = queue.shift()!;
    if (visited.has(rule.id)) continue;
    visited.add(rule.id);

    const version = getErdePublishedVersion(rule.id);
    if (!version) continue;

    const result = evaluateErdeRuleVersionInternal(rule, version, input.context);
    results.push(result);

    for (const chainedId of result.chainedRuleIds) {
      const chained = getErdePorts().rules.findById(chainedId);
      if (chained) queue.push(chained);
    }
  }

  const execution: ErdeRuleExecution = {
    id: input.context.executionId,
    ruleSetId: ruleSet.id,
    mode: input.simulate ? "simulate" : "evaluate",
    context: input.context,
    results,
    simulated: input.simulate ?? false,
    executedBy: input.executedBy,
    executedOn: new Date().toISOString(),
    durationMs: Date.now() - start,
  };

  getErdePorts().executions.append(execution);
  recordErdeRuleAudit({
    entityId: execution.id,
    entityType: "execution",
    action: input.simulate ? "simulated" : "evaluated",
    actorId: input.executedBy,
    remarks: `${input.simulate ? "Simulated" : "Evaluated"} rule set ${ruleSet.setCode} — ${results.length} results`,
  });

  return execution;
}

export function listErdeExecutions(): ErdeRuleExecution[] {
  return getErdePorts().executions.list();
}
