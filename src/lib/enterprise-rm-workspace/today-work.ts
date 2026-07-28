/**
 * CO-BIZ-005 Phase 1 — Today's Work from ETE (no parallel task engine).
 */

import {
  RM_DOCUMENT_WORK_TYPES,
  RM_FOLLOW_UP_WORK_TYPES,
  RM_LENDER_WORK_TYPES,
  RM_MEETING_HINTS,
} from "@/constants/enterprise-rm-workspace";
import { buildMyWorkView, resolveWorkType } from "@/lib/enterprise-task-engine";
import type { EteTask } from "@/types/enterprise-task-engine";
import type { RmTodayWork, RmTodayWorkBucket } from "@/types/enterprise-rm-workspace";

function bucket(id: string, label: string, tasks: EteTask[]): RmTodayWorkBucket {
  return { id, label, count: tasks.length, tasks };
}

function textOf(task: EteTask): string {
  return `${task.title || ""} ${task.description || ""} ${task.predefinedDescription || ""}`.toLowerCase();
}

function isMeeting(task: EteTask): boolean {
  const t = textOf(task);
  return RM_MEETING_HINTS.some((h) => t.includes(h));
}

function workTypeIn(task: EteTask, list: readonly string[]): boolean {
  return list.includes(resolveWorkType(task));
}

export function projectRmTodayWork(assigneeRef: string): RmTodayWork {
  const view = buildMyWorkView(assigneeRef);
  const openMine = [...view.overdue, ...view.dueToday, ...view.upcoming];

  const followUps = openMine.filter(
    (t) => workTypeIn(t, RM_FOLLOW_UP_WORK_TYPES) || t.predefinedDescription === "Call Customer",
  );
  const meetings = openMine.filter(isMeeting);
  const docs = openMine.filter(
    (t) =>
      workTypeIn(t, RM_DOCUMENT_WORK_TYPES) ||
      t.predefinedDescription === "Follow-up Documents",
  );
  const lenders = openMine.filter(
    (t) =>
      workTypeIn(t, RM_LENDER_WORK_TYPES) ||
      t.predefinedDescription === "Follow-up Lender",
  );

  return {
    followUps: bucket("follow_ups", "Today's follow-ups", followUps),
    overdue: bucket("overdue", "Overdue work", view.overdue),
    upcomingMeetings: bucket("meetings", "Upcoming meetings", meetings),
    pendingDocumentRequests: bucket("documents", "Pending document requests", docs),
    pendingLenderActions: bucket("lender", "Pending lender actions", lenders),
  };
}
