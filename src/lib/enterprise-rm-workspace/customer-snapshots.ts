/**
 * CO-BIZ-005 Phase 5 — Customer snapshots from ETE + Document Requests + Deal hints.
 */

import { ROUTES } from "@/constants/routes";
import { getDocumentRequestState } from "@/lib/document-requests";
import { buildMyWorkView, resolveWorkType } from "@/lib/enterprise-task-engine";
import type { RmCustomerSnapshot, RmTodayWork } from "@/types/enterprise-rm-workspace";

function formatWhen(iso?: string): string {
  if (!iso) return "No recent interaction";
  try {
    return new Date(iso).toLocaleString(undefined, {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export function projectRmCustomerSnapshots(input: {
  assigneeRef: string;
  today: RmTodayWork;
}): RmCustomerSnapshot[] {
  const view = buildMyWorkView(input.assigneeRef);
  const open = [...view.overdue, ...view.dueToday, ...view.upcoming];
  const byKey = new Map<string, typeof open>();

  for (const t of open) {
    const key =
      t.contactId ||
      t.opportunityRef ||
      t.dealId ||
      t.fileId ||
      t.borrowerName ||
      t.id;
    const list = byKey.get(key) ?? [];
    list.push(t);
    byKey.set(key, list);
  }

  const snapshots: RmCustomerSnapshot[] = [];
  for (const [key, tasks] of byKey) {
    const head = tasks[0];
    const opp = head.opportunityRef?.trim();
    let documentStatus = "No document list";
    let pendingDocs = 0;
    if (opp) {
      try {
        const state = getDocumentRequestState(opp);
        const pending = (state.lodItems ?? []).filter(
          (i) =>
            i.status === "pending" ||
            i.status === "requested" ||
            i.status === "rejected" ||
            i.status === "re_upload_required",
        );
        pendingDocs = pending.length;
        const total = state.lodItems?.length ?? 0;
        const verified = (state.lodItems ?? []).filter((i) => i.status === "verified").length;
        documentStatus =
          total === 0
            ? "Awaiting LOD"
            : `${verified}/${total} verified · ${pendingDocs} pending`;
      } catch {
        documentStatus = "Document status unavailable";
      }
    }

    const risks: string[] = [];
    if (tasks.some((t) => resolveWorkType(t) === "Document Collection" && pendingDocs > 0)) {
      risks.push("Document delay");
    }
    if (input.today.overdue.tasks.some((t) => tasks.includes(t))) {
      risks.push("Overdue work");
    }
    if (tasks.some((t) => resolveWorkType(t) === "Lender Call")) {
      risks.push("Lender follow-up");
    }

    const last = tasks
      .map((t) => t.modifiedOn || t.createdOn)
      .filter(Boolean)
      .sort()
      .at(-1);

    snapshots.push({
      id: `cust:${key}`,
      customerLabel: head.borrowerName || head.entityLabel || opp || "Assigned customer",
      opportunityRef: opp,
      dealId: head.dealId || head.fileId,
      currentStage: head.grossStage || "In progress",
      pendingActions: tasks.length,
      documentStatus,
      lastInteraction: formatWhen(last),
      riskIndicators: risks.length ? risks : ["Monitor"],
      href: opp ? ROUTES.MY_OPPORTUNITIES : ROUTES.MY_DEALS,
    });
  }

  return snapshots.sort((a, b) => b.pendingActions - a.pendingActions).slice(0, 12);
}
