/**
 * EC360 relationship engine — configurable relationship types and first-class relationships.
 */

import { EC360_DEFAULT_RELATIONSHIP_TYPES } from "@/constants/enterprise-customer-360-engine";
import type {
  Ec360CustomerRelationship,
  Ec360RelationshipType,
} from "@/types/enterprise-customer-360-engine";
import { recordEc360Audit } from "./audit-integration";
import { getEc360Ports } from "./composition";
import { appendEc360TimelineEntry } from "./timeline-registry";
import { validateEc360Relationship } from "./validation-engine";

export function initializeEc360RelationshipTypes(createdBy = "system"): Ec360RelationshipType[] {
  const existing = getEc360Ports().relationshipTypes.list();
  if (existing.length > 0) return existing;

  return EC360_DEFAULT_RELATIONSHIP_TYPES.map((config) => {
    const type: Ec360RelationshipType = {
      id: crypto.randomUUID(),
      typeCode: config.typeCode,
      typeName: config.typeName,
      description: config.description,
      hierarchyImplied: config.hierarchyImplied,
      enabled: true,
      createdBy,
      createdOn: new Date().toISOString(),
    };
    getEc360Ports().relationshipTypes.save(type);
    return type;
  });
}

export function registerEc360Relationship(
  input: Omit<Ec360CustomerRelationship, "id" | "createdOn">,
): Ec360CustomerRelationship {
  const relationship: Ec360CustomerRelationship = {
    ...input,
    id: crypto.randomUUID(),
    createdOn: new Date().toISOString(),
  };

  const validation = validateEc360Relationship(relationship);
  if (!validation.valid) throw new Error(validation.issues.map((i) => i.message).join("; "));

  getEc360Ports().relationships.save(relationship);
  recordEc360Audit({
    entityId: relationship.id,
    entityType: "relationship",
    action: "created",
    actorId: input.createdBy,
    remarks: `Registered relationship ${relationship.relationshipTypeCode}`,
  });
  appendEc360TimelineEntry({
    customerId: relationship.sourceCustomerId,
    eventType: "relationship_added",
    title: "Relationship Added",
    description: `Added ${relationship.relationshipTypeCode} relationship`,
    actorId: input.createdBy,
    metadata: { targetCustomerId: relationship.targetCustomerId },
  });

  return relationship;
}

export function listEc360Relationships(customerId?: string): Ec360CustomerRelationship[] {
  if (!customerId) return getEc360Ports().relationships.list();
  return [
    ...getEc360Ports().relationships.listBySource(customerId),
    ...getEc360Ports().relationships.listByTarget(customerId),
  ];
}

export function listEc360RelationshipTypes(): Ec360RelationshipType[] {
  return getEc360Ports().relationshipTypes.list();
}
