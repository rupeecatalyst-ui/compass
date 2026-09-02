/**
 * Merge Document Registry records + Document Request LOD items into
 * one Document Workspace table row per requirement / received file.
 * Same registry ids — never copied binaries.
 */

import type { DocumentWorkspaceOwnerTabId } from "@/constants/document-workspace";
import type { DocumentWorkspaceReviewStatus } from "@/constants/document-workspace";
import { deriveDocumentWorkspaceReviewStatus } from "@/lib/document-workspace/review-status";
import { resolveDocumentWorkspaceOwnerTab } from "@/lib/document-workspace/owner-tabs";
import { getDocumentRequestRef } from "@/lib/document-requests/lod-versioning";
import type { DocumentRegistryRecord } from "@/types/document-registry";
import type { DocumentRequestItemState } from "@/types/document-requests";
import type { LoanParticipant } from "@/types/loan-participant";

export type DocumentWorkspaceRow = {
  id: string;
  requestRef?: string;
  registryRecordId?: string;
  record?: DocumentRegistryRecord;
  lodItem?: DocumentRequestItemState;
  typeRef: string;
  categoryLabel: string;
  typeLabel: string;
  ownerTab: DocumentWorkspaceOwnerTabId;
  ownerLabel: string;
  reviewStatus: DocumentWorkspaceReviewStatus;
  fileCount: number;
  requestedOn?: string;
  receivedOn?: string;
  validityUntil?: string;
  reviewer?: string;
  remarks?: string;
};

export function mergeDocumentWorkspaceRows(input: {
  records: DocumentRegistryRecord[];
  lodItems: DocumentRequestItemState[];
  participants: LoanParticipant[];
  nowMs?: number;
}): DocumentWorkspaceRow[] {
  const usedRecordIds = new Set<string>();
  const rows: DocumentWorkspaceRow[] = [];

  for (const lodItem of input.lodItems) {
    const linked =
      (lodItem.registryRecordId
        ? input.records.find((r) => r.id === lodItem.registryRecordId)
        : undefined) ??
      input.records.find(
        (r) =>
          r.status === "active" &&
          r.typeRef === lodItem.typeRef &&
          (!lodItem.participantId || r.links.participantId === lodItem.participantId),
      );
    if (linked) usedRecordIds.add(linked.id);
    const owner = resolveDocumentWorkspaceOwnerTab({
      record: linked,
      lodItem,
      participants: input.participants,
    });
    const reviewStatus = deriveDocumentWorkspaceReviewStatus({
      record: linked,
      lodItem,
      nowMs: input.nowMs,
    });
    rows.push({
      id: getDocumentRequestRef(lodItem) || `lod:${lodItem.typeRef}`,
      requestRef: getDocumentRequestRef(lodItem),
      registryRecordId: linked?.id,
      record: linked,
      lodItem,
      typeRef: lodItem.typeRef,
      categoryLabel: lodItem.moduleLabel || linked?.categoryLabel || "Requirement",
      typeLabel: lodItem.label,
      ownerTab: owner.tab,
      ownerLabel: owner.ownerLabel,
      reviewStatus,
      fileCount: linked?.versions.length ?? 0,
      requestedOn: lodItem.requestedOn,
      receivedOn: lodItem.uploadedAt || linked?.uploadedAt,
      validityUntil: linked?.validityUntil,
      reviewer: linked?.verifiedBy,
      remarks: lodItem.remarks || linked?.reviewRemarks,
    });
  }

  for (const record of input.records) {
    if (record.status === "deleted" || usedRecordIds.has(record.id)) continue;
    const owner = resolveDocumentWorkspaceOwnerTab({
      record,
      participants: input.participants,
    });
    const reviewStatus = deriveDocumentWorkspaceReviewStatus({
      record,
      nowMs: input.nowMs,
    });
    const current = record.versions.find((v) => v.isCurrent) ?? record.versions[0];
    rows.push({
      id: `reg:${record.id}`,
      registryRecordId: record.id,
      record,
      typeRef: record.typeRef,
      categoryLabel: record.categoryLabel,
      typeLabel: current?.displayName || record.displayName,
      ownerTab: owner.tab,
      ownerLabel: owner.ownerLabel,
      reviewStatus,
      fileCount: record.versions.length,
      receivedOn: record.uploadedAt,
      validityUntil: record.validityUntil,
      reviewer: record.verifiedBy,
      remarks: record.reviewRemarks,
    });
  }

  return rows;
}
