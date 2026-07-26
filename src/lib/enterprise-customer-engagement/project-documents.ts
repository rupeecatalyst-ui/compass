/**
 * CO-BIZ-004 — Document Centre projection (Document Requests + Registry progress).
 */

import { deriveCustomerPortalProgress } from "@/lib/document-requests";
import type {
  DocumentRequestCommEvent,
  DocumentRequestItemState,
  DocumentRequestItemStatus,
} from "@/types/document-requests";
import type { EceDocumentCentre, EceDocumentItem } from "@/types/enterprise-customer-engagement";

function statusLabel(status: DocumentRequestItemStatus): string {
  switch (status) {
    case "pending":
    case "requested":
      return "Pending";
    case "uploaded":
      return "Uploaded";
    case "under_verification":
      return "Under Verification";
    case "verified":
      return "Accepted";
    case "rejected":
      return "Rejected";
    case "re_upload_required":
      return "Re-upload Required";
    default:
      return status;
  }
}

function canUpload(status: DocumentRequestItemStatus): boolean {
  return (
    status === "pending" ||
    status === "requested" ||
    status === "rejected" ||
    status === "re_upload_required"
  );
}

function canReplace(status: DocumentRequestItemStatus): boolean {
  return (
    status === "uploaded" ||
    status === "under_verification" ||
    status === "verified" ||
    status === "rejected" ||
    status === "re_upload_required"
  );
}

export function projectDocumentCentre(input: {
  lodItems: DocumentRequestItemState[];
  communications: DocumentRequestCommEvent[];
}): EceDocumentCentre {
  const items: EceDocumentItem[] = input.lodItems.map((i) => ({
    typeRef: i.typeRef,
    label: i.label,
    mandatory: i.mandatory,
    critical: i.critical,
    status: i.status,
    statusLabel: statusLabel(i.status),
    canUpload: canUpload(i.status),
    canReplace: canReplace(i.status),
    remarks: i.remarks,
    uploadedAt: i.uploadedAt,
    registryRecordId: i.registryRecordId,
  }));

  const uploadHistory = input.communications
    .filter((c) => c.kind === "customer_uploaded" || c.kind === "verification_completed")
    .slice()
    .sort((a, b) => b.at.localeCompare(a.at))
    .map((c) => ({
      at: c.at,
      label: c.kind === "customer_uploaded" ? "Document uploaded" : "Verification update",
      detail: c.detail,
    }));

  return {
    items,
    uploadHistory,
    progress: deriveCustomerPortalProgress(input.lodItems),
  };
}
