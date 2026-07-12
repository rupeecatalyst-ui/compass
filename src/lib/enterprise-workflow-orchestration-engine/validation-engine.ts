/**
 * EWOE validation helpers.
 */

import type {
  EwoeValidationResult,
  EwoeWorkflowDefinition,
} from "@/types/enterprise-workflow-orchestration-engine";

export function validateEwoeWorkflowDefinition(
  definition: EwoeWorkflowDefinition,
): EwoeValidationResult {
  const issues: EwoeValidationResult["issues"] = [];

  if (!definition.definitionCode.trim()) {
    issues.push({
      code: "EWOE_DEF_CODE_REQUIRED",
      severity: "error",
      message: "Definition code is required",
    });
  }
  if (!definition.stages.length) {
    issues.push({
      code: "EWOE_STAGES_REQUIRED",
      severity: "error",
      message: "At least one workflow stage is required",
    });
  }

  const codes = new Set<string>();
  for (const stage of definition.stages) {
    if (codes.has(stage.stageCode)) {
      issues.push({
        code: "EWOE_DUPLICATE_STAGE",
        severity: "error",
        message: `Duplicate stage code ${stage.stageCode}`,
        entityRef: stage.stageCode,
      });
    }
    codes.add(stage.stageCode);
    if (stage.nextStageCode && !definition.stages.some((s) => s.stageCode === stage.nextStageCode)) {
      issues.push({
        code: "EWOE_NEXT_STAGE_MISSING",
        severity: "warning",
        message: `Next stage ${stage.nextStageCode} not found in definition`,
        entityRef: stage.stageCode,
      });
    }
  }

  return { valid: issues.every((i) => i.severity !== "error"), issues };
}
