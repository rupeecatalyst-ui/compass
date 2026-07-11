/**
 * ERDE simulation engine — dry-run evaluation without side effects.
 */

import type { ErdeRuleExecution, ErdeRuleResult } from "@/types/enterprise-rules-decision-engine";
import { recordErdeRuleAudit } from "./audit-integration";
import { getErdePorts } from "./composition";
import { evaluateErdeDecisionTable } from "./decision-table-engine";
import { evaluateErdeDecisionTree } from "./decision-tree-engine";
import { evaluateErdeRule, evaluateErdeRuleSet } from "./rule-evaluator";

export function simulateErdeRule(input: {
  ruleCode: string;
  variables: Record<string, unknown>;
  parameters: Record<string, unknown>;
  executedBy: string;
}): ErdeRuleResult {
  const executionId = crypto.randomUUID();
  const context = {
    executionId,
    variables: input.variables,
    parameters: input.parameters,
  };

  const result = evaluateErdeRule({
    ruleCode: input.ruleCode,
    context,
    executedBy: input.executedBy,
    persist: false,
  });

  const execution: ErdeRuleExecution = {
    id: executionId,
    ruleCode: input.ruleCode,
    mode: "simulate",
    context,
    results: [result],
    simulated: true,
    executedBy: input.executedBy,
    executedOn: new Date().toISOString(),
    durationMs: 0,
  };

  getErdePorts().executions.append(execution);
  recordErdeRuleAudit({
    entityId: execution.id,
    entityType: "execution",
    action: "simulated",
    actorId: input.executedBy,
    remarks: `Simulated rule ${input.ruleCode}`,
  });

  return result;
}

export function simulateErdeRuleSet(input: {
  setCode: string;
  variables: Record<string, unknown>;
  parameters: Record<string, unknown>;
  executedBy: string;
}): ErdeRuleExecution {
  return evaluateErdeRuleSet({
    setCode: input.setCode,
    context: {
      executionId: crypto.randomUUID(),
      variables: input.variables,
      parameters: input.parameters,
    },
    executedBy: input.executedBy,
    simulate: true,
  });
}

export function simulateErdeDecisionTable(input: {
  tableId: string;
  variables: Record<string, unknown>;
  parameters: Record<string, unknown>;
}): { matched: boolean; outputs: Record<string, string>; rowCode?: string } {
  return evaluateErdeDecisionTable({
    tableId: input.tableId,
    context: {
      executionId: crypto.randomUUID(),
      variables: input.variables,
      parameters: input.parameters,
    },
  });
}

export function simulateErdeDecisionTree(input: {
  treeId: string;
  variables: Record<string, unknown>;
  parameters: Record<string, unknown>;
}): { matched: boolean; output: Record<string, unknown> } {
  return evaluateErdeDecisionTree({
    treeId: input.treeId,
    context: {
      executionId: crypto.randomUUID(),
      variables: input.variables,
      parameters: input.parameters,
    },
  });
}
