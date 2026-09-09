/**
 * CO-C1-DOCUMENT-WORKSPACE-REFINEMENT-014D
 * Pending-document selection uses requirement IDs + pinned versions.
 * Received/accepted items cannot be requested again. Cross-transaction denied.
 */

import {
  DOCUMENT_WORKSPACE_REQUESTABLE_STATUSES,
  type DocumentWorkspaceRequestableStatus,
} from "@/constants/document-workspace-inbound";
import { getDocumentRequestRef } from "@/lib/document-requests/lod-versioning";
import { validateLockedDocumentSelection } from "@/lib/document-workspace/selection";
import type { DocumentRequestItemState } from "@/types/document-requests";
import type { DocumentWorkspaceReviewStatus } from "@/constants/document-workspace";

export type ChecklistSelectionItem = {
  requestRef: string;
  typeRef: string;
  label: string;
  ownerLabel: string;
  ownerRoleLabel: string;
  ownerKind: "applicant" | "co_applicant" | "company" | "shared";
  status: string;
  mandatory: boolean;
  opportunityId: string;
  dealId?: string | null;
  organizationId: string;
  lodVersionId?: string | null;
  programmeVersionRef?: string | null;
};

export function isRequestableChecklistStatus(
  status: string | null | undefined,
): status is DocumentWorkspaceRequestableStatus {
  return DOCUMENT_WORKSPACE_REQUESTABLE_STATUSES.includes(
    String(status || "") as DocumentWorkspaceRequestableStatus,
  );
}

export function mapReviewStatusToRequestable(status: DocumentWorkspaceReviewStatus): boolean {
  return isRequestableChecklistStatus(status);
}

export function ownerKindFromRole(roleLabel: string, ownerTypeLabel?: string | null): ChecklistSelectionItem["ownerKind"] {
  const role = roleLabel.toLowerCase();
  const type = (ownerTypeLabel || "").toLowerCase();
  if (type.includes("company") || role.includes("company") || role.includes("entity")) return "company";
  if (role.includes("co-applicant") || role.includes("co_applicant") || role.includes("co applicant")) {
    return "co_applicant";
  }
  if (role.includes("shared") || role.includes("property") || role.includes("security")) return "shared";
  return "applicant";
}

export function toChecklistSelectionItems(input: {
  items: DocumentRequestItemState[];
  organizationId: string;
  opportunityId: string;
  dealId?: string | null;
  lodVersionId?: string | null;
  programmeVersionRef?: string | null;
}): ChecklistSelectionItem[] {
  return input.items.map((item) => ({
    requestRef: getDocumentRequestRef(item),
    typeRef: item.typeRef,
    label: item.label,
    ownerLabel: item.ownerName?.trim() || "Shared Transaction",
    ownerRoleLabel: item.ownerRoleLabel?.trim() || item.ownerTypeLabel || "Owner",
    ownerKind: ownerKindFromRole(item.ownerRoleLabel || "", item.ownerTypeLabel),
    status: item.status,
    mandatory: item.mandatory,
    opportunityId: input.opportunityId,
    dealId: input.dealId ?? null,
    organizationId: input.organizationId,
    lodVersionId: input.lodVersionId ?? null,
    programmeVersionRef: input.programmeVersionRef ?? null,
  }));
}

export type ChecklistRevalidationResult =
  | { ok: true; items: ChecklistSelectionItem[] }
  | {
      ok: false;
      code: "EMPTY" | "CROSS_TRANSACTION" | "CROSS_ORGANIZATION" | "NOT_REQUESTABLE" | "STALE_SELECTION";
      rejectedRefs: string[];
    };

export function revalidateChecklistSelection(input: {
  organizationId: string;
  opportunityId: string;
  dealId?: string | null;
  lodVersionId?: string | null;
  selectedRefs: string[];
  canonicalItems: ChecklistSelectionItem[];
}): ChecklistRevalidationResult {
  const selected = [...new Set(input.selectedRefs.map((ref) => ref.trim()).filter(Boolean))];
  if (!selected.length) return { ok: false, code: "EMPTY", rejectedRefs: [] };

  const byRef = new Map(input.canonicalItems.map((item) => [item.requestRef, item]));
  const resolved: ChecklistSelectionItem[] = [];
  const stale: string[] = [];
  const notRequestable: string[] = [];

  for (const ref of selected) {
    const item = byRef.get(ref);
    if (!item) {
      stale.push(ref);
      continue;
    }
    if (input.lodVersionId && item.lodVersionId && item.lodVersionId !== input.lodVersionId) {
      stale.push(ref);
      continue;
    }
    if (!isRequestableChecklistStatus(item.status)) {
      notRequestable.push(ref);
      continue;
    }
    resolved.push(item);
  }

  if (stale.length) return { ok: false, code: "STALE_SELECTION", rejectedRefs: stale };
  if (notRequestable.length) {
    return { ok: false, code: "NOT_REQUESTABLE", rejectedRefs: notRequestable };
  }

  const lock = validateLockedDocumentSelection({
    organizationId: input.organizationId,
    opportunityId: input.opportunityId,
    dealId: input.dealId,
    selected: resolved.map((item) => ({
      id: item.requestRef,
      organizationId: item.organizationId,
      opportunityId: item.opportunityId,
      dealId: item.dealId,
    })),
  });
  if (!lock.ok) {
    return { ok: false, code: lock.code, rejectedRefs: selected };
  }
  return { ok: true, items: resolved };
}

export function overlayChecklistStatusFromReviews(
  items: ChecklistSelectionItem[],
  reviews: Array<{ requestRef: string; typeRef?: string; reviewStatus: string }>,
): ChecklistSelectionItem[] {
  const byRef = new Map(reviews.map((row) => [row.requestRef, row.reviewStatus]));
  const byType = new Map(
    reviews.filter((row) => row.typeRef).map((row) => [row.typeRef as string, row.reviewStatus]),
  );
  return items.map((item) => ({
    ...item,
    status: byRef.get(item.requestRef) || byType.get(item.typeRef) || item.status,
  }));
}
