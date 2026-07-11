/**
 * EDIE storage registry — storage references only (no physical storage).
 */

import type { EdieStorageReference } from "@/types/enterprise-document-intelligence-engine";
import { recordEdieAudit } from "./audit-integration";
import { getEdiePorts } from "./composition";

export function registerEdieStorageReference(
  input: Omit<EdieStorageReference, "id" | "registeredOn">,
): EdieStorageReference {
  const document = getEdiePorts().documents.findById(input.documentId);
  if (!document) throw new Error(`EDIE: document "${input.documentId}" not found.`);

  const version = getEdiePorts().versions.findById(input.versionId);
  if (!version) throw new Error(`EDIE: version "${input.versionId}" not found.`);

  const reference: EdieStorageReference = {
    ...input,
    id: crypto.randomUUID(),
    registeredOn: new Date().toISOString(),
  };

  getEdiePorts().storageReferences.save(reference);

  getEdiePorts().versions.save({ ...version, storageRefId: reference.id });
  getEdiePorts().documents.save({
    ...document,
    modifiedOn: new Date().toISOString(),
  });

  recordEdieAudit({
    entityId: reference.id,
    entityType: "storage_reference",
    action: "created",
    actorId: "system",
    remarks: `Storage reference registered for ${input.objectKey}`,
  });

  return reference;
}

export function listEdieStorageReferences(documentId: string): EdieStorageReference[] {
  return getEdiePorts().storageReferences.listByDocument(documentId);
}
