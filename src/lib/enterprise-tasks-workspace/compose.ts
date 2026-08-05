/**
 * CO-TASKS-PLANNER-001 — Tasks Workspace compose (execution buckets + summary).
 * Presentation-only projections over ETE + Planner.
 */

import { buildPlannerSnapshot } from "@/lib/enterprise-planner";
import {
  buildMyWorkView,
  columnForTask,
  listEteTasks,
  resolveTaskCategory,
  resolveTaskStatus,
  sameAssigneeRef,
} from "@/lib/enterprise-task-engine";
import type { EteTask } from "@/types/enterprise-task-engine";
import type { PlannerViewMode } from "@/types/enterprise-planner";
import type {
  EnterpriseTasksWorkspaceModel,
  TasksExecutionBucket,
  TasksExecutionView,
  TasksWorkspaceSummary,
} from "@/types/enterprise-tasks-workspace";

function isOpen(task: EteTask): boolean {
  return resolveTaskStatus(task) === "open" && task.enabled !== false;
}

function isCompleted(task: EteTask): boolean {
  return resolveTaskStatus(task) === "completed" || task.enabled === false;
}

export function buildTasksExecutionView(userRef: string): TasksExecutionView {
  const myWork = buildMyWorkView(userRef);
  const all = listEteTasks();
  const mine = all.filter((t) => sameAssigneeRef(t.assigneeRef, userRef));
  const openMine = mine.filter(isOpen);

  const today = myWork.dueToday;
  const overdue = myWork.overdue;
  const pending = openMine.filter((t) => {
    const col = columnForTask(t);
    return col !== "past_due" && col !== "due_today";
  });
  const completed = mine.filter(isCompleted);
  const assigned = myWork.assignedToMe.filter(isOpen);
  const personal = openMine.filter((t) => resolveTaskCategory(t) === "general");
  const workflow = openMine.filter((t) => resolveTaskCategory(t) === "workflow");

  const buckets: Record<TasksExecutionBucket, EteTask[]> = {
    today,
    pending,
    overdue,
    completed,
    assigned,
    personal,
    workflow,
  };

  const counts = {
    today: today.length,
    pending: pending.length,
    overdue: overdue.length,
    completed: completed.length,
    assigned: assigned.length,
    personal: personal.length,
    workflow: workflow.length,
  };

  const planner = buildPlannerSnapshot({ viewMode: "agenda" });
  const summary: TasksWorkspaceSummary = {
    todaysTasks: counts.today,
    todaysMeetings: planner.counts.todayMeetings,
    overdue: counts.overdue,
    upcoming: pending.length,
    completed: counts.completed,
  };

  return {
    userRef,
    asOf: new Date().toISOString(),
    buckets,
    counts,
    summary,
  };
}

export function buildTasksWorkspaceSummary(userRef: string): TasksWorkspaceSummary {
  return buildTasksExecutionView(userRef).summary;
}

export function buildEnterpriseTasksWorkspaceModel(input: {
  userRef: string;
  plannerView?: PlannerViewMode;
  focusDate?: string;
}): EnterpriseTasksWorkspaceModel {
  const execution = buildTasksExecutionView(input.userRef);
  const planner = buildPlannerSnapshot({
    viewMode: input.plannerView,
    focusDate: input.focusDate,
  });
  return {
    summary: {
      ...execution.summary,
      todaysMeetings: planner.counts.todayMeetings,
    },
    execution,
    planner,
  };
}
