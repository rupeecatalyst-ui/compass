/**
 * Enterprise Task Workspace — timeline columns, due-date mapping, enrichment.
 * CO-BIZ-001 — work type / status helpers + lifecycle notifications.
 */

import type {
  EteTask,
  EteTaskCategory,
  EteTaskStatus,
  EteWorkType,
} from "@/types/enterprise-task-engine";
import { ETE_PREDEFINED_TO_WORK_TYPE } from "@/constants/enterprise-task-engine";
import {
  getEnterpriseUser,
  listEnterpriseUsers,
} from "@/lib/enterprise-user-management";

export type TaskTimelineColumnId =
  | "past_due"
  | "due_today"
  | "tomorrow"
  | "this_week"
  | "next_week"
  | "this_month"
  | "next_month"
  | "no_schedule";

export const TASK_TIMELINE_COLUMNS: { id: TaskTimelineColumnId; label: string }[] = [
  { id: "past_due", label: "Past Due" },
  { id: "due_today", label: "Due Today" },
  { id: "tomorrow", label: "Tomorrow" },
  { id: "this_week", label: "This Week" },
  { id: "next_week", label: "Next Week" },
  { id: "this_month", label: "This Month" },
  { id: "next_month", label: "Next Month" },
  { id: "no_schedule", label: "No Schedule" },
];

export const TASK_COMMITMENT_OPTIONS = [
  { id: "very_high", label: "Very High" },
  { id: "high", label: "High" },
  { id: "moderate", label: "Moderate" },
  { id: "low", label: "Low" },
  { id: "very_low", label: "Very Low" },
] as const;

export const TASK_POSTPONE_REASONS = [
  { id: "waiting_customer", label: "Waiting for Customer" },
  { id: "waiting_lender", label: "Waiting for Lender" },
  { id: "document_pending", label: "Document Pending" },
  { id: "internal_dependency", label: "Internal Dependency" },
  { id: "third_party", label: "Third Party Dependency" },
  { id: "priority_changed", label: "Priority Changed" },
  { id: "other", label: "Other" },
] as const;

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

function addDays(dayStart: number, days: number) {
  return dayStart + days * 24 * 60 * 60 * 1000;
}

export function resolveTaskCategory(task: EteTask): EteTaskCategory {
  if (task.category) return task.category;
  return task.taskType === "opportunity" ? "workflow" : "general";
}

export function resolveWorkType(task: EteTask): EteWorkType {
  if (task.workType) return task.workType;
  return ETE_PREDEFINED_TO_WORK_TYPE[task.predefinedDescription] ?? "Custom";
}

export function resolveTaskStatus(task: EteTask): EteTaskStatus {
  if (task.status) return task.status;
  return task.enabled === false ? "completed" : "open";
}

export function taskTitle(task: EteTask): string {
  if (task.title?.trim()) return task.title.trim();
  if (task.predefinedDescription === "Custom") return task.description || "Custom task";
  return task.predefinedDescription;
}

export function hasBusinessContext(task: Partial<EteTask>): boolean {
  return Boolean(
    task.entityId ||
      task.opportunityRef ||
      task.contactId ||
      task.dealId ||
      task.fileId ||
      task.lenderId ||
      task.documentId,
  );
}

export function assigneeLabel(ref: string): string {
  if (!ref?.trim()) return "Unassigned";
  if (ref === "system" || ref === "ui") return "System";

  const bare = ref.replace(/^user:/, "").replace(/^employee:/, "");
  const byId = getEnterpriseUser(bare) ?? getEnterpriseUser(ref);
  if (byId?.fullName?.trim()) return byId.fullName.trim();
  const hit = listEnterpriseUsers().find(
    (u) =>
      u.id === bare ||
      u.id === ref ||
      u.employeeId === bare ||
      `user:${u.id}` === ref ||
      `employee:${u.employeeId}` === ref,
  );
  if (hit?.fullName?.trim()) return hit.fullName.trim();

  if (ref.includes("rm")) return "Rahul Sharma";
  if (ref.includes("ops")) return "Ops Desk";
  if (ref.includes("mgr")) return "Anil Mehta";
  if (ref.includes("hr")) return "HR Desk";
  return bare || "Unassigned";
}

export function columnForTask(task: EteTask): TaskTimelineColumnId {
  if (!task.dueOn) return "no_schedule";
  const due = startOfDay(new Date(task.dueOn));
  const today = startOfDay(new Date());
  const tomorrow = addDays(today, 1);
  const weekEnd = addDays(today, 7);
  const nextWeekEnd = addDays(today, 14);
  const monthEnd = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0);
  const monthEndTs = startOfDay(monthEnd);
  const nextMonthEnd = new Date(new Date().getFullYear(), new Date().getMonth() + 2, 0);
  const nextMonthEndTs = startOfDay(nextMonthEnd);

  if (due < today) return "past_due";
  if (due === today) return "due_today";
  if (due === tomorrow) return "tomorrow";
  if (due <= weekEnd) return "this_week";
  if (due <= nextWeekEnd) return "next_week";
  if (due <= monthEndTs) return "this_month";
  if (due <= nextMonthEndTs) return "next_month";
  return "next_month";
}

export function dueDateForColumn(column: TaskTimelineColumnId): string | undefined {
  if (column === "no_schedule") return undefined;
  const today = startOfDay(new Date());
  let target = today;
  switch (column) {
    case "past_due":
      target = addDays(today, -1);
      break;
    case "due_today":
      target = today;
      break;
    case "tomorrow":
      target = addDays(today, 1);
      break;
    case "this_week":
      target = addDays(today, 3);
      break;
    case "next_week":
      target = addDays(today, 10);
      break;
    case "this_month":
      target = addDays(today, 20);
      break;
    case "next_month":
      target = addDays(today, 40);
      break;
    default:
      break;
  }
  const d = new Date(target);
  d.setHours(12, 0, 0, 0);
  return d.toISOString();
}

export function columnOrder(id: TaskTimelineColumnId): number {
  return TASK_TIMELINE_COLUMNS.findIndex((c) => c.id === id);
}

export function isPostponeMove(from: TaskTimelineColumnId, to: TaskTimelineColumnId): boolean {
  if (to === "no_schedule") return true;
  if (from === "no_schedule") return false;
  return columnOrder(to) > columnOrder(from);
}

export function enrichTaskDefaults(task: EteTask): EteTask {
  const category = resolveTaskCategory(task);
  const workType = resolveWorkType(task);
  const status = resolveTaskStatus(task);
  if (category === "workflow") {
    return {
      ...task,
      category,
      workType,
      status,
      title:
        task.title ??
        (task.predefinedDescription === "Custom"
          ? task.description
          : task.predefinedDescription),
      priority: task.priority ?? (task.colourStatus === "red" ? "high" : "medium"),
      borrowerName: task.borrowerName ?? "Rahul Menon",
      loanProduct: task.loanProduct ?? "Home Loan",
      lenderName:
        task.lenderName ??
        (task.predefinedDescription.includes("Lender") ? "HDFC Bank" : undefined),
      assignedByRef: task.assignedByRef ?? task.reportingManagerRef ?? "employee:mgr-001",
      grossStage: task.grossStage ?? "Document Center",
      fileId: task.fileId,
      entityKind:
        task.entityKind ??
        (task.dealId
          ? "EnterpriseDeal"
          : task.opportunityRef
            ? "Opportunity"
            : task.contactId
              ? "Customer"
              : undefined),
      entityId: task.entityId ?? task.dealId ?? task.opportunityRef ?? task.contactId,
    };
  }
  return {
    ...task,
    category,
    workType,
    status,
    title:
      task.title ??
      (task.predefinedDescription === "Custom"
        ? task.description
        : task.predefinedDescription),
    priority: task.priority ?? "medium",
    department: task.department ?? "Operations",
    assignedByRef: task.assignedByRef ?? "employee:mgr-001",
    entityKind: task.entityKind ?? (task.contactId ? "Customer" : "Workflow"),
    entityId: task.entityId ?? task.contactId ?? task.department ?? "org-workflow",
  };
}

const NOTIFY_KEY = "catalyst.task-workspace.notifications";

export interface TaskPostponeNotification {
  id: string;
  at: string;
  taskId: string;
  taskName: string;
  category: EteTaskCategory;
  borrowerName?: string;
  loanProduct?: string;
  lenderName?: string;
  grossStage?: string;
  newTimeline: string;
  commitmentLevel: string;
  reasonCategory: string;
  comment?: string;
  assignedByRef?: string;
  read: boolean;
  kind?: "postpone" | "due_reminder" | "overdue" | "completed" | "reassigned" | "system_generated";
  message?: string;
  assigneeRef?: string;
}

export function loadTaskNotifications(): TaskPostponeNotification[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(NOTIFY_KEY);
    return raw ? (JSON.parse(raw) as TaskPostponeNotification[]) : [];
  } catch {
    return [];
  }
}

export function pushTaskNotification(n: Omit<TaskPostponeNotification, "id" | "at" | "read">) {
  if (typeof window === "undefined") return;
  const list = loadTaskNotifications();
  list.unshift({
    ...n,
    id: `tn-${Date.now()}`,
    at: new Date().toISOString(),
    read: false,
  });
  localStorage.setItem(NOTIFY_KEY, JSON.stringify(list.slice(0, 50)));
}

export function pushTaskLifecycleNotification(input: {
  kind: NonNullable<TaskPostponeNotification["kind"]>;
  taskId: string;
  taskName: string;
  message: string;
  assigneeRef?: string;
  category?: EteTaskCategory;
}) {
  pushTaskNotification({
    kind: input.kind,
    taskId: input.taskId,
    taskName: input.taskName,
    message: input.message,
    assigneeRef: input.assigneeRef,
    category: input.category ?? "workflow",
    newTimeline: input.kind,
    commitmentLevel: "—",
    reasonCategory: input.kind,
    comment: input.message,
  });
}

export function refreshTaskDueReminders(tasks: EteTask[]): void {
  if (typeof window === "undefined") return;
  const day = new Date().toISOString().slice(0, 10);
  const existing = loadTaskNotifications();
  for (const t of tasks) {
    if (resolveTaskStatus(t) !== "open" || t.enabled === false) continue;
    const col = columnForTask(t);
    if (col !== "past_due" && col !== "due_today") continue;
    const kind = col === "past_due" ? "overdue" : "due_reminder";
    const marker = `${kind}:${t.id}:${day}`;
    if (existing.some((n) => n.comment === marker || n.message?.includes(marker))) continue;
    pushTaskLifecycleNotification({
      kind,
      taskId: t.id,
      taskName: taskTitle(t),
      message: marker,
      assigneeRef: t.assigneeRef,
      category: resolveTaskCategory(t),
    });
  }
}
