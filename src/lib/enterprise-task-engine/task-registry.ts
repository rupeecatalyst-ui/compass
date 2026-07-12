/**
 * ETE task registry and escalation.
 */

import { EDC_EVENT_TYPES } from "@/constants/enterprise-dialogue-center";
import { appendEdcTimelineEntry } from "@/lib/enterprise-dialogue-center";
import { shouldSuppressAutomation } from "@/lib/enterprise-platform-modes";
import type { EteTask } from "@/types/enterprise-task-engine";
import { recordEteAudit } from "./audit-integration";
import { getEtePorts } from "./composition";
import { deriveEteTaskColour, validateEteTask } from "./validation-engine";

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

  const validation = validateEteTask(input);
  if (!validation.valid) throw new Error(validation.issues.map((i) => i.message).join("; "));

  const now = new Date().toISOString();
  const task: EteTask = {
    ...input,
    coOwnerRefs: input.coOwnerRefs ?? [],
    escalated: false,
    colourStatus: deriveEteTaskColour(input.dueOn),
    id: crypto.randomUUID(),
    enabled: true,
    createdOn: now,
    modifiedBy: input.createdBy,
    modifiedOn: now,
  };

  getEtePorts().tasks.save(task);
  recordEteAudit({
    entityId: task.id,
    entityType: "task",
    action: "created",
    actorId: input.createdBy,
    remarks: `ETE task ${task.predefinedDescription}`,
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

/** Escalates all overdue tasks that are not yet escalated. Logs only — no external notifications. */
export function escalateEteOverdueTasks(actorId: string): EteTask[] {
  if (shouldSuppressAutomation("escalations")) return [];

  const overdue = getEtePorts()
    .tasks.list()
    .filter((t) => t.enabled && !t.escalated && deriveEteTaskColour(t.dueOn) === "red");

  return overdue.map((t) => escalateEteTask(t.id, actorId));
}

export { deriveEteTaskColour };
