/**
 * EWE lifecycle manager — definition and instance lifecycle transitions.
 */

import {
  EWE_DEFINITION_LIFECYCLE_ACTION_MAP,
  EWE_DEFINITION_LIFECYCLE_STATUS,
  EWE_INSTANCE_LIFECYCLE_ACTION_MAP,
} from "@/constants/enterprise-workflow-engine";
import type {
  EweDefinitionLifecycleAction,
  EweDefinitionLifecycleStatus,
  EweInstanceLifecycleAction,
  EweInstanceLifecycleStatus,
  EweWorkflowDefinition,
  EweWorkflowInstance,
  EweWorkflowVersion,
} from "@/types/enterprise-workflow-engine";
import { recordEweWorkflowAudit } from "./audit-integration";
import { getEwePorts } from "./composition";
import {
  assertEweWorkflowVersionValid,
  validateEweDefinitionLifecycleTransition,
  validateEweInstanceLifecycleTransition,
} from "./validation-engine";

export function transitionEweDefinitionLifecycle(input: {
  definitionId: string;
  action: EweDefinitionLifecycleAction;
  actorId: string;
  remarks?: string;
}): EweWorkflowDefinition | undefined {
  const definition = getEwePorts().definitions.findById(input.definitionId);
  if (!definition) return undefined;

  const target = EWE_DEFINITION_LIFECYCLE_ACTION_MAP[input.action] as EweDefinitionLifecycleStatus;
  validateEweDefinitionLifecycleTransition(definition.lifecycleStatus, target);

  if (input.action === "publish") {
    const publishedVersion = getEwePorts()
      .versions.listByDefinition(definition.id)
      .find((v) => v.lifecycleStatus === EWE_DEFINITION_LIFECYCLE_STATUS.PUBLISHED);
    if (!publishedVersion) {
      throw new Error("EWE: cannot publish definition without a published workflow version.");
    }
    assertEweWorkflowVersionValid(publishedVersion);
  }

  const updated: EweWorkflowDefinition = {
    ...definition,
    lifecycleStatus: target,
    modifiedBy: input.actorId,
    modifiedOn: new Date().toISOString(),
  };

  getEwePorts().definitions.save(updated);
  recordEweWorkflowAudit({
    entityId: definition.id,
    entityType: "definition",
    action: target === EWE_DEFINITION_LIFECYCLE_STATUS.ARCHIVED ? "archived" : "lifecycle_changed",
    actorId: input.actorId,
    previousStateRef: definition.lifecycleStatus,
    newStateRef: target,
    remarks: input.remarks,
  });

  return updated;
}

export function transitionEweVersionLifecycle(input: {
  versionId: string;
  action: EweDefinitionLifecycleAction;
  actorId: string;
  remarks?: string;
}): EweWorkflowVersion | undefined {
  const version = getEwePorts().versions.findById(input.versionId);
  if (!version) return undefined;

  const target = EWE_DEFINITION_LIFECYCLE_ACTION_MAP[input.action] as EweDefinitionLifecycleStatus;
  validateEweDefinitionLifecycleTransition(version.lifecycleStatus, target);

  if (input.action === "validate" || input.action === "approve" || input.action === "publish") {
    assertEweWorkflowVersionValid(version);
  }

  const now = new Date().toISOString();
  const updated: EweWorkflowVersion = {
    ...version,
    lifecycleStatus: target,
    modifiedBy: input.actorId,
    modifiedOn: now,
    ...(input.action === "publish"
      ? { publishedOn: now, publishedBy: input.actorId }
      : {}),
  };

  getEwePorts().versions.save(updated);
  recordEweWorkflowAudit({
    entityId: version.id,
    entityType: "version",
    action: target === EWE_DEFINITION_LIFECYCLE_STATUS.ARCHIVED ? "archived" : "lifecycle_changed",
    actorId: input.actorId,
    previousStateRef: version.lifecycleStatus,
    newStateRef: target,
    remarks: input.remarks,
  });

  return updated;
}

export function transitionEweInstanceLifecycle(input: {
  instanceId: string;
  action: EweInstanceLifecycleAction;
  actorId: string;
  failureReason?: string;
  remarks?: string;
}): EweWorkflowInstance | undefined {
  const instance = getEwePorts().instances.findById(input.instanceId);
  if (!instance) return undefined;

  const target = EWE_INSTANCE_LIFECYCLE_ACTION_MAP[input.action] as EweInstanceLifecycleStatus;
  validateEweInstanceLifecycleTransition(instance.lifecycleStatus, target);

  const now = new Date().toISOString();
  const updated: EweWorkflowInstance = {
    ...instance,
    lifecycleStatus: target,
    modifiedBy: input.actorId,
    modifiedOn: now,
    ...(input.action === "suspend" ? { suspendedOn: now, suspendedBy: input.actorId } : {}),
    ...(input.action === "complete" ? { completedOn: now } : {}),
    ...(input.action === "cancel" || input.action === "terminate" ? { cancelledOn: now } : {}),
    ...(input.action === "fail" ? { failedOn: now, failureReason: input.failureReason } : {}),
  };

  getEwePorts().instances.save(updated);
  recordEweWorkflowAudit({
    entityId: instance.id,
    entityType: "instance",
    action: "lifecycle_changed",
    actorId: input.actorId,
    previousStateRef: instance.lifecycleStatus,
    newStateRef: target,
    remarks: input.remarks ?? input.failureReason,
  });

  return updated;
}
