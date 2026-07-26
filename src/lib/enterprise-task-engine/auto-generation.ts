/**
 * CO-BIZ-001 — Automatic task generation from business events.
 * Idempotent per (ruleId + entityId). Never creates orphan tasks.
 */

import {
  ETE_AUTO_GENERATION_RULES,
  ETE_PREDEFINED_TO_WORK_TYPE,
  ETE_TASK_TYPES,
} from "@/constants/enterprise-task-engine";
import type {
  EteBusinessEvent,
  EteEntityKind,
  EteTask,
} from "@/types/enterprise-task-engine";
import { listEteTasks, registerEteTask } from "./task-registry";
import { pushTaskLifecycleNotification } from "./task-workspace";

export type GenerateTasksForEventInput = {
  event: EteBusinessEvent;
  entityKind: EteEntityKind;
  entityId: string;
  entityLabel?: string;
  assigneeRef: string;
  createdBy?: string;
  assignedByRef?: string;
  opportunityRef?: string;
  dealId?: string;
  contactId?: string;
  lenderId?: string;
  documentId?: string;
  borrowerName?: string;
  loanProduct?: string;
  lenderName?: string;
  grossStage?: EteTask["grossStage"];
};

function dueIso(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setHours(17, 0, 0, 0);
  return d.toISOString();
}

export function generateTasksForBusinessEvent(
  input: GenerateTasksForEventInput,
): EteTask[] {
  const rules = ETE_AUTO_GENERATION_RULES.filter((r) => r.event === input.event);
  if (rules.length === 0) return [];

  const existing = listEteTasks();
  const created: EteTask[] = [];

  for (const rule of rules) {
    const already = existing.some(
      (t) =>
        t.autoRuleId === rule.id &&
        (t.entityId === input.entityId ||
          t.dealId === input.dealId ||
          t.contactId === input.contactId ||
          t.opportunityRef === input.opportunityRef),
    );
    if (already) continue;

    try {
      const task = registerEteTask({
        taskType:
          input.entityKind === "Opportunity" || input.opportunityRef
            ? ETE_TASK_TYPES.OPPORTUNITY
            : ETE_TASK_TYPES.INDEPENDENT,
        category: "workflow",
        assigneeRef: input.assigneeRef,
        opportunityRef: input.opportunityRef,
        dealId: input.dealId,
        contactId: input.contactId,
        lenderId: input.lenderId,
        documentId: input.documentId,
        entityKind: input.entityKind,
        entityId: input.entityId,
        entityLabel: input.entityLabel,
        predefinedDescription: rule.predefinedDescription,
        workType: rule.workType ?? ETE_PREDEFINED_TO_WORK_TYPE[rule.predefinedDescription],
        title: rule.title,
        description: rule.description,
        priority: rule.priority,
        dueOn: dueIso(rule.dueInDays),
        status: "open",
        systemGenerated: true,
        autoRuleId: rule.id,
        borrowerName: input.borrowerName,
        loanProduct: input.loanProduct,
        lenderName: input.lenderName,
        grossStage: input.grossStage,
        assignedByRef: input.assignedByRef ?? "system",
        createdBy: input.createdBy ?? "system",
        chanakyaMonitoring: true,
      });
      created.push(task);
      pushTaskLifecycleNotification({
        kind: "system_generated",
        taskId: task.id,
        taskName: rule.title,
        message: `System created task: ${rule.title}`,
        assigneeRef: input.assigneeRef,
      });
    } catch {
      /* never fail the business event because of task generation */
    }
  }

  return created;
}
