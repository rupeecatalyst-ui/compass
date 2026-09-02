/**
 * Document Workspace review status — derived from Enterprise Document Registry
 * + Document Request item state. Never invents a parallel document store.
 */

import { isUnclassifiedDocumentTypeRef } from "@/constants/document-intake";
import type { DocumentWorkspaceReviewStatus } from "@/constants/document-workspace";
import type { DocumentRegistryRecord } from "@/types/document-registry";
import type { DocumentRequestItemState } from "@/types/document-requests";

export function deriveDocumentWorkspaceReviewStatus(input: {
  record?: DocumentRegistryRecord | null;
  lodItem?: DocumentRequestItemState | null;
  nowMs?: number;
}): DocumentWorkspaceReviewStatus {
  const record = input.record;
  const lod = input.lodItem;
  const stamped = record?.reviewStatus;
  if (stamped) return stamped;

  if (lod?.status === "rejected" || lod?.status === "re_upload_required") {
    return lod.status === "re_upload_required" ? "replacement_requested" : "rejected";
  }
  if (record?.verifiedAt) return "accepted";
  if (lod?.status === "verified") return "accepted";
  if (lod?.status === "under_verification") return "under_review";

  const validity = record?.validityUntil?.trim();
  if (validity) {
    const t = new Date(validity).getTime();
    if (!Number.isNaN(t) && t < (input.nowMs ?? Date.now())) return "expired";
  }

  const hasFile = Boolean(record && record.versions.length > 0);
  if (hasFile) {
    if (record?.uploadSource === "email" || isUnclassifiedDocumentTypeRef(record?.typeRef)) {
      return "received";
    }
    if (lod?.status === "uploaded") return "received";
    return "under_review";
  }
  if (lod?.status === "requested") return "pending";
  return "pending";
}

export function documentWorkspaceReviewLabel(
  status: DocumentWorkspaceReviewStatus,
): string {
  if (status === "received") return "Received — Review Pending";
  if (status === "under_review") return "Under Review";
  if (status === "replacement_requested") return "Replacement requested";
  if (status === "accepted") return "Accepted";
  if (status === "rejected") return "Rejected";
  if (status === "expired") return "Expired";
  return "Pending";
}

export function countDocumentWorkspaceReviews(
  rows: Array<{ reviewStatus: DocumentWorkspaceReviewStatus }>,
): Record<DocumentWorkspaceReviewStatus, number> {
  const counts: Record<DocumentWorkspaceReviewStatus, number> = {
    pending: 0,
    received: 0,
    under_review: 0,
    accepted: 0,
    rejected: 0,
    expired: 0,
    replacement_requested: 0,
  };
  for (const row of rows) counts[row.reviewStatus] += 1;
  return counts;
}

export function isLenderEligibleDocumentVersion(input: {
  reviewStatus: DocumentWorkspaceReviewStatus;
}): boolean {
  return input.reviewStatus === "accepted";
}
