/**
 * CO-BIZ-004 — Project customer-facing tasks from Document Requests + ETE allowlist.
 * Never creates a parallel task engine.
 */

import {
  ECE_CUSTOMER_VISIBLE_WORK_TYPES,
  inferCustomerTaskKind,
} from "@/constants/enterprise-customer-engagement";
import {
  listTasksForEntity,
  resolveWorkType,
  resolveTaskStatus,
} from "@/lib/enterprise-task-engine";
import type { DocumentRequestItemState } from "@/types/document-requests";
import type { EceCustomerTask } from "@/types/enterprise-customer-engagement";

function needsCustomerUpload(status: DocumentRequestItemState["status"]): boolean {
  return (
    status === "pending" ||
    status === "requested" ||
    status === "rejected" ||
    status === "re_upload_required"
  );
}

function fromLodItems(items: DocumentRequestItemState[]): EceCustomerTask[] {
  return items
    .filter((i) => needsCustomerUpload(i.status))
    .map((i) => {
      const replace =
        i.status === "rejected" || i.status === "re_upload_required";
      return {
        id: `doc:${i.typeRef}`,
        kind: inferCustomerTaskKind(i.label, replace ? "replace" : "upload"),
        title: replace ? `Replace ${i.label}` : `Upload ${i.label}`,
        description: replace
          ? i.remarks?.trim() ||
            "Your Relationship Manager requested a new version of this document."
          : i.mandatory
            ? "Required for your application to progress."
            : "Optional supporting document.",
        status: "open" as const,
        source: "document_requests" as const,
        documentTypeRef: i.typeRef,
      };
    });
}

function fromEte(opportunityId: string, opportunityReference: string): EceCustomerTask[] {
  const tasks = listTasksForEntity({ opportunityRef: opportunityId });
  const alsoByRef = opportunityReference
    ? listTasksForEntity({ opportunityRef: opportunityReference })
    : [];
  const seen = new Set<string>();
  const merged = [...tasks, ...alsoByRef].filter((t) => {
    if (seen.has(t.id)) return false;
    seen.add(t.id);
    return true;
  });

  return merged
    .filter((t) => {
      const wt = resolveWorkType(t);
      if (!ECE_CUSTOMER_VISIBLE_WORK_TYPES.includes(wt)) return false;
      // Customer Call / Lender Call already excluded; skip internal-sounding titles
      const title = (t.title || t.description || t.predefinedDescription || "").toLowerCase();
      if (title.includes("call customer") || title.includes("follow-up lender")) return false;
      if (title.includes("internal") || title.includes("manager")) return false;
      return resolveTaskStatus(t) === "open" && t.enabled !== false;
    })
    .map((t) => {
      const title = t.title || t.description || t.predefinedDescription || "Action required";
      return {
        id: `ete:${t.id}`,
        kind: inferCustomerTaskKind(title),
        title,
        description:
          t.description?.trim() ||
          "Please complete this action so your application can continue.",
        status: "open" as const,
        source: "ete" as const,
        workType: resolveWorkType(t),
        dueOn: t.dueOn,
        eteTaskId: t.id,
      };
    });
}

/**
 * Prefer LOD-derived actions (true customer work). Deduplicate ETE when title overlaps LOD.
 */
export function projectCustomerTasks(input: {
  opportunityId: string;
  opportunityReference: string;
  lodItems: DocumentRequestItemState[];
}): EceCustomerTask[] {
  const fromDocs = fromLodItems(input.lodItems);
  const docLabels = new Set(fromDocs.map((t) => t.title.toLowerCase()));
  const fromTasks = fromEte(input.opportunityId, input.opportunityReference).filter((t) => {
    const key = t.title.toLowerCase();
    for (const d of docLabels) {
      if (key.includes(d.replace(/^upload |^replace /i, "")) || d.includes(key)) return false;
    }
    return true;
  });
  return [...fromDocs, ...fromTasks];
}
