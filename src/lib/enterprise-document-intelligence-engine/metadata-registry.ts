/**
 * EDIE metadata registry.
 */

import type { EdieDocumentMetadata } from "@/types/enterprise-document-intelligence-engine";
import { getEdiePorts } from "./composition";

export function registerEdieDocumentMetadata(
  input: Omit<EdieDocumentMetadata, "id" | "createdOn">,
): EdieDocumentMetadata {
  if (!getEdiePorts().documents.findById(input.documentId)) {
    throw new Error(`EDIE: document "${input.documentId}" not found.`);
  }

  const metadata: EdieDocumentMetadata = {
    ...input,
    id: crypto.randomUUID(),
    createdOn: new Date().toISOString(),
  };

  getEdiePorts().metadata.save(metadata);
  return metadata;
}

export function listEdieDocumentMetadata(documentId: string): EdieDocumentMetadata[] {
  return getEdiePorts().metadata.listByDocument(documentId);
}
