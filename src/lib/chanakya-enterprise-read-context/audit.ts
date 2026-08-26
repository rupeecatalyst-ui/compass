/**
 * CO-CHANAKYA-ENTERPRISE-READ-CONTEXT-002 — Read audit (no PII / secrets / doc bodies).
 */

import type {
  ChanakyaEnterpriseReadAuditEvent,
  ChanakyaEnterpriseReadMode,
  ChanakyaEnterpriseReadDomain,
} from "@/types/chanakya-enterprise-read-context";

const events: ChanakyaEnterpriseReadAuditEvent[] = [];
const MAX_EVENTS = 2000;

export function recordChanakyaEnterpriseReadAudit(input: {
  actorUserId?: string | null;
  sessionId?: string | null;
  correlationId: string;
  mode: ChanakyaEnterpriseReadMode;
  domains: ChanakyaEnterpriseReadDomain[];
  entityScope?: string | null;
  organizationId: string;
  outcome: ChanakyaEnterpriseReadAuditEvent["outcome"];
  summary: string;
}): ChanakyaEnterpriseReadAuditEvent {
  const event: ChanakyaEnterpriseReadAuditEvent = {
    eventId: `cer_raud_${crypto.randomUUID()}`,
    recordedAt: new Date().toISOString(),
    actorUserId: input.actorUserId ?? null,
    sessionId: input.sessionId ?? null,
    correlationId: input.correlationId,
    mode: input.mode,
    domains: input.domains,
    entityScope: input.entityScope ?? null,
    organizationId: input.organizationId,
    outcome: input.outcome,
    summary: input.summary.slice(0, 400),
  };
  events.unshift(event);
  if (events.length > MAX_EVENTS) events.length = MAX_EVENTS;
  return event;
}

export function listChanakyaEnterpriseReadAudit(limit = 100): ChanakyaEnterpriseReadAuditEvent[] {
  return events.slice(0, limit);
}

export function resetChanakyaEnterpriseReadAuditForTests(): void {
  events.length = 0;
}
