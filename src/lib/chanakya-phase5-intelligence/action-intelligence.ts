/**
 * CF-CHANAKYA-015 — Action Intelligence.
 * When overnight reasoning recommends an operational action, CHANAKYA creates the ETE task.
 */

import { registerEteTask } from "@/lib/enterprise-task-engine";
import { observeChanakyaMemoryEvent } from "./memory-store";
import type {
  ChanakyaActionRecommendation,
  ChanakyaActionTaskResult,
} from "@/types/chanakya-phase5-intelligence";

function mapPriorityToDescription(text: string): ChanakyaActionRecommendation["predefinedDescription"] {
  const t = text.toLowerCase();
  if (t.includes("call") && t.includes("customer")) return "Call Customer";
  if (t.includes("document")) return "Follow-up Documents";
  if (t.includes("lender") || t.includes("banker")) return "Follow-up Lender";
  if (t.includes("cibil")) return "Verify CIBIL";
  if (t.includes("meeting")) return "Customer Meeting";
  if (t.includes("branch")) return "Branch Visit";
  if (t.includes("manager")) return "Follow-up Manager";
  if (t.includes("review")) return "Internal Review";
  if (t.includes("query")) return "Resolve Query";
  return "General";
}

export function createChanakyaActionTask(
  recommendation: ChanakyaActionRecommendation,
): ChanakyaActionTaskResult {
  const descriptionParts = [
    recommendation.actionText,
    recommendation.customerName ? `Customer: ${recommendation.customerName}` : null,
    recommendation.loanFileId ? `Loan: ${recommendation.loanFileId}` : null,
    recommendation.currentStage ? `Stage: ${recommendation.currentStage}` : null,
    `Priority: ${recommendation.priority}`,
  ].filter(Boolean);

  const task = registerEteTask({
    taskType: recommendation.opportunityRef ? "opportunity" : "independent",
    assigneeRef: recommendation.assigneeRef,
    opportunityRef: recommendation.opportunityRef,
    dueOn: recommendation.dueOn,
    predefinedDescription: recommendation.predefinedDescription,
    description: descriptionParts.join(" · "),
    createdBy: recommendation.createdBy || "chanakya",
  });

  observeChanakyaMemoryEvent({
    kind: "task",
    actorId: "chanakya",
    summary: `A follow-up task has been created by CHANAKYA: ${recommendation.actionText}`,
    context: {
      taskId: task.id,
      recommendationId: recommendation.id,
      autoCreated: true,
    },
    customerName: recommendation.customerName,
    stage: recommendation.currentStage,
    loanFileId: recommendation.loanFileId,
    opportunityId: recommendation.opportunityRef,
    taskId: task.id,
  });

  return {
    taskId: task.id,
    created: true,
    message: "A follow-up task has been created by CHANAKYA.",
    recommendationId: recommendation.id,
  };
}

export function createChanakyaActionTaskFromText(input: {
  actionText: string;
  assigneeRef: string;
  createdBy?: string;
  customerName?: string;
  loanFileId?: string;
  opportunityRef?: string;
  currentStage?: string;
  priority?: ChanakyaActionRecommendation["priority"];
  dueOn?: string;
}): ChanakyaActionTaskResult {
  const due = input.dueOn ?? new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  return createChanakyaActionTask({
    id: `rec:${crypto.randomUUID()}`,
    actionText: input.actionText,
    predefinedDescription: mapPriorityToDescription(input.actionText),
    priority: input.priority ?? "medium",
    dueOn: due,
    customerName: input.customerName,
    loanFileId: input.loanFileId,
    opportunityRef: input.opportunityRef,
    currentStage: input.currentStage,
    assigneeRef: input.assigneeRef,
    createdBy: input.createdBy ?? "chanakya",
  });
}
