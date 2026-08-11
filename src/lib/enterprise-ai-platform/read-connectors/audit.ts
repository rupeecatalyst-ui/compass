/**
 * Read audit trail — internal only (CO-AI-104).
 * Captures Behaviour Pack · Provider · Projection · Timestamp · Purpose.
 * Never customer-visible.
 */

import type { EaiReadAuditEvent, EaiReadConnectorId } from "@/types/enterprise-ai-read-connectors";
import type { EaiPersonaPackId } from "@/types/enterprise-ai-platform";
import type { EaiContextDomain } from "@/types/enterprise-ai-context-intelligence";

const events: EaiReadAuditEvent[] = [];
const MAX_EVENTS = 2000;

export function recordEaiReadAudit(input: {
  toolId?: string;
  connectorId: EaiReadConnectorId;
  providerId?: string;
  personaPackId: EaiPersonaPackId;
  sessionId: string;
  conversationId: string;
  domain: EaiContextDomain;
  projectionId: string;
  resolved: boolean;
  summary: string;
  purpose: string;
}): EaiReadAuditEvent {
  const event: EaiReadAuditEvent = {
    eventId: `eai_raud_${crypto.randomUUID()}`,
    recordedAt: new Date().toISOString(),
    toolId: input.toolId,
    connectorId: input.connectorId,
    providerId: input.providerId,
    personaPackId: input.personaPackId,
    sessionId: input.sessionId,
    conversationId: input.conversationId,
    domain: input.domain,
    projectionId: input.projectionId,
    resolved: input.resolved,
    summary: input.summary.slice(0, 400),
    purpose: input.purpose.slice(0, 240),
  };
  events.unshift(event);
  if (events.length > MAX_EVENTS) events.length = MAX_EVENTS;
  return event;
}

export function listEaiReadAuditEvents(limit = 100): EaiReadAuditEvent[] {
  return events.slice(0, limit);
}

export function listEaiReadAuditBySession(sessionId: string): EaiReadAuditEvent[] {
  return events.filter((e) => e.sessionId === sessionId);
}

export function resetEaiReadAudit(): void {
  events.length = 0;
}
