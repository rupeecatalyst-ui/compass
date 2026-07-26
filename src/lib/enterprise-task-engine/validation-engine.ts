/**
 * ETE validation and colour derivation (SPR-001 + CO-BIZ-001).
 */

import {
  ETE_DUE_SOON_HOURS,
  ETE_PREDEFINED_DESCRIPTIONS,
  ETE_TASK_TYPES,
} from "@/constants/enterprise-task-engine";
import type { EteTask, EteTaskColour, EteValidationResult } from "@/types/enterprise-task-engine";
import { hasBusinessContext } from "./task-workspace";

function issue(
  code: string,
  message: string,
  severity: "error" | "warning" = "error",
): EteValidationResult["issues"][0] {
  return { code, severity, message };
}

export function validateEteTask(
  task: Pick<
    EteTask,
    | "taskType"
    | "assigneeRef"
    | "opportunityRef"
    | "predefinedDescription"
    | "description"
    | "entityKind"
    | "entityId"
    | "contactId"
    | "dealId"
    | "fileId"
    | "lenderId"
    | "documentId"
    | "title"
  >,
): EteValidationResult {
  const issues = [];
  if (!task.taskType) issues.push(issue("ETE_MISSING_TASK_TYPE", "Task type is required."));
  if (!task.assigneeRef?.trim()) issues.push(issue("ETE_MISSING_ASSIGNEE", "Assignee reference is required."));
  if (task.taskType === ETE_TASK_TYPES.OPPORTUNITY && !task.opportunityRef?.trim()) {
    issues.push(issue("ETE_MISSING_OPPORTUNITY_REF", "Opportunity tasks require opportunityRef."));
  }
  if (
    task.predefinedDescription === ETE_PREDEFINED_DESCRIPTIONS.CUSTOM &&
    !task.description?.trim() &&
    !task.title?.trim()
  ) {
    issues.push(issue("ETE_CUSTOM_DESCRIPTION_REQUIRED", "Custom tasks require a title or description."));
  }
  if (!hasBusinessContext(task)) {
    issues.push(
      issue(
        "ETE_MISSING_BUSINESS_CONTEXT",
        "Tasks must belong to a business entity (Customer, Opportunity, Deal, Document, Lender, or Workflow).",
      ),
    );
  }
  return { valid: issues.filter((i) => i.severity === "error").length === 0, issues };
}

/** blue = within due, orange = due within 4 hours, red = overdue. No due => blue. */
export function deriveEteTaskColour(dueOn?: string, now: Date = new Date()): EteTaskColour {
  if (!dueOn) return "blue";
  const due = new Date(dueOn).getTime();
  const current = now.getTime();
  if (Number.isNaN(due)) return "blue";
  if (current > due) return "red";
  const hoursUntilDue = (due - current) / (1000 * 60 * 60);
  if (hoursUntilDue <= ETE_DUE_SOON_HOURS) return "orange";
  return "blue";
}
