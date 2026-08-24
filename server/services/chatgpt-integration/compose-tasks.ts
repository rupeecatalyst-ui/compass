/**
 * CO-CHATGPT-INTEGRATION-V1 — Tasks composer (read-only summaries).
 */
import "server-only";

import { buildEteOperationalReport } from "@/lib/enterprise-task-engine/reporting";
import { listEteTasks } from "@/lib/enterprise-task-engine/task-registry";
import {
  columnForTask,
  resolveTaskStatus,
  resolveWorkType,
  taskTitle,
} from "@/lib/enterprise-task-engine/task-workspace";
import {
  buildChatGptIntegrationMeta,
  type ChatGptComposeContext,
} from "@/lib/chatgpt-integration/route-handler";
import type { ChatGptTaskSummaryItem, ChatGptTasksDto } from "@/types/chatgpt-integration";
import type { EteTask } from "@/types/enterprise-task-engine";

function startOfTodayMs(): number {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

function isOpen(task: EteTask): boolean {
  return resolveTaskStatus(task) === "open" && task.enabled !== false;
}

function toSummary(task: EteTask): ChatGptTaskSummaryItem {
  return {
    id: task.id,
    title: taskTitle(task),
    priority: task.priority ?? "normal",
    status: resolveTaskStatus(task),
    dueOn: task.dueOn ?? null,
    workType: resolveWorkType(task),
    assignee: task.assigneeRef?.trim() ? "Assigned" : null,
  };
}

export async function composeChatGptTasksDto(
  ctx: ChatGptComposeContext,
): Promise<ChatGptTasksDto> {
  const report = buildEteOperationalReport();
  const tasks = listEteTasks();
  const todayStart = startOfTodayMs();

  const overdue = tasks
    .filter((t) => isOpen(t) && columnForTask(t) === "past_due")
    .slice(0, 15)
    .map(toSummary);

  const dueToday = tasks
    .filter((t) => {
      if (!isOpen(t) || !t.dueOn) return false;
      const due = Date.parse(t.dueOn);
      return !Number.isNaN(due) && due >= todayStart && due < todayStart + 86400000;
    })
    .slice(0, 15)
    .map(toSummary);

  const highPriority = tasks
    .filter((t) => isOpen(t) && (t.priority === "high" || t.priority === "critical"))
    .slice(0, 15)
    .map(toSummary);

  return {
    ...buildChatGptIntegrationMeta(ctx),
    overdueCount: report.overdueOpen,
    dueTodayCount: dueToday.length,
    highPriorityCount: highPriority.length,
    completedTodayCount: report.completedToday,
    overdue,
    dueToday,
    highPriority,
  };
}
