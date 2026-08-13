/**
 * CO-MARKETING-MKT-01 — In-process audit boundary (foundation).
 * Aligns with org audit conventions later; no operational side effects.
 */

import type { MarketingAuditEvent, MarketingAuditEventKind } from "@/types/enterprise-marketing-engine";

const buffer: MarketingAuditEvent[] = [];
const MAX = 200;

export function recordMarketingAuditEvent(input: {
  kind: MarketingAuditEventKind;
  organizationId?: string | null;
  actorUserId?: string | null;
  detail?: Record<string, unknown>;
}): MarketingAuditEvent {
  const event: MarketingAuditEvent = {
    id: `mkt-audit-${Date.now()}-${buffer.length}`,
    kind: input.kind,
    organizationId: input.organizationId ?? null,
    actorUserId: input.actorUserId ?? null,
    at: new Date().toISOString(),
    detail: input.detail,
  };
  buffer.push(event);
  if (buffer.length > MAX) buffer.shift();
  return event;
}

export function listRecentMarketingAuditEvents(limit = 20): MarketingAuditEvent[] {
  return buffer.slice(-limit).reverse();
}
