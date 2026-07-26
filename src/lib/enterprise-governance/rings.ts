/**
 * CO-GOV-001 — In-process governance rings (entity history + field audit).
 * Process-local; durable Prisma EDL/timeline remains complementary.
 */

import type {
  GovernanceEntityChangeEvent,
  GovernanceFieldAuditEvent,
} from "@/types/enterprise-governance";

const MAX = 800;

const entityChanges: GovernanceEntityChangeEvent[] = [];
const fieldAudits: GovernanceFieldAuditEvent[] = [];

function pushFront<T>(buf: T[], item: T, max = MAX): void {
  buf.unshift(item);
  if (buf.length > max) buf.length = max;
}

export function pushEntityChange(event: GovernanceEntityChangeEvent): void {
  pushFront(entityChanges, event);
}

export function pushFieldAudit(event: GovernanceFieldAuditEvent): void {
  pushFront(fieldAudits, event);
}

export function listEntityChanges(limit = 100): GovernanceEntityChangeEvent[] {
  return entityChanges.slice(0, Math.max(1, Math.min(limit, MAX)));
}

export function listFieldAudits(limit = 100): GovernanceFieldAuditEvent[] {
  return fieldAudits.slice(0, Math.max(1, Math.min(limit, MAX)));
}

export function listEntityChangesFor(
  entityType: string,
  entityId: string,
  limit = 100,
): GovernanceEntityChangeEvent[] {
  return entityChanges
    .filter((e) => e.entityType === entityType && e.entityId === entityId)
    .slice(0, limit);
}

export function listFieldAuditsFor(
  entityType: string,
  entityId: string,
  limit = 100,
): GovernanceFieldAuditEvent[] {
  return fieldAudits
    .filter((e) => e.entityType === entityType && e.entityId === entityId)
    .slice(0, limit);
}
