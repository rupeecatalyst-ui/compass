/**
 * EWE transition engine — state machine traversal and transition execution.
 */

import { EWE_INSTANCE_LIFECYCLE_STATUS, EWE_STATE_KINDS } from "@/constants/enterprise-workflow-engine";
import type {
  EweWorkflowInstance,
  EweWorkflowTransition,
  EweWorkflowVersion,
} from "@/types/enterprise-workflow-engine";
import { recordEweWorkflowAudit } from "./audit-integration";
import { getEwePorts } from "./composition";
import { transitionEweInstanceLifecycle } from "./lifecycle-manager";

export function getEweAvailableTransitions(
  version: EweWorkflowVersion,
  currentStateId: string,
): EweWorkflowTransition[] {
  return version.transitions
    .filter((t) => t.enabled && t.fromStateId === currentStateId)
    .sort((a, b) => a.priority - b.priority);
}

export function resolveEweTransition(
  version: EweWorkflowVersion,
  transitionId: string,
): EweWorkflowTransition | undefined {
  return version.transitions.find((t) => t.id === transitionId && t.enabled);
}

export function canExecuteEweTransition(
  instance: EweWorkflowInstance,
  version: EweWorkflowVersion,
  transition: EweWorkflowTransition,
): boolean {
  if (instance.currentStateId !== transition.fromStateId) return false;
  if (
    instance.lifecycleStatus !== EWE_INSTANCE_LIFECYCLE_STATUS.RUNNING &&
    instance.lifecycleStatus !== EWE_INSTANCE_LIFECYCLE_STATUS.WAITING
  ) {
    return false;
  }

  const fromState = version.states.find((s) => s.id === transition.fromStateId);
  if (fromState?.stateKind === EWE_STATE_KINDS.TERMINAL) return false;

  return true;
}

export function executeEweTransition(input: {
  instanceId: string;
  transitionId: string;
  actorId: string;
  remarks?: string;
}): EweWorkflowInstance | undefined {
  const instance = getEwePorts().instances.findById(input.instanceId);
  if (!instance) return undefined;

  const version = getEwePorts().versions.findById(instance.versionId);
  if (!version) {
    throw new Error(`EWE: version "${instance.versionId}" not found for instance.`);
  }

  const transition = resolveEweTransition(version, input.transitionId);
  if (!transition) {
    throw new Error(`EWE: transition "${input.transitionId}" not found or disabled.`);
  }

  if (!canExecuteEweTransition(instance, version, transition)) {
    throw new Error(
      `EWE: transition "${transition.transitionCode}" cannot execute from current state "${instance.currentStateId}".`,
    );
  }

  const toState = version.states.find((s) => s.id === transition.toStateId);
  if (!toState) {
    throw new Error(`EWE: target state "${transition.toStateId}" not found.`);
  }

  const now = new Date().toISOString();
  let lifecycleStatus = instance.lifecycleStatus;

  if (toState.stateKind === EWE_STATE_KINDS.TERMINAL) {
    lifecycleStatus = EWE_INSTANCE_LIFECYCLE_STATUS.COMPLETED;
  } else if (toState.stateKind === EWE_STATE_KINDS.WAIT) {
    lifecycleStatus = EWE_INSTANCE_LIFECYCLE_STATUS.WAITING;
  } else if (instance.lifecycleStatus === EWE_INSTANCE_LIFECYCLE_STATUS.CREATED) {
    lifecycleStatus = EWE_INSTANCE_LIFECYCLE_STATUS.RUNNING;
  } else if (instance.lifecycleStatus === EWE_INSTANCE_LIFECYCLE_STATUS.WAITING) {
    lifecycleStatus = EWE_INSTANCE_LIFECYCLE_STATUS.RUNNING;
  }

  const updated: EweWorkflowInstance = {
    ...instance,
    currentStateId: transition.toStateId,
    lifecycleStatus,
    assignmentId: toState.assignmentId ?? instance.assignmentId,
    modifiedBy: input.actorId,
    modifiedOn: now,
    ...(lifecycleStatus === EWE_INSTANCE_LIFECYCLE_STATUS.COMPLETED ? { completedOn: now } : {}),
  };

  getEwePorts().instances.save(updated);
  recordEweWorkflowAudit({
    entityId: instance.id,
    entityType: "instance",
    action: "transitioned",
    actorId: input.actorId,
    previousStateRef: instance.currentStateId,
    newStateRef: transition.toStateId,
    remarks: input.remarks ?? `Transition ${transition.transitionCode}`,
  });

  return updated;
}

export function suspendEweWorkflowInstance(
  instanceId: string,
  actorId: string,
  remarks?: string,
): EweWorkflowInstance | undefined {
  return transitionEweInstanceLifecycle({ instanceId, action: "suspend", actorId, remarks });
}

export function resumeEweWorkflowInstance(
  instanceId: string,
  actorId: string,
  remarks?: string,
): EweWorkflowInstance | undefined {
  return transitionEweInstanceLifecycle({ instanceId, action: "resume", actorId, remarks });
}

export function cancelEweWorkflowInstance(
  instanceId: string,
  actorId: string,
  remarks?: string,
): EweWorkflowInstance | undefined {
  return transitionEweInstanceLifecycle({ instanceId, action: "cancel", actorId, remarks });
}

export function terminateEweWorkflowInstance(
  instanceId: string,
  actorId: string,
  remarks?: string,
): EweWorkflowInstance | undefined {
  return transitionEweInstanceLifecycle({ instanceId, action: "terminate", actorId, remarks });
}

export function failEweWorkflowInstance(
  instanceId: string,
  actorId: string,
  failureReason: string,
): EweWorkflowInstance | undefined {
  return transitionEweInstanceLifecycle({
    instanceId,
    action: "fail",
    actorId,
    failureReason,
  });
}
