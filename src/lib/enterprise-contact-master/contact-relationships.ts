/**
 * Generic Contact Relationship model.
 * Reusable across roles/modules — Banker "Reporting Manager" is one consumer of type `reports_to`.
 * Future types (managed_by, assistant_to, legal_representative, refers_to) reuse the same store.
 */

import type {
  EcmContactRelationship,
  EcmContactRelationshipType,
  EcmContactRole,
} from "@/types/enterprise-contact-master";
import { getEcmPorts } from "./composition";
import { listEcmContacts } from "./contact-registry";

/** Relationship types supported by the platform (extensible without Contact model redesign). */
export const ECM_RELATIONSHIP_TYPES = {
  REPORTS_TO: "reports_to",
  MANAGED_BY: "managed_by",
  ASSISTANT_TO: "assistant_to",
  LEGAL_REPRESENTATIVE: "legal_representative",
  REFERS_TO: "refers_to",
} as const satisfies Record<string, EcmContactRelationshipType>;

export const ECM_RELATIONSHIP_TYPE_LABELS: Record<EcmContactRelationshipType, string> = {
  reports_to: "Reports To / Reporting Manager",
  managed_by: "Managed By",
  assistant_to: "Assistant To",
  legal_representative: "Legal Representative",
  refers_to: "Refers To",
};

export function listEcmContactRelationships(): EcmContactRelationship[] {
  return getEcmPorts().relationships.list().filter((r) => r.status === "active");
}

export function listEcmRelationshipsFrom(
  fromContactId: string,
  relationshipType?: EcmContactRelationshipType,
): EcmContactRelationship[] {
  return listEcmContactRelationships().filter(
    (r) =>
      r.fromContactId === fromContactId &&
      (!relationshipType || r.relationshipType === relationshipType),
  );
}

export function listEcmRelationshipsTo(
  toContactId: string,
  relationshipType?: EcmContactRelationshipType,
): EcmContactRelationship[] {
  return listEcmContactRelationships().filter(
    (r) =>
      r.toContactId === toContactId &&
      (!relationshipType || r.relationshipType === relationshipType),
  );
}

/** Active related contact for a single-valued relationship type (e.g. reports_to). */
export function getEcmRelatedContactId(
  fromContactId: string,
  relationshipType: EcmContactRelationshipType,
): string | undefined {
  return listEcmRelationshipsFrom(fromContactId, relationshipType)[0]?.toContactId;
}

/**
 * Upsert a directed relationship. For single-valued types (reports_to), replaces any prior active link.
 */
export function upsertEcmContactRelationship(input: {
  fromContactId: string;
  toContactId: string;
  relationshipType: EcmContactRelationshipType;
  contextRole?: EcmContactRole;
  meta?: Record<string, string>;
  actorId: string;
}): EcmContactRelationship {
  if (input.fromContactId === input.toContactId) {
    throw new Error("A contact cannot relate to itself.");
  }

  const ports = getEcmPorts();
  const now = new Date().toISOString();
  const existing = ports.relationships
    .list()
    .find(
      (r) =>
        r.fromContactId === input.fromContactId &&
        r.relationshipType === input.relationshipType &&
        r.status === "active",
    );

  // Single-valued: deactivate other active links of this type from the same contact
  for (const rel of ports.relationships.list()) {
    if (
      rel.fromContactId === input.fromContactId &&
      rel.relationshipType === input.relationshipType &&
      rel.status === "active" &&
      rel.toContactId !== input.toContactId
    ) {
      ports.relationships.save({
        ...rel,
        status: "inactive",
        modifiedBy: input.actorId,
        modifiedOn: now,
      });
    }
  }

  if (existing && existing.toContactId === input.toContactId) {
    const updated: EcmContactRelationship = {
      ...existing,
      contextRole: input.contextRole ?? existing.contextRole,
      meta: input.meta ?? existing.meta,
      modifiedBy: input.actorId,
      modifiedOn: now,
      status: "active",
    };
    ports.relationships.save(updated);
    return updated;
  }

  const created: EcmContactRelationship = {
    id: crypto.randomUUID(),
    fromContactId: input.fromContactId,
    toContactId: input.toContactId,
    relationshipType: input.relationshipType,
    contextRole: input.contextRole,
    meta: input.meta,
    status: "active",
    createdBy: input.actorId,
    createdOn: now,
    modifiedBy: input.actorId,
    modifiedOn: now,
  };
  ports.relationships.save(created);
  return created;
}

export function clearEcmContactRelationship(input: {
  fromContactId: string;
  relationshipType: EcmContactRelationshipType;
  actorId: string;
}): void {
  const now = new Date().toISOString();
  for (const rel of getEcmPorts().relationships.list()) {
    if (
      rel.fromContactId === input.fromContactId &&
      rel.relationshipType === input.relationshipType &&
      rel.status === "active"
    ) {
      getEcmPorts().relationships.save({
        ...rel,
        status: "inactive",
        modifiedBy: input.actorId,
        modifiedOn: now,
      });
    }
  }
}

/**
 * Walk a relationship chain upward (from → to → to…).
 * Missing intermediate nodes simply shorten the chain — never hardcodes levels.
 */
export function buildEcmRelationshipChain(
  startContactId: string,
  relationshipType: EcmContactRelationshipType,
  options?: { maxDepth?: number },
): Array<{ contactId: string; name: string; relatedToContactId?: string }> {
  const maxDepth = options?.maxDepth ?? 20;
  const byId = new Map(listEcmContacts().map((c) => [c.id, c]));
  const chain: Array<{ contactId: string; name: string; relatedToContactId?: string }> = [];
  const seen = new Set<string>();
  let currentId: string | undefined = startContactId;

  while (currentId && !seen.has(currentId) && chain.length < maxDepth) {
    seen.add(currentId);
    const contact = byId.get(currentId);
    if (!contact) break;
    const nextId = getEcmRelatedContactId(currentId, relationshipType);
    chain.push({
      contactId: contact.id,
      name: contact.name,
      relatedToContactId: nextId,
    });
    currentId = nextId;
  }

  return chain;
}
