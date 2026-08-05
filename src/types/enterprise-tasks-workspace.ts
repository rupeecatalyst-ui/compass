/**
 * CO-TASKS-PLANNER-001 — Tasks Workspace presentation DTOs.
 */

import type { EteTask } from "@/types/enterprise-task-engine";
import type { EnterprisePlannerSnapshot } from "@/types/enterprise-planner";

export type TasksWorkspacePrimaryTab = "tasks" | "planner";

export type TasksExecutionBucket =
  | "today"
  | "pending"
  | "overdue"
  | "completed"
  | "assigned"
  | "personal"
  | "workflow";

export type TasksWorkspaceSummary = {
  todaysTasks: number;
  todaysMeetings: number;
  overdue: number;
  upcoming: number;
  completed: number;
};

export type TasksExecutionView = {
  userRef: string;
  asOf: string;
  buckets: Record<TasksExecutionBucket, EteTask[]>;
  counts: Record<TasksExecutionBucket, number>;
  summary: TasksWorkspaceSummary;
};

export type EnterpriseTasksWorkspaceModel = {
  summary: TasksWorkspaceSummary;
  execution: TasksExecutionView;
  planner: EnterprisePlannerSnapshot;
};
