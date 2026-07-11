/**
 * EPDE simulation engine — what-if and dry-run analysis.
 */

import type { EpdePolicyContext, EpdeSimulationResult } from "@/types/enterprise-policy-decision-engine";
import { recordEpdePolicyAudit } from "./audit-integration";
import { getEpdePorts } from "./composition";
import { detectEpdePolicyConflicts, resolveEpdePolicyConflict } from "./conflict-resolution-engine";
import { evaluateEpdeDecisionMatrix, evaluateEpdeScoringModel } from "./decision-matrix-engine";
import { evaluateEpdeDecisionTable } from "./decision-table-engine";
import { evaluateEpdeDecisionTree } from "./decision-tree-engine";
import { evaluateEpdePolicy, evaluateEpdePolicyGroup } from "./policy-evaluator";

export function simulateEpdePolicy(input: {
  policyCode: string;
  variables: Record<string, unknown>;
  parameters: Record<string, unknown>;
  scopeRefs?: string[];
  asOfDate?: string;
  executedBy: string;
}): EpdeSimulationResult {
  const executionId = crypto.randomUUID();
  const context: EpdePolicyContext = {
    executionId,
    variables: input.variables,
    parameters: input.parameters,
    scopeRefs: input.scopeRefs,
    asOfDate: input.asOfDate,
  };

  const result = evaluateEpdePolicy({
    policyCode: input.policyCode,
    context,
    executedBy: input.executedBy,
    persist: false,
  });

  const simulation: EpdeSimulationResult = {
    executionId,
    mode: "simulate",
    results: [result],
    conflicts: [],
    resolutions: [],
    simulated: true,
    executedBy: input.executedBy,
    executedOn: new Date().toISOString(),
    durationMs: 0,
  };

  getEpdePorts().simulations.append(simulation);
  recordEpdePolicyAudit({
    entityId: executionId,
    entityType: "execution",
    action: "simulated",
    actorId: input.executedBy,
    remarks: `Simulated policy ${input.policyCode}`,
  });

  return simulation;
}

export function runEpdeWhatIfAnalysis(input: {
  groupCode: string;
  variables: Record<string, unknown>;
  parameters: Record<string, unknown>;
  scopeRefs?: string[];
  asOfDate?: string;
  executedBy: string;
  autoResolveConflicts?: boolean;
}): EpdeSimulationResult {
  const executionId = crypto.randomUUID();
  const context: EpdePolicyContext = {
    executionId,
    variables: input.variables,
    parameters: input.parameters,
    scopeRefs: input.scopeRefs,
    asOfDate: input.asOfDate,
  };

  const base = evaluateEpdePolicyGroup({
    groupCode: input.groupCode,
    context,
    executedBy: input.executedBy,
  });

  const group = getEpdePorts().policyGroups.findByCode(input.groupCode)!;
  const conflicts = detectEpdePolicyConflicts(group, base.results);
  const resolutions = input.autoResolveConflicts
    ? conflicts
        .map((c) => resolveEpdePolicyConflict({
          conflictId: c.id,
          results: base.results,
          resolvedBy: input.executedBy,
        }))
        .filter((r): r is NonNullable<typeof r> => !!r)
    : [];

  const simulation: EpdeSimulationResult = {
    ...base,
    mode: "what_if",
    conflicts,
    resolutions,
    simulated: true,
  };

  getEpdePorts().simulations.append(simulation);
  recordEpdePolicyAudit({
    entityId: executionId,
    entityType: "execution",
    action: "simulated",
    actorId: input.executedBy,
    remarks: `What-if analysis for group ${input.groupCode}`,
  });

  return simulation;
}

export function simulateEpdeDecisionArtifacts(input: {
  tableId?: string;
  treeId?: string;
  matrixId?: string;
  scoringModelId?: string;
  variables: Record<string, unknown>;
  parameters: Record<string, unknown>;
  matrixRowKey?: string;
  matrixColumnKey?: string;
}): Record<string, unknown> {
  const context: EpdePolicyContext = {
    executionId: crypto.randomUUID(),
    variables: input.variables,
    parameters: input.parameters,
  };

  const output: Record<string, unknown> = {};

  if (input.tableId) {
    output.decisionTable = evaluateEpdeDecisionTable({ tableId: input.tableId, context });
  }
  if (input.treeId) {
    output.decisionTree = evaluateEpdeDecisionTree({ treeId: input.treeId, context });
  }
  if (input.matrixId && input.matrixRowKey && input.matrixColumnKey) {
    output.decisionMatrix = evaluateEpdeDecisionMatrix({
      matrixId: input.matrixId,
      rowKey: input.matrixRowKey,
      columnKey: input.matrixColumnKey,
    });
  }
  if (input.scoringModelId) {
    output.scoring = evaluateEpdeScoringModel({ modelId: input.scoringModelId, context });
  }

  return output;
}
