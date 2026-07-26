/**
 * CO-BIZ-001 — Operational task reporting (single derive).
 */

import type { EteOperationalReport, EteTask } from "@/types/enterprise-task-engine";
import { listEteTasks } from "./task-registry";
import {
  columnForTask,
  resolveTaskStatus,
  resolveWorkType,
  taskTitle,
} from "./task-workspace";

function startOfToday(): number {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

function isCompleted(task: EteTask): boolean {
  return resolveTaskStatus(task) === "completed" || task.enabled === false;
}

function isOpen(task: EteTask): boolean {
  return resolveTaskStatus(task) === "open" && task.enabled !== false;
}

export function buildEteOperationalReport(): EteOperationalReport {
  const tasks = listEteTasks();
  const todayStart = startOfToday();

  const completedToday = tasks.filter((t) => {
    if (!isCompleted(t)) return false;
    const at = t.completedAt ? Date.parse(t.completedAt) : Date.parse(t.modifiedOn);
    return !Number.isNaN(at) && at >= todayStart;
  }).length;

  const overdueOpen = tasks.filter(
    (t) => isOpen(t) && columnForTask(t) === "past_due",
  ).length;

  const completionHours: number[] = [];
  for (const t of tasks) {
    if (!isCompleted(t) || !t.completedAt) continue;
    const start = Date.parse(t.createdOn);
    const end = Date.parse(t.completedAt);
    if (Number.isNaN(start) || Number.isNaN(end) || end < start) continue;
    completionHours.push((end - start) / (1000 * 60 * 60));
  }
  const averageCompletionHours =
    completionHours.length === 0
      ? null
      : Math.round(
          (completionHours.reduce((a, b) => a + b, 0) / completionHours.length) * 10,
        ) / 10;

  const byAssigneeMap = new Map<
    string,
    { open: number; completed: number; overdue: number }
  >();
  for (const t of tasks) {
    const key = t.assigneeRef || "unassigned";
    const cur = byAssigneeMap.get(key) ?? { open: 0, completed: 0, overdue: 0 };
    if (isCompleted(t)) cur.completed += 1;
    else if (isOpen(t)) {
      cur.open += 1;
      if (columnForTask(t) === "past_due") cur.overdue += 1;
    }
    byAssigneeMap.set(key, cur);
  }

  const byStageMap = new Map<string, { open: number; overdue: number }>();
  for (const t of tasks.filter(isOpen)) {
    const stage = t.grossStage ?? "Unstaged";
    const cur = byStageMap.get(stage) ?? { open: 0, overdue: 0 };
    cur.open += 1;
    if (columnForTask(t) === "past_due") cur.overdue += 1;
    byStageMap.set(stage, cur);
  }

  const byWorkMap = new Map<string, { open: number; completed: number }>();
  for (const t of tasks) {
    const wt = resolveWorkType(t);
    const cur = byWorkMap.get(wt) ?? { open: 0, completed: 0 };
    if (isCompleted(t)) cur.completed += 1;
    else if (isOpen(t)) cur.open += 1;
    byWorkMap.set(wt, cur);
  }

  return {
    asOf: new Date().toISOString(),
    completedToday,
    overdueOpen,
    averageCompletionHours,
    byAssignee: [...byAssigneeMap.entries()]
      .map(([assigneeRef, v]) => ({ assigneeRef, ...v }))
      .sort((a, b) => b.overdue - a.overdue || b.open - a.open),
    byStage: [...byStageMap.entries()]
      .map(([stage, v]) => ({ stage, ...v }))
      .sort((a, b) => b.overdue - a.overdue),
    byWorkType: [...byWorkMap.entries()]
      .map(([workType, v]) => ({ workType, ...v }))
      .sort((a, b) => b.open - a.open),
  };
}

/** Lightweight label helper for reports UI. */
export function reportTaskLabel(task: EteTask): string {
  return taskTitle(task);
}
