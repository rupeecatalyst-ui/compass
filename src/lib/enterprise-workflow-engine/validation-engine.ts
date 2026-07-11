/**
 * EWE validation engine — aggregates graph and registry validation.
 */

import {
  EWE_DEFINITION_LIFECYCLE_TRANSITIONS,
  EWE_INSTANCE_LIFECYCLE_TRANSITIONS,
} from "@/constants/enterprise-workflow-engine";
import type {
  EweDefinitionLifecycleStatus,
  EweInstanceLifecycleStatus,
  EweValidationResult,
  EweWorkflowDefinition,
  EweWorkflowVersion,
} from "@/types/enterprise-workflow-engine";
import type { EweDefinitionRepositoryPort } from "@/types/enterprise-workflow-engine-ports";
import { validateEweWorkflowGraph } from "./graph-validator";

export function validateEweDefinitionLifecycleTransition(
  from: EweDefinitionLifecycleStatus,
  to: EweDefinitionLifecycleStatus,
): void {
  const allowed = EWE_DEFINITION_LIFECYCLE_TRANSITIONS[from] ?? [];
  if (!allowed.includes(to)) {
    throw new Error(`EWE validation: cannot transition definition lifecycle from "${from}" to "${to}".`);
  }
}

export function validateEweInstanceLifecycleTransition(
  from: EweInstanceLifecycleStatus,
  to: EweInstanceLifecycleStatus,
): void {
  const allowed = EWE_INSTANCE_LIFECYCLE_TRANSITIONS[from] ?? [];
  if (!allowed.includes(to)) {
    throw new Error(`EWE validation: cannot transition instance lifecycle from "${from}" to "${to}".`);
  }
}

export function validateEweWorkflowCodeUniqueness(
  repo: EweDefinitionRepositoryPort,
  workflowCode: string,
  tenantId?: string,
  excludeId?: string,
): void {
  const duplicate = repo
    .list()
    .find(
      (d) =>
        d.workflowCode === workflowCode &&
        d.id !== excludeId &&
        (tenantId === undefined || d.tenantId === tenantId),
    );
  if (duplicate) {
    throw new Error(`EWE validation: workflow code "${workflowCode}" already exists.`);
  }
}

export function validateEweWorkflowDefinition(
  repo: EweDefinitionRepositoryPort,
  definition: EweWorkflowDefinition,
  existing?: EweWorkflowDefinition,
): void {
  validateEweWorkflowCodeUniqueness(
    repo,
    definition.workflowCode,
    definition.tenantId,
    existing?.id,
  );

  if (existing && existing.tenantId !== definition.tenantId) {
    throw new Error("EWE validation: tenantId is immutable after definition creation.");
  }
}

export function validateEweWorkflowVersion(version: EweWorkflowVersion): EweValidationResult {
  return validateEweWorkflowGraph(version);
}

export function assertEweWorkflowVersionValid(version: EweWorkflowVersion): void {
  const result = validateEweWorkflowVersion(version);
  if (!result.valid) {
    const messages = result.issues
      .filter((i) => i.severity === "error")
      .map((i) => i.message)
      .join("; ");
    throw new Error(`EWE validation: workflow version graph invalid — ${messages}`);
  }
}
