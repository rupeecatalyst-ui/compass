/**
 * Unclassified Received Documents queue — inbound attachments that matched
 * uncertainly or arrived as unclassified typeRefs. Same Document Registry SSOT.
 */

import { isUnclassifiedDocumentTypeRef } from "@/constants/document-intake";
import type { DocumentRegistryRecord } from "@/types/document-registry";

export function listUnclassifiedReceivedDocuments(
  records: DocumentRegistryRecord[],
): DocumentRegistryRecord[] {
  return records.filter(
    (record) =>
      record.status === "active" &&
      !record.verifiedAt &&
      (isUnclassifiedDocumentTypeRef(record.typeRef) ||
        record.uploadSource === "email"),
  );
}

export function isDuplicateRegistryAttachment(
  records: DocumentRegistryRecord[],
  candidate: { originalFilename: string; fileSizeBytes: number; uploadedAt?: string },
): boolean {
  const name = candidate.originalFilename.trim().toLowerCase();
  return records.some(
    (record) =>
      record.status === "active" &&
      record.originalFilename.trim().toLowerCase() === name &&
      record.fileSizeBytes === candidate.fileSizeBytes,
  );
}
