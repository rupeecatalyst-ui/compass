/**
 * Document Center version history — bridges to CO-SPRINT-114 document registry.
 */

import { formatDocumentFileSize } from "@/constants/document-registry";
import { inferMimeHint, listDocumentsForLoanFile } from "@/lib/document-registry";
import type { DocumentRegistryRecord } from "@/types/document-registry";

export interface DocumentCenterVersion {
  id: string;
  typeRef: string;
  registryRecordId: string;
  version: number;
  uploadedBy: string;
  uploadedAt: string;
  fileName: string;
  fileSizeLabel: string;
  mimeHint: "pdf" | "image" | "office" | "unknown";
  isCurrent: boolean;
  previewKind: "pdf" | "image" | "office" | "unknown";
  mimeType: string;
  blobId: string;
}

export function registryRecordToVersions(record: DocumentRegistryRecord): DocumentCenterVersion[] {
  return record.versions.map((v) => {
    const mimeHint = inferMimeHint(v.mimeType, v.originalFilename);
    return {
      id: v.id,
      typeRef: record.typeRef,
      registryRecordId: record.id,
      version: v.version,
      uploadedBy: v.uploadedBy,
      uploadedAt: v.uploadedAt,
      fileName: v.displayName || v.originalFilename,
      fileSizeLabel: formatDocumentFileSize(v.fileSizeBytes),
      mimeHint,
      isCurrent: v.isCurrent,
      previewKind: mimeHint,
      mimeType: v.mimeType,
      blobId: v.blobId,
    };
  });
}

export function loadDocumentVersions(
  fileId: string,
): Record<string, DocumentCenterVersion[]> {
  if (typeof window === "undefined") return {};

  const map: Record<string, DocumentCenterVersion[]> = {};
  for (const record of listDocumentsForLoanFile(fileId)) {
    const list = registryRecordToVersions(record);
    const key = record.typeRef;
    const existing = map[key] ?? [];
    map[key] = [...existing, ...list].sort((a, b) => a.version - b.version);
  }
  return map;
}

export function reasonForDocument(item: {
  label: string;
  critical: boolean;
  mandatory: boolean;
  optional: boolean;
  criticalFromStage?: string;
  uploadMode?: string;
}): string {
  if (item.critical && item.criticalFromStage) {
    return `Required before ${item.criticalFromStage.replace(/_/g, " ")}.`;
  }
  if (item.critical) return "Critical for current workflow stage.";
  if (item.mandatory) return "Mandatory for document readiness and compliance.";
  if (item.optional) return "Optional — improves readiness but is not blocking.";
  if (item.uploadMode === "folder") return "Folder upload — add all related files here.";
  return `Required for ${item.label} completeness.`;
}
