/**
 * BAT #27 — Chanakya monitors every Quick Task until Complete.
 * Reuses ETE colour / overdue escalation — no parallel monitoring engine.
 */

import {
  listEteTasks,
  pushTaskNotification,
  resolveTaskCategory,
  taskTitle,
} from "@/lib/enterprise-task-engine";
import type { EteTask } from "@/types/enterprise-task-engine";

export function registerChanakyaTaskMonitoring(task: EteTask): void {
  pushTaskNotification({
    taskId: task.id,
    taskName: taskTitle(task),
    category: resolveTaskCategory(task),
    borrowerName: task.borrowerName,
    loanProduct: task.loanProduct,
    lenderName: task.lenderName,
    grossStage: task.grossStage,
    newTimeline: "Chanakya Monitoring",
    commitmentLevel: "very_high",
    reasonCategory: "assignment",
    comment: "I'll keep an eye on this task and follow up until it reaches closure.",
    assignedByRef: task.assignedByRef ?? task.createdBy,
  });
}

/** Active tasks still under Chanakya supervision. */
export function listChanakyaMonitoredTasks(): EteTask[] {
  return listEteTasks().filter(
    (t) => t.enabled && t.chanakyaMonitoring !== false,
  );
}
