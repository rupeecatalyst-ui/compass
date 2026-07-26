/**
 * CO-BIZ-004 — Customer notifications projected from documents + timeline + stage.
 */

import type { DocumentRequestItemState } from "@/types/document-requests";
import type {
  EceCustomerTask,
  EceNotification,
  EceTimelineEvent,
} from "@/types/enterprise-customer-engagement";

export function projectCustomerNotifications(input: {
  lodItems: DocumentRequestItemState[];
  tasks: EceCustomerTask[];
  timeline: EceTimelineEvent[];
  currentStage: string;
}): EceNotification[] {
  const out: EceNotification[] = [];

  for (const item of input.lodItems) {
    if (item.status === "verified") {
      out.push({
        id: `notif:accepted:${item.typeRef}`,
        kind: "document_accepted",
        title: "Document accepted",
        body: `${item.label} has been verified.`,
        at: item.uploadedAt || new Date().toISOString(),
        readHint: false,
      });
    }
    if (item.status === "rejected" || item.status === "re_upload_required") {
      out.push({
        id: `notif:rejected:${item.typeRef}`,
        kind: "document_rejected",
        title: "Document needs attention",
        body: item.remarks?.trim() || `${item.label} was rejected — please re-upload.`,
        at: item.uploadedAt || new Date().toISOString(),
        readHint: false,
      });
    }
  }

  const openTasks = input.tasks.filter((t) => t.status === "open");
  if (openTasks.length > 0) {
    out.push({
      id: "notif:action_required",
      kind: "action_required",
      title: "New action required",
      body:
        openTasks.length === 1
          ? openTasks[0].title
          : `${openTasks.length} actions are waiting for you.`,
      at: new Date().toISOString(),
      readHint: false,
    });
  }

  const stage = input.currentStage.toLowerCase();
  if (stage.includes("approv") || stage.includes("sanction")) {
    out.push({
      id: "notif:loan_approved",
      kind: "loan_approved",
      title: "Loan approved",
      body: "Your application has reached an approval milestone.",
      at: new Date().toISOString(),
      readHint: false,
    });
  }
  if (stage.includes("disburs")) {
    out.push({
      id: "notif:disbursed",
      kind: "disbursement_completed",
      title: "Disbursement completed",
      body: "Funds have been disbursed for your loan.",
      at: new Date().toISOString(),
      readHint: false,
    });
  }

  for (const ev of input.timeline.slice(0, 8)) {
    if (ev.category === "milestone" || ev.category === "approval") {
      out.push({
        id: `notif:tl:${ev.id}`,
        kind: "stage_progressed",
        title: ev.title,
        body: ev.description || "Your application stage progressed.",
        at: ev.at,
        readHint: true,
      });
    }
  }

  const seen = new Set<string>();
  return out
    .filter((n) => {
      if (seen.has(n.id)) return false;
      seen.add(n.id);
      return true;
    })
    .sort((a, b) => b.at.localeCompare(a.at));
}
