/**
 * CO-MARKETING-REDESIGN-019 — Durable Marketing audit boundary.
 * Records organisation, actor, action, object, campaign/version, previous/resulting
 * state, timestamp, reason, and correlation ID. Never stores secrets or full bodies.
 */

import type { MarketingAuditEvent, MarketingAuditEventKind } from "@/types/enterprise-marketing-engine";
import { getConfiguredMarketingDurabilityPorts } from "@/lib/enterprise-marketing-engine/durability";
import { createMarketingScopedId } from "@/lib/enterprise-marketing-engine/scoped-id";

const buffer: MarketingAuditEvent[] = [];
const MAX = 200;

const REDACT_KEY =
  /secret|password|apiKey|apikey|token|authorization|credential|smtp|html|body|content|messageBody|plainText/i;

function redactMarketingAuditValue(value: unknown, key?: string): unknown {
  if (key && REDACT_KEY.test(key)) return "[redacted]";
  if (value == null) return value;
  if (Array.isArray(value)) return value.map((item) => redactMarketingAuditValue(item));
  if (typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [nextKey, nextValue] of Object.entries(value as Record<string, unknown>)) {
      out[nextKey] = redactMarketingAuditValue(nextValue, nextKey);
    }
    return out;
  }
  return value;
}

export function redactMarketingAuditDetail(detail: Record<string, unknown>): Record<string, unknown> {
  return redactMarketingAuditValue(detail) as Record<string, unknown>;
}

export type MarketingDurableAuditInput = {
  kind: MarketingAuditEventKind;
  organizationId?: string | null;
  actorUserId?: string | null;
  action?: string;
  objectType?: string;
  objectId?: string;
  campaignId?: string | null;
  versionId?: string | null;
  previousState?: string | null;
  resultingState?: string | null;
  reason?: string | null;
  correlationId?: string | null;
  detail?: Record<string, unknown>;
};

export function recordMarketingAuditEvent(input: MarketingDurableAuditInput): MarketingAuditEvent {
  const organizationId = input.organizationId ?? null;
  const campaignId =
    input.campaignId ??
    (typeof input.detail?.campaignId === "string" ? input.detail.campaignId : null);
  const correlationId =
    input.correlationId ??
    createMarketingScopedId("mkt-corr", organizationId || "org", null);
  const timestamp = new Date().toISOString();
  const scopedDetail = redactMarketingAuditDetail({
    organization: organizationId,
    actor: input.actorUserId ?? null,
    action: input.action ?? input.kind,
    objectType: input.objectType ?? "marketing",
    objectId: input.objectId ?? campaignId,
    campaignId,
    versionId: input.versionId ?? null,
    previousState: input.previousState ?? null,
    resultingState: input.resultingState ?? null,
    timestamp,
    reason: input.reason ?? null,
    correlationId,
    ...(input.detail ?? {}),
  });
  const event: MarketingAuditEvent = {
    id: createMarketingScopedId("mkt-audit", organizationId || "org", null),
    kind: input.kind,
    organizationId,
    actorUserId: input.actorUserId ?? null,
    at: timestamp,
    detail: scopedDetail,
  };
  buffer.push(event);
  if (buffer.length > MAX) buffer.shift();
  const ports = getConfiguredMarketingDurabilityPorts();
  if (ports && organizationId) {
    void ports.audit.append({
      id: event.id,
      organizationId,
      campaignId,
      actorUserId: event.actorUserId ?? null,
      kind: event.kind,
      createdAt: event.at,
      detailJson: scopedDetail,
    });
  }
  return event;
}

export function listRecentMarketingAuditEvents(limit = 20): MarketingAuditEvent[] {
  return buffer.slice(-limit).reverse();
}

export function listMarketingAuditEventsForOrganization(
  organizationId: string,
  limit = 50,
): MarketingAuditEvent[] {
  return buffer
    .filter((event) => event.organizationId === organizationId)
    .slice(-limit)
    .reverse();
}

export function resetMarketingAuditEventsForTests(): void {
  buffer.length = 0;
}
