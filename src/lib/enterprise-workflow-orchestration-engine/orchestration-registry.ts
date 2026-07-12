/**
 * EWOE definition + instance orchestration registry.
 */

import {
  buildDefaultHomeLoanWorkflowDefinition,
  DEFAULT_EWOE_HOME_LOAN_SCOPE,
  EWOE_EVENT_TYPES,
} from "@/constants/enterprise-workflow-orchestration-engine";
import { transitionEoleOpportunityLifecycle } from "@/lib/enterprise-opportunity-lifecycle-engine";
import type {
  EwoeEventType,
  EwoeWorkflowDefinition,
  EwoeWorkflowEvent,
  EwoeWorkflowInstance,
  EwoeWorkflowScope,
  EwoeWorkflowTransition,
} from "@/types/enterprise-workflow-orchestration-engine";
import { recordEwoeAudit } from "./audit-integration";
import { getEwoePorts } from "./composition";
import { getEwoeOrchestrationConfig } from "./config";
import { publishEwoeTransitionToDialogue } from "./dialogue-integration";
import { executeEwoeEngineTriggers } from "./trigger-engine";

function scopeScore(def: EwoeWorkflowDefinition, scope: EwoeWorkflowScope): number {
  let score = 0;
  if (def.scope.productRef === scope.productRef) score += 4;
  if (def.scope.customerType === scope.customerType) score += 2;
  if (def.scope.employmentType === scope.employmentType) score += 2;
  if (def.scope.constitution === scope.constitution) score += 1;
  if (def.scope.opportunityType === scope.opportunityType) score += 2;
  if (scope.lenderRef && def.scope.lenderRef === scope.lenderRef) score += 3;
  return score;
}

export function initializeEwoeDefaultDefinitions(actorId = "system"): EwoeWorkflowDefinition {
  const existing = getEwoePorts().definitions.findByCode("EWOE-HL-SAL-001");
  if (existing) return existing;

  const now = new Date().toISOString();
  const draft = buildDefaultHomeLoanWorkflowDefinition(actorId);
  const definition: EwoeWorkflowDefinition = {
    ...draft,
    id: crypto.randomUUID(),
    createdOn: now,
    modifiedOn: now,
  };
  getEwoePorts().definitions.save(definition);
  recordEwoeAudit({
    entityId: definition.id,
    entityType: "definition",
    action: "created",
    actorId,
    remarks: `EWOE definition ${definition.definitionCode} v${definition.version}`,
  });
  return definition;
}

export function registerEwoeWorkflowDefinition(
  input: Omit<EwoeWorkflowDefinition, "id" | "createdOn" | "modifiedOn"> & {
    createdOn?: string;
    modifiedOn?: string;
  },
): EwoeWorkflowDefinition {
  const now = new Date().toISOString();
  const definition: EwoeWorkflowDefinition = {
    ...input,
    id: crypto.randomUUID(),
    createdOn: input.createdOn ?? now,
    modifiedOn: input.modifiedOn ?? now,
  };
  getEwoePorts().definitions.save(definition);
  recordEwoeAudit({
    entityId: definition.id,
    entityType: "definition",
    action: "created",
    actorId: input.createdBy,
    remarks: `EWOE definition ${definition.definitionCode} v${definition.version}`,
  });
  return definition;
}

export function listEwoeWorkflowDefinitions(): EwoeWorkflowDefinition[] {
  return getEwoePorts().definitions.list().filter((d) => d.enabled);
}

export function resolveEwoeWorkflowDefinition(
  scope: EwoeWorkflowScope = DEFAULT_EWOE_HOME_LOAN_SCOPE,
): EwoeWorkflowDefinition {
  initializeEwoeDefaultDefinitions();
  const enabled = listEwoeWorkflowDefinitions();
  if (enabled.length === 0) {
    throw new Error("No EWOE workflow definitions available");
  }
  return [...enabled].sort((a, b) => scopeScore(b, scope) - scopeScore(a, scope))[0]!;
}

export function computeEwoeProgressRatio(
  definition: EwoeWorkflowDefinition,
  currentStageCode: string,
): number {
  const ordered = [...definition.stages].sort((a, b) => a.sortOrder - b.sortOrder);
  if (ordered.length === 0) return 0;
  const idx = ordered.findIndex((s) => s.stageCode === currentStageCode);
  if (idx < 0) return 0.15;
  return Math.max(0.1, Math.min(1, (idx + 1) / ordered.length));
}

export function recordEwoeWorkflowEvent(input: {
  opportunityId: string;
  instanceId?: string;
  eventType: EwoeEventType;
  title: string;
  description: string;
  actorId: string;
  payload?: Record<string, unknown>;
}): EwoeWorkflowEvent {
  const event: EwoeWorkflowEvent = {
    id: crypto.randomUUID(),
    opportunityId: input.opportunityId,
    instanceId: input.instanceId,
    eventType: input.eventType,
    title: input.title,
    description: input.description,
    actorId: input.actorId,
    payload: input.payload,
    occurredOn: new Date().toISOString(),
  };
  getEwoePorts().events.save(event);
  recordEwoeAudit({
    entityId: event.id,
    entityType: "event",
    action: "created",
    actorId: input.actorId,
    remarks: `EWOE event ${event.eventType}: ${event.title}`,
  });
  return event;
}

export function startEwoeWorkflowInstance(input: {
  opportunityId: string;
  scope?: EwoeWorkflowScope;
  stageCode?: string;
  actorId: string;
}): EwoeWorkflowInstance {
  const existing = getEwoePorts().instances.findByOpportunity(input.opportunityId);
  if (existing && existing.status === "active") return existing;

  const definition = resolveEwoeWorkflowDefinition(input.scope ?? DEFAULT_EWOE_HOME_LOAN_SCOPE);
  const firstStage = [...definition.stages].sort((a, b) => a.sortOrder - b.sortOrder)[0];
  const stageCode = input.stageCode ?? firstStage?.stageCode ?? "intake";
  const firstSub = firstStage?.subStages[0]?.subStageCode;
  const now = new Date().toISOString();

  const instance: EwoeWorkflowInstance = {
    id: crypto.randomUUID(),
    opportunityId: input.opportunityId,
    definitionId: definition.id,
    definitionCode: definition.definitionCode,
    definitionVersion: definition.version,
    status: "active",
    currentStageCode: stageCode,
    currentSubStageCode: firstSub,
    progressRatio: computeEwoeProgressRatio(definition, stageCode),
    startedBy: input.actorId,
    startedOn: now,
    modifiedBy: input.actorId,
    modifiedOn: now,
  };

  getEwoePorts().instances.save(instance);
  recordEwoeAudit({
    entityId: instance.id,
    entityType: "instance",
    action: "created",
    actorId: input.actorId,
    remarks: `EWOE instance started for ${input.opportunityId}`,
  });

  recordEwoeWorkflowEvent({
    opportunityId: input.opportunityId,
    instanceId: instance.id,
    eventType: EWOE_EVENT_TYPES.WORKFLOW_STARTED,
    title: "Workflow started",
    description: `${definition.definitionCode} v${definition.version} · stage ${stageCode}`,
    actorId: input.actorId,
  });

  const stageDef = definition.stages.find((s) => s.stageCode === stageCode);
  const config = getEwoeOrchestrationConfig();
  if (config.autoExecuteTriggers && stageDef) {
    const results = executeEwoeEngineTriggers(stageDef.triggers, {
      opportunityId: input.opportunityId,
      actorId: input.actorId,
    });
    for (const r of results) {
      recordEwoeWorkflowEvent({
        opportunityId: input.opportunityId,
        instanceId: instance.id,
        eventType: EWOE_EVENT_TYPES.TRIGGER_EXECUTED,
        title: `Trigger · ${r.target}`,
        description: r.detail,
        actorId: input.actorId,
        payload: { ok: r.ok, action: r.action },
      });
    }
  }

  return instance;
}

export function advanceEwoeWorkflowStage(input: {
  opportunityId: string;
  toStageCode: string;
  toSubStageCode?: string;
  reason: string;
  actorId: string;
  syncEole?: boolean;
}): { instance: EwoeWorkflowInstance; transition: EwoeWorkflowTransition } {
  let instance = getEwoePorts().instances.findByOpportunity(input.opportunityId);
  if (!instance) {
    instance = startEwoeWorkflowInstance({
      opportunityId: input.opportunityId,
      stageCode: input.toStageCode,
      actorId: input.actorId,
    });
  }

  const definition = getEwoePorts().definitions.findById(instance.definitionId);
  if (!definition) throw new Error("EWOE definition missing for instance");

  const previousStageCode = instance.currentStageCode;
  const previousSubStageCode = instance.currentSubStageCode;
  const now = new Date().toISOString();

  const stageDef = definition.stages.find((s) => s.stageCode === input.toStageCode);
  const nextSub =
    input.toSubStageCode ??
    stageDef?.subStages.sort((a, b) => a.sortOrder - b.sortOrder)[0]?.subStageCode;

  const updated: EwoeWorkflowInstance = {
    ...instance,
    currentStageCode: input.toStageCode,
    currentSubStageCode: nextSub,
    progressRatio: computeEwoeProgressRatio(definition, input.toStageCode),
    status: input.toStageCode === "closed" ? "completed" : "active",
    completedOn: input.toStageCode === "closed" ? now : instance.completedOn,
    modifiedBy: input.actorId,
    modifiedOn: now,
  };
  getEwoePorts().instances.save(updated);

  const transition: EwoeWorkflowTransition = {
    id: crypto.randomUUID(),
    instanceId: updated.id,
    opportunityId: input.opportunityId,
    previousStageCode,
    currentStageCode: input.toStageCode,
    previousSubStageCode,
    currentSubStageCode: nextSub,
    reason: input.reason,
    actorId: input.actorId,
    definitionVersion: definition.version,
    occurredOn: now,
  };
  getEwoePorts().transitions.save(transition);
  recordEwoeAudit({
    entityId: transition.id,
    entityType: "transition",
    action: "lifecycle_changed",
    actorId: input.actorId,
    remarks: `EWOE ${previousStageCode} → ${input.toStageCode}: ${input.reason}`,
  });

  publishEwoeTransitionToDialogue(transition);

  recordEwoeWorkflowEvent({
    opportunityId: input.opportunityId,
    instanceId: updated.id,
    eventType: EWOE_EVENT_TYPES.STAGE_CHANGED,
    title: "Stage changed",
    description: `${previousStageCode} → ${input.toStageCode}`,
    actorId: input.actorId,
    payload: { reason: input.reason },
  });

  const config = getEwoeOrchestrationConfig();
  if (config.autoExecuteTriggers && stageDef) {
    const results = executeEwoeEngineTriggers(stageDef.triggers, {
      opportunityId: input.opportunityId,
      actorId: input.actorId,
    });
    for (const r of results) {
      recordEwoeWorkflowEvent({
        opportunityId: input.opportunityId,
        instanceId: updated.id,
        eventType: EWOE_EVENT_TYPES.TRIGGER_EXECUTED,
        title: `Trigger · ${r.target}`,
        description: r.detail,
        actorId: input.actorId,
        payload: { ok: r.ok, action: r.action },
      });
    }
  }

  if (input.syncEole !== false) {
    try {
      const action =
        input.toStageCode === "lender_review"
          ? "submit_to_lender"
          : input.toStageCode === "approved"
            ? "approve"
            : input.toStageCode === "document_collection"
              ? "submit_documents"
              : input.toStageCode === "processing"
                ? "begin_processing"
                : undefined;
      if (action) {
        transitionEoleOpportunityLifecycle({
          opportunityId: input.opportunityId,
          action,
          actorId: input.actorId,
          stageCode: input.toStageCode,
        });
      }
    } catch {
      // EOLE sync is best-effort for pilot; orchestration remains valid without it.
    }
  }

  return { instance: updated, transition };
}

export function advanceEwoeWorkflowSubStage(input: {
  opportunityId: string;
  toSubStageCode: string;
  reason: string;
  actorId: string;
}): { instance: EwoeWorkflowInstance; transition: EwoeWorkflowTransition } {
  const instance = getEwoePorts().instances.findByOpportunity(input.opportunityId);
  if (!instance) throw new Error("No EWOE instance for opportunity");

  const definition = getEwoePorts().definitions.findById(instance.definitionId);
  if (!definition) throw new Error("EWOE definition missing");

  const previousSubStageCode = instance.currentSubStageCode;
  const now = new Date().toISOString();
  const updated: EwoeWorkflowInstance = {
    ...instance,
    currentSubStageCode: input.toSubStageCode,
    modifiedBy: input.actorId,
    modifiedOn: now,
  };
  getEwoePorts().instances.save(updated);

  const transition: EwoeWorkflowTransition = {
    id: crypto.randomUUID(),
    instanceId: updated.id,
    opportunityId: input.opportunityId,
    previousStageCode: instance.currentStageCode,
    currentStageCode: instance.currentStageCode,
    previousSubStageCode,
    currentSubStageCode: input.toSubStageCode,
    reason: input.reason,
    actorId: input.actorId,
    definitionVersion: definition.version,
    occurredOn: now,
  };
  getEwoePorts().transitions.save(transition);
  publishEwoeTransitionToDialogue(transition);

  recordEwoeWorkflowEvent({
    opportunityId: input.opportunityId,
    instanceId: updated.id,
    eventType: EWOE_EVENT_TYPES.SUB_STAGE_CHANGED,
    title: "Sub-stage changed",
    description: `${previousSubStageCode ?? "—"} → ${input.toSubStageCode}`,
    actorId: input.actorId,
    payload: { reason: input.reason },
  });

  return { instance: updated, transition };
}

export function getEwoeInstanceForOpportunity(
  opportunityId: string,
): EwoeWorkflowInstance | undefined {
  return getEwoePorts().instances.findByOpportunity(opportunityId);
}

export function listEwoeTransitions(opportunityId: string): EwoeWorkflowTransition[] {
  return getEwoePorts()
    .transitions.listByOpportunity(opportunityId)
    .sort((a, b) => new Date(b.occurredOn).getTime() - new Date(a.occurredOn).getTime());
}

export function listEwoeEvents(opportunityId: string): EwoeWorkflowEvent[] {
  return getEwoePorts()
    .events.listByOpportunity(opportunityId)
    .sort((a, b) => new Date(b.occurredOn).getTime() - new Date(a.occurredOn).getTime());
}

/** Intelligence contribution — workflow progress for Pulse/Compass/Health (no duplicate calc). */
export function getEwoeIntelligenceProgress(opportunityId: string): number | undefined {
  const config = getEwoeOrchestrationConfig();
  if (!config.contributeToIntelligence) return undefined;
  const instance = getEwoePorts().instances.findByOpportunity(opportunityId);
  if (!instance) return undefined;
  return Math.max(0, Math.min(1, instance.progressRatio * config.intelligenceBlendWeight));
}
