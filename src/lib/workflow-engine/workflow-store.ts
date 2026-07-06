import { DEFAULT_WORKFLOW_DEFINITIONS } from "@/data/catalyst-one/workflow-engine/workflow-definitions-seed";
import { DEFAULT_WORKFLOW_AUDIT_TRAIL } from "@/data/catalyst-one/workflow-engine/workflow-audit-seed";
import {
  DEFAULT_ASSIGNMENT_STRATEGIES,
  DEFAULT_ESCALATION_DEFINITIONS,
  DEFAULT_WORKFLOW_EVENT_DEFINITIONS,
  DEFAULT_WORKFLOW_SLA_DEFINITIONS,
} from "@/data/catalyst-one/workflow-engine/workflow-masters-seed";
import {
  DEFAULT_STAGE_LIBRARY,
  DEFAULT_SUB_STAGE_LIBRARY,
} from "@/data/catalyst-one/workflow-engine/stage-library-seed";
import {
  canTransitionWorkflowStatus,
  formatWorkflowVersion,
  isWorkflowActive,
} from "@/constants/workflow-engine";
import type {
  AssignmentStrategy,
  EscalationDefinition,
  StageLibraryEntry,
  SubStageLibraryEntry,
  WorkflowAuditEntry,
  WorkflowDefinition,
  WorkflowEngineDashboardMetrics,
  WorkflowEventDefinition,
  WorkflowLifecycleStatus,
  WorkflowRegistryEntry,
  WorkflowSlaDefinition,
  WorkflowTransitionRule,
  WorkflowValidationWarning,
} from "@/types/workflow-engine";

let definitionsOverride: WorkflowDefinition[] | null = null;
let stagesOverride: StageLibraryEntry[] | null = null;
let subStagesOverride: SubStageLibraryEntry[] | null = null;
let eventsOverride: WorkflowEventDefinition[] | null = null;
let slaOverride: WorkflowSlaDefinition[] | null = null;
let escalationOverride: EscalationDefinition[] | null = null;
let assignmentOverride: AssignmentStrategy[] | null = null;
let auditOverride: WorkflowAuditEntry[] | null = null;

export function resetWorkflowEngineStore(): void {
  definitionsOverride = null;
  stagesOverride = null;
  subStagesOverride = null;
  eventsOverride = null;
  slaOverride = null;
  escalationOverride = null;
  assignmentOverride = null;
  auditOverride = null;
}

export function getAllWorkflowDefinitions(): WorkflowDefinition[] {
  return definitionsOverride ?? DEFAULT_WORKFLOW_DEFINITIONS;
}

export function getLatestWorkflowDefinitions(): WorkflowDefinition[] {
  const byWorkflow = new Map<string, WorkflowDefinition>();
  for (const def of getAllWorkflowDefinitions()) {
    const existing = byWorkflow.get(def.workflowId);
    if (
      !existing ||
      def.majorVersion > existing.majorVersion ||
      (def.majorVersion === existing.majorVersion && def.minorVersion > existing.minorVersion)
    ) {
      byWorkflow.set(def.workflowId, def);
    }
  }
  return Array.from(byWorkflow.values()).sort((a, b) => a.workflowName.localeCompare(b.workflowName));
}

export function getWorkflowVersions(workflowId: string): WorkflowDefinition[] {
  return getAllWorkflowDefinitions()
    .filter((d) => d.workflowId === workflowId)
    .sort((a, b) => {
      if (b.majorVersion !== a.majorVersion) return b.majorVersion - a.majorVersion;
      return b.minorVersion - a.minorVersion;
    });
}

export function getWorkflowById(workflowId: string): WorkflowDefinition | undefined {
  return getLatestWorkflowDefinitions().find((d) => d.workflowId === workflowId);
}

export function getWorkflowVersionById(versionId: string): WorkflowDefinition | undefined {
  return getAllWorkflowDefinitions().find((d) => d.id === versionId);
}

export function getStageLibrary(): StageLibraryEntry[] {
  return (stagesOverride ?? DEFAULT_STAGE_LIBRARY).filter((s) => s.enabled).sort((a, b) => a.sortOrder - b.sortOrder);
}

export function getSubStageLibrary(): SubStageLibraryEntry[] {
  return (subStagesOverride ?? DEFAULT_SUB_STAGE_LIBRARY).filter((s) => s.enabled).sort((a, b) => a.sortOrder - b.sortOrder);
}

export function getSubStagesForStage(stageId: string): SubStageLibraryEntry[] {
  return getSubStageLibrary().filter((s) => s.parentStageId === stageId);
}

export function getWorkflowEvents(): WorkflowEventDefinition[] {
  return (eventsOverride ?? DEFAULT_WORKFLOW_EVENT_DEFINITIONS).filter((e) => e.enabled);
}

export function getWorkflowSlaDefinitions(): WorkflowSlaDefinition[] {
  return slaOverride ?? DEFAULT_WORKFLOW_SLA_DEFINITIONS;
}

export function getEscalationDefinitions(): EscalationDefinition[] {
  return escalationOverride ?? DEFAULT_ESCALATION_DEFINITIONS;
}

export function getAssignmentStrategies(): AssignmentStrategy[] {
  return (assignmentOverride ?? DEFAULT_ASSIGNMENT_STRATEGIES).filter((a) => a.enabled);
}

export function getWorkflowAuditTrail(): WorkflowAuditEntry[] {
  return auditOverride ?? DEFAULT_WORKFLOW_AUDIT_TRAIL;
}

export function appendWorkflowAuditEntry(
  entry: Omit<WorkflowAuditEntry, "id" | "timestamp"> & { timestamp?: string },
): WorkflowAuditEntry {
  const record: WorkflowAuditEntry = {
    ...entry,
    id: `wfa_${Date.now()}`,
    timestamp: entry.timestamp ?? new Date().toISOString(),
  };
  const current = getWorkflowAuditTrail();
  auditOverride = [record, ...current];
  return record;
}

export function getAuditTrailForWorkflow(workflowId: string): WorkflowAuditEntry[] {
  return getWorkflowAuditTrail().filter((e) => e.workflowId === workflowId);
}

export function getWorkflowRegistry(): WorkflowRegistryEntry[] {
  return getLatestWorkflowDefinitions().map((def) => ({
    workflowId: def.workflowId,
    workflowCode: def.workflowCode,
    workflowName: def.workflowName,
    module: def.module,
    category: def.category,
    latestVersionLabel: formatWorkflowVersion(def.majorVersion, def.minorVersion),
    status: def.status,
    stageCount: def.stageIds.length,
    transitionCount: def.transitions.length,
    lastModified: def.lastModified,
  }));
}

export function searchWorkflowRegistry(query: string): WorkflowRegistryEntry[] {
  const q = query.trim().toLowerCase();
  if (!q) return getWorkflowRegistry();
  return getWorkflowRegistry().filter(
    (r) =>
      r.workflowCode.toLowerCase().includes(q) ||
      r.workflowName.toLowerCase().includes(q) ||
      r.module.toLowerCase().includes(q) ||
      r.category.toLowerCase().includes(q) ||
      r.workflowId.toLowerCase().includes(q),
  );
}

export function getWorkflowEngineDashboardMetrics(): WorkflowEngineDashboardMetrics {
  const latest = getLatestWorkflowDefinitions();
  const allDefs = getAllWorkflowDefinitions();
  const transitionCount = allDefs.reduce((sum, d) => sum + d.transitions.length, 0);

  return {
    totalWorkflows: latest.length,
    publishedWorkflows: latest.filter((d) => isWorkflowActive(d.status)).length,
    draftWorkflows: latest.filter((d) => d.status === "draft").length,
    stageLibraryCount: getStageLibrary().length,
    subStageLibraryCount: getSubStageLibrary().length,
    transitionRulesCount: transitionCount,
    eventDefinitionsCount: getWorkflowEvents().length,
    slaDefinitionsCount: getWorkflowSlaDefinitions().length,
    escalationDefinitionsCount: getEscalationDefinitions().length,
  };
}

/** Design-time transition validation — not runtime execution. */
export function validateWorkflowDefinition(def: WorkflowDefinition): WorkflowValidationWarning[] {
  const warnings: WorkflowValidationWarning[] = [];
  const stageIds = new Set(getStageLibrary().map((s) => s.id));
  const subStageIds = new Set(getSubStageLibrary().map((s) => s.id));
  const seenTransitions = new Set<string>();

  for (const stageId of def.stageIds) {
    if (!stageIds.has(stageId)) {
      warnings.push({
        code: "invalid_stage_ref",
        severity: "error",
        message: `Stage ${stageId} is not in the stage library.`,
      });
    }
  }

  for (const subStageId of def.subStageIds) {
    if (!subStageIds.has(subStageId)) {
      warnings.push({
        code: "invalid_substage_ref",
        severity: "error",
        message: `Sub-stage ${subStageId} is not in the sub-stage library.`,
      });
    }
  }

  for (const tr of def.transitions) {
    validateTransition(tr, stageIds, subStageIds, warnings, seenTransitions);
  }

  if (def.transitions.length === 0 && def.status !== "draft") {
    warnings.push({
      code: "no_transitions",
      severity: "warning",
      message: "Workflow has no transition rules defined.",
    });
  }

  if (!def.assignmentStrategyId) {
    warnings.push({
      code: "no_assignment",
      severity: "warning",
      message: "No assignment strategy configured.",
    });
  }

  return warnings;
}

function validateTransition(
  tr: WorkflowTransitionRule,
  stageIds: Set<string>,
  subStageIds: Set<string>,
  warnings: WorkflowValidationWarning[],
  seen: Set<string>,
): void {
  const key = `${tr.fromStageId}->${tr.toStageId}:${tr.transitionCode}`;
  if (seen.has(key)) {
    warnings.push({
      code: "duplicate_transition",
      severity: "error",
      message: `Duplicate transition: ${tr.transitionCode}`,
    });
  }
  seen.add(key);

  if (!stageIds.has(tr.fromStageId) || !stageIds.has(tr.toStageId)) {
    warnings.push({
      code: "invalid_transition_stage",
      severity: "error",
      message: `Transition ${tr.transitionCode} references unknown stage.`,
    });
  }
  if (tr.fromSubStageId && !subStageIds.has(tr.fromSubStageId)) {
    warnings.push({
      code: "invalid_transition_substage",
      severity: "warning",
      message: `Transition ${tr.transitionCode} references unknown from sub-stage.`,
    });
  }
  if (tr.toSubStageId && !subStageIds.has(tr.toSubStageId)) {
    warnings.push({
      code: "invalid_transition_substage",
      severity: "warning",
      message: `Transition ${tr.transitionCode} references unknown to sub-stage.`,
    });
  }
}

export function transitionWorkflowStatus(
  workflowId: string,
  to: WorkflowLifecycleStatus,
  actor: string,
): WorkflowDefinition | undefined {
  const all = [...getAllWorkflowDefinitions()];
  const idx = all.findIndex((d) => d.workflowId === workflowId && d.status !== "archived");
  if (idx === -1) return undefined;

  const current = all[idx];
  if (!canTransitionWorkflowStatus(current.status, to)) return undefined;

  const now = new Date().toISOString();
  const updated: WorkflowDefinition = {
    ...current,
    status: to,
    lastModified: now,
    ...(to === "approved" ? { approvedBy: actor } : {}),
    ...(to === "published" ? { publishedBy: actor, publishedDate: now } : {}),
  };
  all[idx] = updated;
  definitionsOverride = all;

  appendWorkflowAuditEntry({
    workflowId: current.workflowId,
    workflowName: current.workflowName,
    versionLabel: formatWorkflowVersion(current.majorVersion, current.minorVersion),
    actor,
    action: `${to.charAt(0).toUpperCase() + to.slice(1)} workflow definition`,
    field: "status",
    oldValue: current.status,
    newValue: to,
  });

  notifyAtlasWorkflowRegistration(updated);
  return updated;
}

export interface WorkflowDraftInput {
  workflowId?: string;
  workflowCode: string;
  workflowName: string;
  description: string;
  module: string;
  category: string;
  stageIds: string[];
  subStageIds?: string[];
  transitions: WorkflowTransitionRule[];
  eventIds?: string[];
  slaId?: string | null;
  escalationId?: string | null;
  assignmentStrategyId: string;
  entryConditions?: WorkflowDefinition["entryConditions"];
  exitConditions?: WorkflowDefinition["exitConditions"];
  createdBy: string;
}

export function saveWorkflowDraft(draft: WorkflowDraftInput): WorkflowDefinition {
  const now = new Date().toISOString();
  const all = [...getAllWorkflowDefinitions()];
  const workflowId = draft.workflowId ?? `wf_${Date.now()}`;
  const versions = getWorkflowVersions(workflowId);
  const latest = versions[0];
  const major = latest?.status === "published" ? latest.majorVersion + 1 : (latest?.majorVersion ?? 1);
  const minor = latest?.status === "published" ? 0 : (latest?.minorVersion ?? 0) + (latest ? 1 : 0);

  const record: WorkflowDefinition = {
    id: `wf_ver_${Date.now()}`,
    workflowId,
    workflowCode: draft.workflowCode,
    workflowName: draft.workflowName,
    description: draft.description,
    module: draft.module,
    category: draft.category,
    majorVersion: major,
    minorVersion: minor,
    status: "draft",
    stageIds: draft.stageIds,
    subStageIds: draft.subStageIds ?? [],
    transitions: draft.transitions,
    eventIds: draft.eventIds ?? [],
    slaId: draft.slaId ?? null,
    escalationId: draft.escalationId ?? null,
    assignmentStrategyId: draft.assignmentStrategyId,
    entryConditions: draft.entryConditions ?? [],
    exitConditions: draft.exitConditions ?? [],
    createdBy: draft.createdBy,
    lastModified: now,
  };

  definitionsOverride = [...all, record];

  appendWorkflowAuditEntry({
    workflowId,
    workflowName: record.workflowName,
    versionLabel: formatWorkflowVersion(major, minor),
    actor: draft.createdBy,
    action: "Created workflow definition",
    field: "status",
    oldValue: "",
    newValue: "draft",
  });

  notifyAtlasWorkflowRegistration(record);
  return record;
}

function notifyAtlasWorkflowRegistration(def: WorkflowDefinition): void {
  void import("@/lib/atlas/auto-registration")
    .then((m) => m.registerAtlasFromWorkflow?.(def))
    .catch(() => undefined);
}
