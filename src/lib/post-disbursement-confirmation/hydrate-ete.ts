/**
 * Project durable PDC owner tasks into the in-memory ETE registry for Tasks UI.
 */
import { getEtePorts } from "@/lib/enterprise-task-engine/composition";
import type { EteTask } from "@/types/enterprise-task-engine";
import {
  postDisbursementApiClient,
  type OwnerConfirmationTaskDto,
} from "@/lib/post-disbursement-confirmation/client";
import { PDC_LENDER_CONFIRMATION_TASK } from "@/constants/post-disbursement-confirmation";

function toEteTask(row: OwnerConfirmationTaskDto): EteTask {
  const now = row.createdAt || new Date().toISOString();
  return {
    id: row.id,
    enabled: true,
    taskType: "opportunity",
    category: "workflow",
    assigneeRef: row.assigneeUserId || "unassigned",
    coOwnerRefs: [],
    opportunityRef: row.opportunityId ?? undefined,
    dealId: row.dealId,
    entityKind: "EnterpriseDeal",
    entityId: row.dealId,
    entityLabel: row.dealNumber,
    predefinedDescription: "Follow-up Lender",
    workType: "Lender Call",
    title: row.title || PDC_LENDER_CONFIRMATION_TASK.title,
    description:
      row.requiredAction || PDC_LENDER_CONFIRMATION_TASK.requiredAction,
    priority: "high",
    dueOn: row.dueAt || now,
    status: "open",
    systemGenerated: true,
    autoRuleId: row.autoRuleId || PDC_LENDER_CONFIRMATION_TASK.autoRuleId,
    borrowerName: row.customerName ?? undefined,
    loanProduct: row.productLabel ?? undefined,
    lenderName: row.lenderName ?? undefined,
    grossStage: "Disbursement",
    assignedByRef: "system:post-disbursement-cron",
    createdBy: "system:post-disbursement-cron",
    createdOn: now,
    modifiedBy: "system:post-disbursement-cron",
    modifiedOn: now,
    escalated: false,
    colourStatus: "orange",
    chanakyaMonitoring: true,
  };
}

/** Best-effort hydrate — never blocks Tasks workspace. */
export async function hydratePostDisbursementOwnerTasksIntoEte(): Promise<number> {
  try {
    const items = await postDisbursementApiClient.listMyOpenConfirmationTasks();
    const ports = getEtePorts();
    let count = 0;
    for (const item of items) {
      const existing = ports.tasks.findById(item.id);
      if (existing?.status === "completed") continue;
      ports.tasks.save(toEteTask(item));
      count += 1;
    }
    return count;
  } catch {
    return 0;
  }
}
