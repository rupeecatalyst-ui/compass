/**
 * CO-TASKS-PLANNER-001A — Reschedule via Enterprise Task Registry (ETE SSOT).
 * Planner never duplicates task records.
 */

import { EDC_EVENT_TYPES } from "@/constants/enterprise-dialogue-center";
import { appendEdcTimelineEntry } from "@/lib/enterprise-dialogue-center";
import {
  getEtePorts,
  listEteTasks,
  patchEteTask,
  recordEteAudit,
  resolveTaskStatus,
} from "@/lib/enterprise-task-engine";
import type { PlannerRescheduleResult } from "@/types/enterprise-planner";

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

/**
 * Reschedule an ETE-backed planner activity.
 * Updates dueOn on the Task Registry and records audit + dialogue timeline.
 */
export function reschedulePlannerActivity(input: {
  taskId?: string;
  eventId?: string;
  /** Target calendar day (any time within day is fine; hour may override) */
  targetDate: string | Date;
  /** Optional hour for Day-view slot drops (0–23) */
  targetHour?: number;
  /** Optional minute */
  targetMinute?: number;
  actorId: string;
}): PlannerRescheduleResult {
  let taskId = input.taskId;
  if (!taskId && input.eventId?.startsWith("ete:")) {
    taskId = input.eventId.slice(4);
  }
  if (!taskId) {
    return {
      ok: false,
      reason:
        "Only Enterprise Tasks can be rescheduled from Planner. This item is not linked to the Task Registry.",
    };
  }

  const task =
    getEtePorts().tasks.findById(taskId) ??
    listEteTasks().find((t) => t.id === taskId);
  if (!task) {
    return { ok: false, reason: "Task not found in Enterprise Task Registry." };
  }

  const status = resolveTaskStatus(task);
  if (status === "completed" || task.enabled === false) {
    return {
      ok: false,
      reason: "Completed activities cannot be rescheduled. Reopen the task first.",
    };
  }
  if (status === "cancelled") {
    return { ok: false, reason: "Cancelled activities cannot be rescheduled." };
  }

  const target = new Date(input.targetDate);
  if (Number.isNaN(target.getTime())) {
    return { ok: false, reason: "Invalid target date." };
  }

  const previousDueOn = task.dueOn;
  const next = new Date(target);

  if (typeof input.targetHour === "number") {
    next.setHours(input.targetHour, input.targetMinute ?? 0, 0, 0);
  } else if (previousDueOn) {
    const prev = new Date(previousDueOn);
    if (!Number.isNaN(prev.getTime())) {
      next.setHours(prev.getHours(), prev.getMinutes(), 0, 0);
    } else {
      next.setHours(12, 0, 0, 0);
    }
  } else {
    next.setHours(12, 0, 0, 0);
  }

  // No-op same day+time
  if (
    previousDueOn &&
    startOfDay(new Date(previousDueOn)).getTime() === startOfDay(next).getTime() &&
    new Date(previousDueOn).getHours() === next.getHours() &&
    new Date(previousDueOn).getMinutes() === next.getMinutes() &&
    typeof input.targetHour !== "number"
  ) {
    // Still allow hour-preserving same-day no-op for day drops of same date
    const sameInstant =
      Math.abs(new Date(previousDueOn).getTime() - next.getTime()) < 60_000;
    if (sameInstant) {
      return { ok: false, reason: "Activity is already scheduled on this slot." };
    }
  }

  const nextDueOn = next.toISOString();
  patchEteTask(taskId, { dueOn: nextDueOn }, input.actorId);

  const fromLabel = previousDueOn
    ? new Date(previousDueOn).toLocaleString("en-IN", {
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "unscheduled";
  const toLabel = next.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });

  recordEteAudit({
    entityId: taskId,
    entityType: "task",
    action: "modified",
    actorId: input.actorId,
    remarks: `Planner reschedule: ${fromLabel} → ${toLabel}`,
  });

  try {
    appendEdcTimelineEntry({
      contextRef: {
        type: task.opportunityRef ? "opportunity" : "customer",
        id: task.opportunityRef ?? task.contactId ?? taskId,
      },
      eventType: EDC_EVENT_TYPES.TASK,
      title: "Activity rescheduled",
      description: `Planner moved activity from ${fromLabel} to ${toLabel}.`,
      actorId: input.actorId,
      expandablePayload: {
        taskId,
        previousDueOn,
        nextDueOn,
        source: "planner",
      },
    });
  } catch {
    // Timeline is best-effort
  }

  return { ok: true, taskId, previousDueOn, nextDueOn };
}
