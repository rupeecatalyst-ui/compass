/**
 * EWE workflow instance registry.
 */

import { EWE_DEFINITION_LIFECYCLE_STATUS, EWE_INSTANCE_LIFECYCLE_STATUS } from "@/constants/enterprise-workflow-engine";
import type { EweWorkflowInstance } from "@/types/enterprise-workflow-engine";
import { recordEweWorkflowAudit } from "./audit-integration";
import { getEwePorts } from "./composition";
import { getEweWorkflowVersionById } from "./workflow-definition-registry";

export function createEweWorkflowInstance(input: {
  definitionId: string;
  versionId: string;
  workflowCode: string;
  createdBy: string;
  initialVariables?: Record<string, unknown>;
  assignmentId?: string;
  queueId?: string;
}): EweWorkflowInstance {
  const version = getEweWorkflowVersionById(input.versionId);
  if (!version) {
    throw new Error(`EWE: version "${input.versionId}" not found.`);
  }
  if (version.definitionId !== input.definitionId) {
    throw new Error("EWE: version does not belong to the specified definition.");
  }
  if (version.lifecycleStatus !== EWE_DEFINITION_LIFECYCLE_STATUS.PUBLISHED) {
    throw new Error("EWE: instances can only be created from published workflow versions.");
  }

  const startState = version.states.find((s) => s.id === version.startStateId);
  if (!startState) {
    throw new Error("EWE: published version has no valid start state.");
  }

  const now = new Date().toISOString();
  const instanceId = crypto.randomUUID();
  const instance: EweWorkflowInstance = {
    id: instanceId,
    definitionId: input.definitionId,
    versionId: input.versionId,
    workflowCode: input.workflowCode,
    lifecycleStatus: EWE_INSTANCE_LIFECYCLE_STATUS.CREATED,
    currentStateId: version.startStateId,
    context: {
      instanceId,
      variables: input.initialVariables ?? {},
    },
    assignmentId: input.assignmentId ?? startState.assignmentId,
    queueId: input.queueId,
    createdBy: input.createdBy,
    createdOn: now,
    modifiedBy: input.createdBy,
    modifiedOn: now,
  };

  getEwePorts().instances.save(instance);
  recordEweWorkflowAudit({
    entityId: instance.id,
    entityType: "instance",
    action: "created",
    actorId: input.createdBy,
    newStateRef: instance.lifecycleStatus,
    remarks: `Created instance for ${input.workflowCode}`,
  });

  return instance;
}

export function getEweWorkflowInstanceById(id: string): EweWorkflowInstance | undefined {
  return getEwePorts().instances.findById(id);
}

export function listEweWorkflowInstances(definitionId?: string): EweWorkflowInstance[] {
  return definitionId
    ? getEwePorts().instances.listByDefinition(definitionId)
    : getEwePorts().instances.list();
}

export function updateEweWorkflowContext(
  instanceId: string,
  variables: Record<string, unknown>,
  modifiedBy: string,
): EweWorkflowInstance | undefined {
  const instance = getEweWorkflowInstanceById(instanceId);
  if (!instance) return undefined;

  const updated: EweWorkflowInstance = {
    ...instance,
    context: { ...instance.context, variables: { ...instance.context.variables, ...variables } },
    modifiedBy,
    modifiedOn: new Date().toISOString(),
  };

  getEwePorts().instances.save(updated);
  return updated;
}
