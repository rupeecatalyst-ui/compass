/**
 * ETE task registry and escalation.
 */

import { EDC_EVENT_TYPES } from "@/constants/enterprise-dialogue-center";
import { appendEdcTimelineEntry } from "@/lib/enterprise-dialogue-center";
import { shouldSuppressAutomation } from "@/lib/enterprise-platform-modes";
import { ETE_PREDEFINED_TO_WORK_TYPE } from "@/constants/enterprise-task-engine";
import type { EteTask } from "@/types/enterprise-task-engine";
import { recordEteAudit } from "./audit-integration";
import { getEtePorts } from "./composition";
import { deriveEteTaskColour, validateEteTask } from "./validation-engine";
import {
  buildNextOccurrenceDraft,
  coerceEteRecurrence,
  computeNextOccurrenceDueOn,
  isRecurringTask,
  occurrenceDueKey,
  resolveReminderAt,
  shouldSpawnNextOccurrence,
  validateEteRecurrenceRule,
} from "./recurrence-engine";
import {
  pushTaskLifecycleNotification,
  taskTitle,
} from "./task-workspace";

function tryAppendEdcTaskEntry(input: {
  taskId: string;
  title: string;
  description: string;
  actorId: string;
  opportunityRef?: string;
}): void {
  try {
    appendEdcTimelineEntry({
      contextRef: {
        type: input.opportunityRef ? "opportunity" : "customer",
        id: input.opportunityRef ?? input.taskId,
      },
      eventType: EDC_EVENT_TYPES.TASK,
      title: input.title,
      description: input.description,
      actorId: input.actorId,
      expandablePayload: { taskId: input.taskId },
    });
  } catch {
    // Timeline append is best-effort; do not fail task operations.
  }
}

export function registerEteTask(
  input: Omit<
    EteTask,
    "id" | "enabled" | "createdOn" | "modifiedBy" | "modifiedOn" | "coOwnerRefs" | "escalated" | "colourStatus"
  > & {
    coOwnerRefs?: string[];
  },
): EteTask {
  if (shouldSuppressAutomation("tasks")) {
    throw new Error("ETE task registration suppressed by migration mode.");
  }

  const withContext = {
    ...input,
    workType: input.workType ?? ETE_PREDEFINED_TO_WORK_TYPE[input.predefinedDescription],
    status: input.status ?? ("open" as const),
    entityKind:
      input.entityKind ??
      (input.dealId
        ? ("EnterpriseDeal" as const)
        : input.opportunityRef
          ? ("Opportunity" as const)
          : input.contactId
            ? ("Customer" as const)
            : input.lenderId
              ? ("Lender" as const)
              : input.documentId
                ? ("Document" as const)
                : undefined),
    entityId:
      input.entityId ??
      input.dealId ??
      input.opportunityRef ??
      input.contactId ??
      input.lenderId ??
      input.documentId ??
      input.fileId,
  };

  const validation = validateEteTask(withContext);
  if (!validation.valid) throw new Error(validation.issues.map((i) => i.message).join("; "));

  const scheduleKind = withContext.scheduleKind ?? "one_time";
  let recurrence = coerceEteRecurrence(withContext.recurrence) ?? undefined;
  if (scheduleKind === "recurring") {
    const recurrenceError = validateEteRecurrenceRule(recurrence, withContext.dueOn);
    if (recurrenceError) throw new Error(recurrenceError);
    if (recurrence && withContext.dueOn) {
      const due = new Date(withContext.dueOn);
      recurrence = {
        ...recurrence,
        dayOfMonth: recurrence.dayOfMonth ?? due.getDate(),
        weekday: recurrence.weekday ?? undefined,
      };
      if (!withContext.reminderAt && recurrence.reminderOffset) {
        withContext.reminderAt = resolveReminderAt(
          withContext.dueOn,
          recurrence.reminderOffset,
        );
      }
    }
  } else {
    recurrence = undefined;
  }

  const now = new Date().toISOString();
  const id = crypto.randomUUID();
  const isSeriesStart = scheduleKind === "recurring" && !withContext.seriesId;
  const task: EteTask = {
    ...withContext,
    scheduleKind,
    recurrence,
    seriesId: scheduleKind === "recurring" ? withContext.seriesId ?? id : undefined,
    seriesRootTaskId:
      scheduleKind === "recurring"
        ? withContext.seriesRootTaskId ?? withContext.seriesId ?? id
        : undefined,
    occurrenceNumber:
      scheduleKind === "recurring" ? withContext.occurrenceNumber ?? 1 : undefined,
    seriesStatus: scheduleKind === "recurring" ? withContext.seriesStatus ?? "active" : undefined,
    coOwnerRefs: input.coOwnerRefs ?? [],
    escalated: false,
    colourStatus: deriveEteTaskColour(input.dueOn),
    chanakyaMonitoring: input.chanakyaMonitoring ?? true,
    title: input.title ?? input.predefinedDescription,
    workType: withContext.workType,
    status: withContext.status,
    id,
    enabled: true,
    createdOn: now,
    modifiedBy: input.createdBy,
    modifiedOn: now,
  };

  // Ensure root points at itself when this is the first occurrence.
  if (isSeriesStart) {
    task.seriesId = id;
    task.seriesRootTaskId = id;
    task.occurrenceNumber = 1;
  }

  getEtePorts().tasks.save(task);
  recordEteAudit({
    entityId: task.id,
    entityType: "task",
    action: "created",
    actorId: input.createdBy,
    remarks: task.seriesId
      ? `ETE task ${task.predefinedDescription} · series ${task.seriesId} · occ ${task.occurrenceNumber}`
      : `ETE task ${task.predefinedDescription}`,
  });

  tryAppendEdcTaskEntry({
    taskId: task.id,
    title: `Task registered: ${task.predefinedDescription}`,
    description: task.description ?? task.predefinedDescription,
    actorId: input.createdBy,
    opportunityRef: task.opportunityRef,
  });

  return task;
}

export function listEteTasks(): EteTask[] {
  return getEtePorts().tasks.list().map((task) => ({
    ...task,
    colourStatus: deriveEteTaskColour(task.dueOn),
  }));
}

export function escalateEteTask(taskId: string, actorId: string): EteTask {
  if (shouldSuppressAutomation("escalations")) {
    throw new Error("ETE escalation suppressed by migration mode.");
  }

  const existing = getEtePorts().tasks.findById(taskId);
  if (!existing) throw new Error(`ETE task not found: ${taskId}`);

  const managerRef = existing.reportingManagerRef;
  const coOwners = [...existing.coOwnerRefs];
  if (managerRef && !coOwners.includes(managerRef)) {
    coOwners.push(managerRef);
  }

  const now = new Date().toISOString();
  const updated: EteTask = {
    ...existing,
    coOwnerRefs: coOwners,
    escalated: true,
    escalatedOn: now,
    colourStatus: deriveEteTaskColour(existing.dueOn),
    modifiedBy: actorId,
    modifiedOn: now,
  };

  getEtePorts().tasks.save(updated);
  recordEteAudit({
    entityId: updated.id,
    entityType: "escalation",
    action: "lifecycle_changed",
    actorId,
    remarks: `ETE escalated; coOwner=${managerRef ?? "none"}`,
  });

  tryAppendEdcTaskEntry({
    taskId: updated.id,
    title: "Task escalated",
    description: `Escalated overdue task; reporting manager added as co-owner (${managerRef ?? "n/a"}). No external notification sent.`,
    actorId,
    opportunityRef: updated.opportunityRef,
  });

  return updated;
}

/** Placeholder registry patch — in-memory only; no workflow rules. */
export function patchEteTask(
  taskId: string,
  patch: Partial<
    Pick<
      EteTask,
      | "assigneeRef"
      | "dueOn"
      | "predefinedDescription"
      | "description"
      | "priority"
      | "commitmentLevel"
      | "postponeReason"
      | "postponeComment"
      | "checklist"
      | "comments"
      | "borrowerName"
      | "loanProduct"
      | "lenderName"
      | "department"
      | "grossStage"
      | "category"
      | "title"
      | "workType"
      | "status"
      | "completionNotes"
      | "entityKind"
      | "entityId"
      | "entityLabel"
      | "dealId"
      | "contactId"
      | "lenderId"
      | "documentId"
      | "recurrence"
      | "reminderAt"
      | "scheduleKind"
      | "seriesStatus"
    >
  >,
  actorId: string,
): EteTask {
  const existing = getEtePorts().tasks.findById(taskId);
  if (!existing) throw new Error(`ETE task not found: ${taskId}`);
  const updated: EteTask = {
    ...existing,
    ...patch,
    colourStatus: deriveEteTaskColour(patch.dueOn ?? existing.dueOn),
    modifiedBy: actorId,
    modifiedOn: new Date().toISOString(),
  };
  getEtePorts().tasks.save(updated);
  if (patch.assigneeRef && patch.assigneeRef !== existing.assigneeRef) {
    pushTaskLifecycleNotification({
      kind: "reassigned",
      taskId: updated.id,
      taskName: taskTitle(updated),
      message: `Task reassigned to ${patch.assigneeRef}`,
      assigneeRef: patch.assigneeRef,
    });
  }
  return updated;
}

/** Complete a task — disables monitoring and records completion notes. */
export function completeEteTask(
  taskId: string,
  actorId: string,
  completionNotes?: string,
): EteTask {
  const existing = getEtePorts().tasks.findById(taskId);
  if (!existing) throw new Error(`ETE task not found: ${taskId}`);
  const now = new Date().toISOString();

  let seriesStatus = existing.seriesStatus;
  let spawned: EteTask | null = null;

  if (shouldSpawnNextOccurrence(existing) && existing.dueOn && existing.seriesId) {
    const rule = coerceEteRecurrence(existing.recurrence)!;
    const nextDue = computeNextOccurrenceDueOn(rule, existing.dueOn);
    if (nextDue) {
      const nextOcc = (existing.occurrenceNumber ?? 1) + 1;
      if (rule.end.mode === "after_count" && nextOcc > rule.end.count) {
        seriesStatus = "ended";
      } else {
        const dueKey = occurrenceDueKey(nextDue);
        const alreadyOpen = getEtePorts()
          .tasks.list()
          .some(
            (t) =>
              t.seriesId === existing.seriesId &&
              t.enabled &&
              t.status !== "completed" &&
              t.dueOn &&
              occurrenceDueKey(t.dueOn) === dueKey,
          );
        if (!alreadyOpen) {
          spawned = registerEteTask(buildNextOccurrenceDraft(existing, nextDue, actorId));
        }
      }
    } else {
      seriesStatus = "ended";
    }
  } else if (isRecurringTask(existing) && !shouldSpawnNextOccurrence(existing)) {
    seriesStatus = "ended";
  }

  const updated: EteTask = {
    ...existing,
    enabled: false,
    status: "completed",
    chanakyaMonitoring: false,
    completionNotes: completionNotes ?? existing.completionNotes,
    completedAt: now,
    completedBy: actorId,
    modifiedBy: actorId,
    modifiedOn: now,
    seriesStatus,
  };
  getEtePorts().tasks.save(updated);
  tryAppendEdcTaskEntry({
    taskId,
    title: "Task completed",
    description: `${taskTitle(existing)}${completionNotes ? ` · ${completionNotes}` : ""}${
      spawned ? ` · next occurrence scheduled ${spawned.dueOn?.slice(0, 10) ?? ""}` : ""
    }`,
    actorId,
    opportunityRef: existing.opportunityRef,
  });
  pushTaskLifecycleNotification({
    kind: "completed",
    taskId,
    taskName: taskTitle(existing),
    message: spawned
      ? `Occurrence completed · next due ${spawned.dueOn?.slice(0, 10) ?? ""}`
      : `Task completed${completionNotes ? `: ${completionNotes}` : ""}`,
    assigneeRef: existing.assigneeRef,
  });
  return updated;
}

/** List all occurrences for a recurring series (history + open). */
export function listEteSeriesOccurrences(seriesId: string): EteTask[] {
  return listEteTasks()
    .filter((t) => t.seriesId === seriesId)
    .sort((a, b) => (a.occurrenceNumber ?? 0) - (b.occurrenceNumber ?? 0));
}

/** Cancel remaining open occurrences in a series (does not rewrite history). */
export function cancelEteSeries(seriesId: string, actorId: string): EteTask[] {
  const now = new Date().toISOString();
  const updated: EteTask[] = [];
  for (const task of getEtePorts().tasks.list()) {
    if (task.seriesId !== seriesId) continue;
    if (task.status === "completed") continue;
    const next: EteTask = {
      ...task,
      enabled: false,
      status: "cancelled",
      seriesStatus: "cancelled",
      chanakyaMonitoring: false,
      modifiedBy: actorId,
      modifiedOn: now,
    };
    getEtePorts().tasks.save(next);
    updated.push(next);
  }
  return updated;
}

/** Placeholder delete — disables and soft-removes from active lists. */
export function deleteEteTask(taskId: string, actorId: string): EteTask {
  return completeEteTask(taskId, actorId);
}

/** Placeholder reopen — re-enables a completed task in-memory. */
export function reopenEteTask(taskId: string, actorId: string): EteTask {
  const existing = getEtePorts().tasks.findById(taskId);
  if (!existing) throw new Error(`ETE task not found: ${taskId}`);
  const updated: EteTask = {
    ...existing,
    enabled: true,
    status: "open",
    completedAt: undefined,
    completedBy: undefined,
    chanakyaMonitoring: true,
    colourStatus: deriveEteTaskColour(existing.dueOn),
    modifiedBy: actorId,
    modifiedOn: new Date().toISOString(),
  };
  getEtePorts().tasks.save(updated);
  tryAppendEdcTaskEntry({
    taskId,
    title: "Task reopened",
    description: `Reopened · ${taskTitle(existing)}`,
    actorId,
    opportunityRef: existing.opportunityRef,
  });
  return updated;
}

/** Escalates all overdue tasks that are not yet escalated. Logs only — no external notifications. */
export function escalateEteOverdueTasks(actorId: string): EteTask[] {
  if (shouldSuppressAutomation("escalations")) return [];

  const overdue = getEtePorts()
    .tasks.list()
    .filter((t) => t.enabled && !t.escalated && deriveEteTaskColour(t.dueOn) === "red");

  return overdue.map((t) => escalateEteTask(t.id, actorId));
}

export { deriveEteTaskColour };
