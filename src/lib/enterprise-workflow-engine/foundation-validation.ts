/**
 * EWE foundation validation — smoke checks for Sprint 5 deliverable verification.
 */

import {
  EWE_ACTION_KINDS,
  EWE_DEFINITION_LIFECYCLE_STATUS,
  EWE_INSTANCE_LIFECYCLE_STATUS,
  EWE_STATE_KINDS,
  EWE_TRANSITION_KINDS,
} from "@/constants/enterprise-workflow-engine";
import type { EweWorkflowVersion } from "@/types/enterprise-workflow-engine";
import { resetEweComposition } from "./composition";
import { validateEweWorkflowGraph } from "./graph-validator";
import {
  transitionEweDefinitionLifecycle,
  transitionEweInstanceLifecycle,
  transitionEweVersionLifecycle,
} from "./lifecycle-manager";
import { getEweRegistrySnapshot } from "./registry-snapshot";
import {
  executeEweTransition,
  getEweAvailableTransitions,
  resumeEweWorkflowInstance,
  suspendEweWorkflowInstance,
} from "./transition-engine";
import {
  createEweWorkflowVersion,
  registerEweWorkflowDefinition,
} from "./workflow-definition-registry";
import { createEweWorkflowInstance } from "./workflow-instance-registry";

function buildSampleVersion(definitionId: string, workflowCode: string): EweWorkflowVersion {
  const stageId = crypto.randomUUID();
  const startId = crypto.randomUUID();
  const reviewId = crypto.randomUUID();
  const approvedId = crypto.randomUUID();
  const terminalId = crypto.randomUUID();
  const queueId = crypto.randomUUID();
  const participantId = crypto.randomUUID();
  const assignmentId = crypto.randomUUID();
  const slaId = crypto.randomUUID();
  const escalationId = crypto.randomUUID();
  const actionId = crypto.randomUUID();
  const triggerId = crypto.randomUUID();
  const eventId = crypto.randomUUID();
  const t1Id = crypto.randomUUID();
  const t2Id = crypto.randomUUID();
  const t3Id = crypto.randomUUID();
  const now = new Date().toISOString();

  return {
    id: crypto.randomUUID(),
    definitionId,
    workflowCode,
    versionMajor: 1,
    versionMinor: 0,
    lifecycleStatus: EWE_DEFINITION_LIFECYCLE_STATUS.DRAFT,
    stages: [
      {
        id: stageId,
        stageCode: "INTAKE",
        stageName: "Intake",
        description: "Initial intake stage",
        sortOrder: 1,
        enabled: true,
      },
    ],
    states: [
      {
        id: startId,
        stateCode: "START",
        stateName: "Start",
        stageId,
        stateKind: EWE_STATE_KINDS.START,
        entryActionIds: [],
        exitActionIds: [],
        enabled: true,
      },
      {
        id: reviewId,
        stateCode: "REVIEW",
        stateName: "Review",
        stageId,
        stateKind: EWE_STATE_KINDS.WAIT,
        entryActionIds: [],
        exitActionIds: [],
        assignmentId,
        slaId,
        enabled: true,
      },
      {
        id: approvedId,
        stateCode: "APPROVED",
        stateName: "Approved",
        stageId,
        stateKind: EWE_STATE_KINDS.INTERMEDIATE,
        entryActionIds: [actionId],
        exitActionIds: [],
        enabled: true,
      },
      {
        id: terminalId,
        stateCode: "DONE",
        stateName: "Done",
        stageId,
        stateKind: EWE_STATE_KINDS.TERMINAL,
        entryActionIds: [],
        exitActionIds: [],
        enabled: true,
      },
    ],
    transitions: [
      {
        id: t1Id,
        transitionCode: "SUBMIT",
        label: "Submit",
        fromStateId: startId,
        toStateId: reviewId,
        transitionKind: EWE_TRANSITION_KINDS.MANUAL,
        rules: [],
        actionIds: [],
        priority: 1,
        enabled: true,
      },
      {
        id: t2Id,
        transitionCode: "APPROVE",
        label: "Approve",
        fromStateId: reviewId,
        toStateId: approvedId,
        transitionKind: EWE_TRANSITION_KINDS.APPROVAL,
        rules: [],
        triggerId,
        actionIds: [actionId],
        priority: 1,
        enabled: true,
      },
      {
        id: t3Id,
        transitionCode: "COMPLETE",
        label: "Complete",
        fromStateId: approvedId,
        toStateId: terminalId,
        transitionKind: EWE_TRANSITION_KINDS.AUTOMATIC,
        rules: [],
        actionIds: [],
        priority: 1,
        enabled: true,
      },
    ],
    actions: [
      {
        id: actionId,
        actionCode: "NOTIFY",
        actionName: "Notify",
        actionKind: EWE_ACTION_KINDS.NOTIFICATION,
        enabled: true,
      },
    ],
    triggers: [
      {
        id: triggerId,
        triggerCode: "APPROVAL_SIGNAL",
        triggerKind: "manual",
        eventId,
        enabled: true,
      },
    ],
    events: [
      {
        id: eventId,
        eventCode: "APPROVED",
        eventName: "Approved",
        enabled: true,
      },
    ],
    variables: [
      {
        id: crypto.randomUUID(),
        variableCode: "priority",
        variableName: "Priority",
        dataType: "string",
        required: false,
      },
    ],
    assignments: [
      {
        id: assignmentId,
        assignmentCode: "REVIEWER",
        label: "Reviewer",
        strategy: "role_based",
        participantIds: [participantId],
        queueId,
        roleRef: "reviewer",
        enabled: true,
      },
    ],
    queues: [
      {
        id: queueId,
        queueCode: "REVIEW_QUEUE",
        queueName: "Review Queue",
        description: "Pending reviews",
        enabled: true,
      },
    ],
    participants: [
      {
        id: participantId,
        participantRef: "role:reviewer",
        participantType: "role",
        enabled: true,
      },
    ],
    slas: [
      {
        id: slaId,
        slaCode: "REVIEW_SLA",
        label: "Review SLA",
        targetDurationMs: 86400000,
        warningThresholdPercent: 80,
        breachAction: "escalate",
        escalationId,
        enabled: true,
      },
    ],
    escalations: [
      {
        id: escalationId,
        escalationCode: "REVIEW_ESCALATION",
        label: "Review Escalation",
        triggerAfterMs: 86400000,
        escalateToRef: "role:manager",
        enabled: true,
      },
    ],
    startStateId: startId,
    terminalStateIds: [terminalId],
    createdBy: "system",
    createdOn: now,
    modifiedBy: "system",
    modifiedOn: now,
  };
}

export function runEweFoundationValidation(): { passed: boolean; details: Record<string, unknown> } {
  resetEweComposition();

  const definition = registerEweWorkflowDefinition({
    workflowCode: "GENERIC_PROCESS",
    workflowName: "Generic Process",
    description: "Business-agnostic sample workflow",
    moduleRef: "platform",
    categoryRef: "operations",
    createdBy: "system",
  });

  const version = createEweWorkflowVersion(buildSampleVersion(definition.id, definition.workflowCode));
  const graphResult = validateEweWorkflowGraph(version);

  transitionEweVersionLifecycle({ versionId: version.id, action: "validate", actorId: "system" });
  transitionEweVersionLifecycle({ versionId: version.id, action: "approve", actorId: "system" });
  transitionEweVersionLifecycle({ versionId: version.id, action: "publish", actorId: "system" });
  transitionEweDefinitionLifecycle({ definitionId: definition.id, action: "validate", actorId: "system" });
  transitionEweDefinitionLifecycle({ definitionId: definition.id, action: "approve", actorId: "system" });
  transitionEweDefinitionLifecycle({ definitionId: definition.id, action: "publish", actorId: "system" });

  const instance = createEweWorkflowInstance({
    definitionId: definition.id,
    versionId: version.id,
    workflowCode: definition.workflowCode,
    createdBy: "system",
    initialVariables: { priority: "high" },
  });

  transitionEweInstanceLifecycle({ instanceId: instance.id, action: "start", actorId: "system" });

  const publishedVersion = version;
  const available = getEweAvailableTransitions(publishedVersion, instance.currentStateId);
  const submitTransition = available[0];

  let current = executeEweTransition({
    instanceId: instance.id,
    transitionId: submitTransition.id,
    actorId: "system",
  })!;

  suspendEweWorkflowInstance(current.id, "system");
  current = resumeEweWorkflowInstance(current.id, "system")!;

  const approveTransition = getEweAvailableTransitions(publishedVersion, current.currentStateId)[0];
  current = executeEweTransition({
    instanceId: instance.id,
    transitionId: approveTransition.id,
    actorId: "system",
  })!;

  const completeTransition = getEweAvailableTransitions(publishedVersion, current.currentStateId)[0];
  current = executeEweTransition({
    instanceId: instance.id,
    transitionId: completeTransition.id,
    actorId: "system",
  })!;

  const snap = getEweRegistrySnapshot();

  let rejectionChecks = 0;
  try {
    registerEweWorkflowDefinition({
      workflowCode: "GENERIC_PROCESS",
      workflowName: "Duplicate",
      description: "",
      moduleRef: "platform",
      categoryRef: "operations",
      createdBy: "system",
    });
  } catch {
    rejectionChecks += 1;
  }

  try {
    const badVersion = {
      ...version,
      id: crypto.randomUUID(),
      startStateId: "nonexistent",
      terminalStateIds: [],
    };
    if (!validateEweWorkflowGraph(badVersion).valid) rejectionChecks += 1;
  } catch {
    rejectionChecks += 1;
  }

  try {
    transitionEweInstanceLifecycle({ instanceId: instance.id, action: "start", actorId: "system" });
  } catch {
    rejectionChecks += 1;
  }

  const passed =
    graphResult.valid &&
    snap.definitions.length === 1 &&
    snap.versions.length === 1 &&
    snap.instances.length === 1 &&
    snap.auditReferences.length >= 5 &&
    current.lifecycleStatus === EWE_INSTANCE_LIFECYCLE_STATUS.COMPLETED &&
    rejectionChecks === 3;

  return {
    passed,
    details: {
      workflowCode: definition.workflowCode,
      graphValid: graphResult.valid,
      definitions: snap.definitions.length,
      versions: snap.versions.length,
      instances: snap.instances.length,
      auditReferences: snap.auditReferences.length,
      finalInstanceStatus: current.lifecycleStatus,
      rejectionChecks,
    },
  };
}
