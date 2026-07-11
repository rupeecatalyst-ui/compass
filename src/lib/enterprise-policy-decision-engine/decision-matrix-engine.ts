/**
 * EPDE decision matrix engine.
 */

import { EPDE_POLICY_LIFECYCLE_STATUS } from "@/constants/enterprise-policy-decision-engine";
import type { EpdePolicyContext } from "@/types/enterprise-policy-decision-engine";
import { getEpdePorts } from "./composition";
import { validateEpdeDecisionMatrix } from "./validation-engine";

export function evaluateEpdeDecisionMatrix(input: {
  matrixId: string;
  rowKey: string;
  columnKey: string;
}): { matched: boolean; output: Record<string, unknown> } {
  const matrix = getEpdePorts().decisionMatrices.findById(input.matrixId);
  if (!matrix?.enabled) throw new Error(`EPDE: decision matrix "${input.matrixId}" not found.`);
  if (matrix.lifecycleStatus !== EPDE_POLICY_LIFECYCLE_STATUS.PUBLISHED) {
    throw new Error(`EPDE: decision matrix "${matrix.matrixCode}" is not published.`);
  }

  const validation = validateEpdeDecisionMatrix(matrix);
  if (!validation.valid) throw new Error("EPDE: decision matrix validation failed.");

  const cell = matrix.cells.find((c) => c.rowKey === input.rowKey && c.columnKey === input.columnKey);
  if (!cell) return { matched: false, output: {} };

  return { matched: true, output: cell.output };
}

export function evaluateEpdeScoringModel(input: {
  modelId: string;
  context: EpdePolicyContext;
}): { score: number; passed: boolean } {
  const model = getEpdePorts().scoringModels.findById(input.modelId);
  if (!model?.enabled) throw new Error(`EPDE: scoring model "${input.modelId}" not found.`);
  if (model.lifecycleStatus !== EPDE_POLICY_LIFECYCLE_STATUS.PUBLISHED) {
    throw new Error(`EPDE: scoring model "${model.modelCode}" is not published.`);
  }

  let score = 0;
  let totalWeight = 0;

  for (const criterion of model.criteria.filter((c) => c.enabled)) {
    const value = Number(
      input.context.variables[criterion.fieldRef] ?? input.context.parameters[criterion.fieldRef] ?? 0,
    );
    const normalized = Math.min(value / criterion.maxScore, 1);
    score += normalized * criterion.weight;
    totalWeight += criterion.weight;
  }

  const finalScore = totalWeight > 0 ? (score / totalWeight) * 100 : 0;
  return { score: finalScore, passed: finalScore >= model.passThreshold };
}
