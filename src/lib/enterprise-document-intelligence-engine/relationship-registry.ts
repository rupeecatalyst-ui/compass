/**
 * EDIE relationship registry — first-class document relationships.
 */

import type { EdieDocumentRelationship } from "@/types/enterprise-document-intelligence-engine";
import { recordEdieAudit } from "./audit-integration";
import { getEdiePorts } from "./composition";
import { appendEdieTimelineEntry } from "./timeline-registry";
import { validateEdieDocumentRelationship } from "./validation-engine";

export function registerEdieDocumentRelationship(
  input: Omit<EdieDocumentRelationship, "id" | "createdOn">,
): EdieDocumentRelationship {
  const relationship: EdieDocumentRelationship = {
    ...input,
    id: crypto.randomUUID(),
    createdOn: new Date().toISOString(),
  };

  const validation = validateEdieDocumentRelationship(relationship);
  if (!validation.valid) throw new Error(validation.issues.map((i) => i.message).join("; "));

  getEdiePorts().relationships.save(relationship);
  recordEdieAudit({
    entityId: relationship.id,
    entityType: "relationship",
    action: "created",
    actorId: input.createdBy,
    remarks: `Registered relationship ${relationship.relationshipType}`,
  });
  appendEdieTimelineEntry({
    documentId: relationship.sourceDocumentId,
    eventType: "relationship_added",
    title: "Relationship Added",
    description: `${relationship.relationshipType} → ${relationship.targetDocumentId}`,
    actorId: input.createdBy,
  });

  return relationship;
}

export function listEdieDocumentRelationships(documentId?: string): EdieDocumentRelationship[] {
  if (!documentId) return getEdiePorts().relationships.list();
  return [
    ...getEdiePorts().relationships.listBySource(documentId),
    ...getEdiePorts().relationships.listByTarget(documentId),
  ];
}
