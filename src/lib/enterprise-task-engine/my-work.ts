/**
 * CO-BIZ-001 — My Work consolidated view (entity-bound ETE tasks).
 */

import type { EteMyWorkView, EteTask } from "@/types/enterprise-task-engine";
import { listEteTasks } from "./task-registry";
import { columnForTask, resolveWorkType, resolveTaskStatus } from "./task-workspace";

function sameUser(a: string | undefined, b: string): boolean {
  if (!a) return false;
  const na = a.replace(/^user:/, "").replace(/^employee:/, "");
  const nb = b.replace(/^user:/, "").replace(/^employee:/, "");
  return a === b || na === nb || a === `user:${nb}` || a === `employee:${nb}`;
}

function isOpen(task: EteTask): boolean {
  return resolveTaskStatus(task) === "open" && task.enabled !== false;
}

function isCompleted(task: EteTask): boolean {
  return resolveTaskStatus(task) === "completed" || task.enabled === false;
}

export function buildMyWorkView(userRef: string): EteMyWorkView {
  const all = listEteTasks();
  const assignedToMe = all.filter((t) => sameUser(t.assigneeRef, userRef));
  const assignedByMe = all.filter(
    (t) => sameUser(t.assignedByRef, userRef) || sameUser(t.createdBy, userRef),
  );

  const openMine = assignedToMe.filter(isOpen);
  const overdue = openMine.filter((t) => columnForTask(t) === "past_due");
  const dueToday = openMine.filter((t) => columnForTask(t) === "due_today");
  const upcoming = openMine.filter((t) => {
    const col = columnForTask(t);
    return col !== "past_due" && col !== "due_today";
  });
  const completed = assignedToMe.filter(isCompleted);

  return {
    userRef,
    asOf: new Date().toISOString(),
    overdue,
    dueToday,
    upcoming,
    completed,
    assignedByMe,
    assignedToMe,
    counts: {
      overdue: overdue.length,
      due_today: dueToday.length,
      upcoming: upcoming.length,
      completed: completed.length,
      assigned_by_me: assignedByMe.length,
      assigned_to_me: assignedToMe.length,
    },
  };
}

export function listTasksForEntity(input: {
  entityKind?: string;
  entityId?: string;
  opportunityRef?: string;
  dealId?: string;
  contactId?: string;
  lenderId?: string;
  documentId?: string;
  fileId?: string;
}): EteTask[] {
  return listEteTasks().filter((t) => {
    if (input.opportunityRef && t.opportunityRef === input.opportunityRef) return true;
    if (input.dealId && t.dealId === input.dealId) return true;
    if (input.contactId && t.contactId === input.contactId) return true;
    if (input.lenderId && t.lenderId === input.lenderId) return true;
    if (input.documentId && t.documentId === input.documentId) return true;
    if (input.fileId && t.fileId === input.fileId) return true;
    if (
      input.entityKind &&
      input.entityId &&
      t.entityKind === input.entityKind &&
      t.entityId === input.entityId
    ) {
      return true;
    }
    return false;
  });
}

export { resolveWorkType };
