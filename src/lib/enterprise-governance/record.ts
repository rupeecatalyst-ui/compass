/**
 * CO-GOV-001 — Record entity lifecycle + field-level audits.
 */

import { createCorrelationId } from "@/lib/ops/correlation";
import { toAuditScalar } from "@/lib/ops/redact";
import type {
  GovernanceEntityChangeEvent,
  GovernanceEntityType,
  GovernanceFieldAuditEvent,
  GovernanceLifecycleAction,
} from "@/types/enterprise-governance";
import { pushEntityChange, pushFieldAudit } from "./rings";

export type RecordEntityChangeInput = {
  entityType: GovernanceEntityType;
  entityId: string;
  action: GovernanceLifecycleAction;
  actorUserId?: string | null;
  summary?: string;
  previousValue?: unknown;
  newValue?: unknown;
  reason?: string | null;
  correlationId?: string;
};

export function recordEntityChange(
  input: RecordEntityChangeInput,
): GovernanceEntityChangeEvent {
  const correlationId = input.correlationId ?? createCorrelationId();
  const event: GovernanceEntityChangeEvent = {
    id: createCorrelationId(),
    at: new Date().toISOString(),
    entityType: input.entityType,
    entityId: input.entityId,
    action: input.action,
    actorUserId: input.actorUserId ?? null,
    summary:
      input.summary?.trim() ||
      `${input.entityType} ${input.action}`,
    previousValue: toAuditScalar(input.previousValue),
    newValue: toAuditScalar(input.newValue),
    correlationId,
    reason: input.reason ?? null,
  };
  pushEntityChange(event);
  return event;
}

export type RecordFieldAuditInput = {
  entityType: GovernanceEntityType;
  entityId: string;
  fieldName: string;
  oldValue?: unknown;
  newValue?: unknown;
  changedBy?: string | null;
  reason?: string | null;
  correlationId?: string;
};

export function recordFieldAudit(
  input: RecordFieldAuditInput,
): GovernanceFieldAuditEvent | null {
  const oldValue = toAuditScalar(input.oldValue);
  const newValue = toAuditScalar(input.newValue);
  if (oldValue === newValue) return null;

  const changedAt = new Date().toISOString();
  const correlationId = input.correlationId ?? createCorrelationId();
  const event: GovernanceFieldAuditEvent = {
    id: createCorrelationId(),
    at: changedAt,
    entityType: input.entityType,
    entityId: input.entityId,
    fieldName: input.fieldName,
    oldValue,
    newValue,
    changedBy: input.changedBy ?? null,
    changedAt,
    reason: input.reason ?? null,
    correlationId,
  };
  pushFieldAudit(event);
  recordEntityChange({
    entityType: input.entityType,
    entityId: input.entityId,
    action: "Updated",
    actorUserId: input.changedBy,
    summary: `Field changed: ${input.fieldName}`,
    previousValue: oldValue,
    newValue,
    reason: input.reason,
    correlationId,
  });
  return event;
}

/** Diff a whitelist of fields and record field audits. */
export function recordFieldAuditsFromDiff(input: {
  entityType: GovernanceEntityType;
  entityId: string;
  changedBy?: string | null;
  reason?: string | null;
  correlationId?: string;
  before: Record<string, unknown> | null | undefined;
  after: Record<string, unknown> | null | undefined;
  fields: readonly string[];
}): GovernanceFieldAuditEvent[] {
  const before = input.before ?? {};
  const after = input.after ?? {};
  const out: GovernanceFieldAuditEvent[] = [];
  for (const fieldName of input.fields) {
    if (!(fieldName in after) && !(fieldName in before)) continue;
    const recorded = recordFieldAudit({
      entityType: input.entityType,
      entityId: input.entityId,
      fieldName,
      oldValue: before[fieldName],
      newValue: after[fieldName],
      changedBy: input.changedBy,
      reason: input.reason,
      correlationId: input.correlationId,
    });
    if (recorded) out.push(recorded);
  }
  return out;
}
