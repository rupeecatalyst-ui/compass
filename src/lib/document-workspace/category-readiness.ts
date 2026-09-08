/**
 * CO-C1-DOCUMENT-WORKSPACE-CONTACT-CENTRIC-013
 * Category-level readiness from Document Registry + LOD rows.
 * Multiple files in one category do not inflate completion.
 */

import type { DocumentWorkspaceReviewStatus } from "@/constants/document-workspace";
import type { DocumentWorkspaceCardReadiness } from "@/types/document-workspace-card-grid";
import type { DocumentWorkspaceRow } from "@/lib/document-workspace/merge-rows";
import { inboundFileCountsTowardReadiness } from "@/lib/document-workspace/inbound-classification";

export type DocumentWorkspaceCategoryReadiness = {
  categoryKey: string;
  categoryLabel: string;
  typeRef: string;
  mandatory: boolean;
  status: DocumentWorkspaceReviewStatus;
  complete: boolean;
  pending: boolean;
  underReview: boolean;
  rejected: boolean;
  expired: boolean;
  fileCount: number;
  source: "lod" | "registry" | "custom";
};

function categoryKey(row: DocumentWorkspaceRow): string {
  return `${row.ownerTab}:${row.typeRef}:${row.lodItem?.participantId || ""}`;
}

function categoryStatus(rows: DocumentWorkspaceRow[]): DocumentWorkspaceReviewStatus {
  if (rows.some((row) => row.reviewStatus === "rejected")) return "rejected";
  if (rows.some((row) => row.reviewStatus === "expired")) return "expired";
  if (rows.some((row) => row.reviewStatus === "replacement_requested")) {
    return "replacement_requested";
  }
  if (rows.some((row) => row.reviewStatus === "accepted")) return "accepted";
  if (rows.some((row) => row.reviewStatus === "under_review")) return "under_review";
  if (rows.some((row) => row.reviewStatus === "received")) return "received";
  return "pending";
}

export function groupDocumentWorkspaceRowsByCategory(
  rows: DocumentWorkspaceRow[],
): Map<string, DocumentWorkspaceRow[]> {
  const grouped = new Map<string, DocumentWorkspaceRow[]>();
  for (const row of rows) {
    const key = categoryKey(row);
    const list = grouped.get(key) ?? [];
    list.push(row);
    grouped.set(key, list);
  }
  return grouped;
}

export function deriveDocumentWorkspaceCategoryReadiness(
  rows: DocumentWorkspaceRow[],
): DocumentWorkspaceCategoryReadiness[] {
  const grouped = groupDocumentWorkspaceRowsByCategory(rows);
  const out: DocumentWorkspaceCategoryReadiness[] = [];
  for (const [key, list] of grouped) {
    const lead = list[0]!;
    const status = categoryStatus(list);
    const fileCount = list.reduce((sum, row) => {
      if (row.record && !inboundFileCountsTowardReadiness(row.record)) return sum;
      return sum + (row.fileCount || 0);
    }, 0);
    const mandatory = Boolean(lead.lodItem?.mandatory);
    out.push({
      categoryKey: key,
      categoryLabel: lead.categoryLabel,
      typeRef: lead.typeRef,
      mandatory,
      status,
      complete: status === "accepted",
      pending: status === "pending",
      underReview: status === "under_review" || status === "received",
      rejected: status === "rejected" || status === "replacement_requested",
      expired: status === "expired",
      fileCount,
      source: lead.lodItem?.custom ? "custom" : lead.lodItem ? "lod" : "registry",
    });
  }
  return out;
}

export function summarizeDocumentWorkspaceCategoryReadiness(
  rows: DocumentWorkspaceRow[],
): DocumentWorkspaceCardReadiness {
  const categories = deriveDocumentWorkspaceCategoryReadiness(rows);
  if (!categories.length) return { available: false };
  const complete = categories.filter((item) => item.complete).length;
  const pending = categories.filter((item) => item.pending || (!item.complete && item.mandatory)).length;
  const rejected = categories.filter((item) => item.rejected).length;
  const expired = categories.filter((item) => item.expired).length;
  const underReview = categories.filter((item) => item.underReview).length;
  const receivedFiles = categories.reduce((sum, item) => sum + item.fileCount, 0);
  return {
    available: true,
    percent: Math.round((complete / categories.length) * 100),
    required: categories.length,
    received: receivedFiles,
    accepted: complete,
    pending,
    rejected,
    expired,
    reviewPending: underReview > 0,
    replacementOrRejection: rejected > 0,
  };
}
