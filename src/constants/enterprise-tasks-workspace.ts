/**
 * CO-TASKS-PLANNER-001 — Tasks Workspace chrome constants.
 */

import type { TasksExecutionBucket, TasksWorkspacePrimaryTab } from "@/types/enterprise-tasks-workspace";

export const TASKS_WORKSPACE_TITLE = "Tasks";

export const TASKS_WORKSPACE_TABS: { id: TasksWorkspacePrimaryTab; label: string }[] = [
  { id: "tasks", label: "Tasks" },
  { id: "planner", label: "Planner" },
];

export const TASKS_EXECUTION_BUCKETS: { id: TasksExecutionBucket; label: string }[] = [
  { id: "today", label: "Today's Tasks" },
  { id: "pending", label: "Pending" },
  { id: "overdue", label: "Overdue" },
  { id: "completed", label: "Completed" },
  { id: "assigned", label: "Assigned" },
  { id: "personal", label: "Personal" },
  { id: "workflow", label: "Workflow" },
];

export const TASKS_WORKSPACE_DEFAULT_TAB: TasksWorkspacePrimaryTab = "tasks";
